import * as THREE from 'three';
import { isBlocked } from './world.js';
import { createDummySoldier } from './soldier.js';

export class BotSystem {
  constructor(scene, player, teamSize, difficulty, bloodSystem, ragdollSystem, onPlayerHit, onKill = () => {}) {
    this.scene = scene;
    this.player = player;
    this.teamSize = teamSize;
    this.difficulty = difficulty;
    this.blood = bloodSystem;
    this.ragdolls = ragdollSystem;
    this.onPlayerHit = onPlayerHit;
    this.onKill = onKill;
    this.bots = [];
    this.spawn();
  }

  findSpawn(team) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = (Math.random() - .5) * 76;
      const z = team === 1 ? 38 + Math.random() * 30 : -38 - Math.random() * 30;
      if (!isBlocked(x, z, .55)) return { x, z };
    }
    return { x: team === 1 ? -10 : 10, z: team === 1 ? 55 : -55 };
  }

  spawn() {
    for (const team of [1, 2]) {
      const count = team === 1 ? this.teamSize - 1 : this.teamSize;
      for (let i = 0; i < count; i++) {
        const soldier = createDummySoldier(team);
        const group = soldier.root;

        const spawn = this.findSpawn(team);
        group.position.set(spawn.x, 0, spawn.z);

        const bot = {
          soldier,
          group,
          team,
          hp: 100,
          target: null,
          alive: true,
          nextFire: performance.now() + Math.random() * 1200,
          nextThink: 0,
          speed: 2.8 + Math.random() * 1.0,
          aim: .72 + Math.random() * .2,
          currentSpeed: 0,
          pitch: 0
        };

        // Attach bot metadata to all hit-zone meshes
        group.traverse((child) => {
          if (child.userData?.hitZone) {
            child.userData.bot = bot;
          }
        });

        this.bots.push(bot);
        this.scene.add(group);
      }
    }
  }

  lineClear(a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const distance = Math.hypot(dx, dz);
    const steps = Math.ceil(distance / 2.2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (isBlocked(a.x + dx * t, a.z + dz * t, .05)) return false;
    }
    return true;
  }

  chooseTarget(bot, now) {
    if (now < bot.nextThink) return;
    bot.nextThink = now + 350 + Math.random() * 220;
    const enemies = this.bots.filter((other) => other.alive && other.team !== bot.team);
    let best = null;
    let bestDistance = 58;

    for (const enemy of enemies) {
      const p = enemy.group.position;
      const d = Math.hypot(p.x - bot.group.position.x, p.z - bot.group.position.z);
      if (d < bestDistance) {
        bestDistance = d;
        best = { type: 'bot', bot: enemy, position: p };
      }
    }

    if (bot.team === 2) {
      const p = this.player.position;
      const d = Math.hypot(p.x - bot.group.position.x, p.z - bot.group.position.z);
      if (d < bestDistance * 1.1 && d < 52) {
        best = { type: 'player', position: p };
      }
    }
    bot.target = best;
  }

  update(dt, now) {
    for (const bot of this.bots) {
      if (!bot.alive) continue;

      this.chooseTarget(bot, now);
      let target = bot.target;

      if (!target) {
        const rallyZ = bot.team === 1 ? -22 : 22;
        const dx = -bot.group.position.x;
        const dz = rallyZ - bot.group.position.z;
        const moving = this.moveBot(bot, dx, dz, dt, 3.2);
        bot.soldier.update(dt, moving ? 3.2 : 0, false, 0);
        continue;
      }

      const p = bot.group.position;
      const t = target.position;
      const dx = t.x - p.x;
      const dy = (target.type === 'player' ? (this.player.crouched ? 1.2 : 1.7) : 1.6) - 1.5;
      const dz = t.z - p.z;
      const distance = Math.hypot(dx, dz);

      // Rotate whole body facing towards enemy
      bot.group.rotation.y = Math.atan2(-dx, -dz);
      bot.pitch = THREE.MathUtils.clamp(-Math.atan2(dy, distance), -0.6, 0.6);

      let isMoving = false;
      if (distance > 13) {
        isMoving = this.moveBot(bot, dx, dz, dt, bot.speed);
      }

      // Firing logic
      let isFiring = false;
      if (distance < 44 && now > bot.nextFire && this.lineClear(p, t)) {
        bot.nextFire = now + (900 / this.difficulty) + Math.random() * 650;
        bot.soldier.triggerRecoil();
        isFiring = true;

        const chance = bot.aim * this.difficulty * (distance < 16 ? .44 : .22);
        if (Math.random() < chance) {
          if (target.type === 'player') {
            this.onPlayerHit(6 + Math.random() * 8);
          } else {
            const hitDir = new THREE.Vector3(dx, dy, dz).normalize();
            const hitPt = target.bot.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            this.damageBot(target.bot, 12 + Math.random() * 12, hitDir, hitPt, false);
          }
        }
      }

      // Procedural limb animation update
      bot.soldier.update(dt, isMoving ? bot.speed : 0, isFiring, bot.pitch);
    }
  }

  moveBot(bot, dx, dz, dt, speed) {
    const distance = Math.hypot(dx, dz);
    if (distance < .01) return false;
    const p = bot.group.position;
    const nx = p.x + dx / distance * speed * dt;
    const nz = p.z + dz / distance * speed * dt;
    let moved = false;
    if (!isBlocked(nx, p.z, .38)) { p.x = nx; moved = true; }
    if (!isBlocked(p.x, nz, .38)) { p.z = nz; moved = true; }
    return moved;
  }

  damageBot(bot, damage, impulseDir, hitPoint, isHeadshot = false) {
    if (!bot?.alive) return false;

    bot.hp -= damage;
    bot.soldier.triggerFlinch();

    // Spawn 3D directional blood spray
    if (this.blood && hitPoint && impulseDir) {
      this.blood.spray(hitPoint, impulseDir, isHeadshot ? 24 : 12, isHeadshot);
    }

    if (bot.hp <= 0) {
      bot.alive = false;
      bot.hp = 0;

      // Transform soldier into dynamic ragdoll with impact momentum
      if (this.ragdolls) {
        const force = impulseDir ? impulseDir.clone().multiplyScalar(Math.min(7.5, damage * 0.16)) : new THREE.Vector3(0, 1, 0);
        this.ragdolls.spawn(bot.soldier, force, isHeadshot);
      } else {
        bot.group.visible = false;
      }

      this.onKill(bot);
    }
    return true;
  }

  hit(object, damage, dir, hitPoint) {
    let node = object;
    while (node && !node.userData?.bot) node = node.parent;
    const bot = node?.userData?.bot;
    if (!bot || !bot.alive || bot.team !== 2) return { hit: false };

    const headshot = object.userData?.hitZone === 'head';
    const effectiveDamage = damage * (headshot ? 2.5 : 1.0);

    const pt = hitPoint || bot.group.position.clone().add(new THREE.Vector3(0, headshot ? 1.8 : 1.2, 0));
    const impulse = dir || new THREE.Vector3(0, 0, -1);

    this.damageBot(bot, effectiveDamage, impulse, pt, headshot);
    return { hit: true, headshot, killed: !bot.alive };
  }

  damageRadius(position, radius, damage) {
    if (this.blood) {
      this.blood.burst(position, 28);
    }

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const p = bot.group.position;
      const d = Math.hypot(p.x - position.x, p.z - position.z);
      if (d < radius) {
        const falloff = 1 - d / radius;
        const blastDir = new THREE.Vector3(p.x - position.x, 1.2, p.z - position.z).normalize();
        const hitPt = p.clone().add(new THREE.Vector3(0, 1.1, 0));
        this.damageBot(bot, damage * falloff, blastDir.multiplyScalar(falloff * 6.5), hitPt, false);
      }
    }
  }

  getTargetMeshes() {
    const list = [];
    for (const b of this.bots) {
      if (b.alive && b.team === 2) {
        b.group.traverse((child) => {
          if (child.userData?.hitZone) list.push(child);
        });
      }
    }
    return list;
  }

  getAlive(team) {
    return this.bots.filter((b) => b.alive && b.team === team).length;
  }
}
