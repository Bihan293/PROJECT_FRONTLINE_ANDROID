import * as THREE from 'three';
import { isBlocked } from './world.js';

const teamMaterial = (team) => new THREE.MeshStandardMaterial({
  color: team === 1 ? 0x456c88 : 0x874338,
  roughness: 0.92
});

export class BotSystem {
  constructor(scene, player, teamSize, difficulty, onPlayerHit, onKill = () => {}) {
    this.scene = scene;
    this.player = player;
    this.teamSize = teamSize;
    this.difficulty = difficulty;
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
    const torsoGeometry = new THREE.CapsuleGeometry(.34, .72, 3, 7);
    const headGeometry = new THREE.SphereGeometry(.22, 8, 7);
    const weaponGeometry = new THREE.BoxGeometry(.12, .12, .82);
    const helmetGeometry = new THREE.SphereGeometry(.235, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xb79a7d, roughness: 1 });
    const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x242a27, metalness: .5, roughness: .55 });
    const helmetBlue = new THREE.MeshStandardMaterial({ color: 0x344d60, roughness: .9 });
    const helmetRed = new THREE.MeshStandardMaterial({ color: 0x58332f, roughness: .9 });

    for (const team of [1, 2]) {
      const count = team === 1 ? this.teamSize - 1 : this.teamSize;
      for (let i = 0; i < count; i++) {
        const group = new THREE.Group();
        const torso = new THREE.Mesh(torsoGeometry, teamMaterial(team));
        torso.position.y = 1.12;
        torso.castShadow = false;
        torso.userData.hitZone = 'body';
        group.add(torso);

        const head = new THREE.Mesh(headGeometry, faceMaterial);
        head.position.y = 1.78;
        head.userData.hitZone = 'head';
        group.add(head);

        const helmet = new THREE.Mesh(helmetGeometry, team === 1 ? helmetBlue : helmetRed);
        helmet.position.y = 1.91;
        group.add(helmet);

        const gun = new THREE.Mesh(weaponGeometry, weaponMaterial);
        gun.position.set(.29, 1.28, -.28);
        group.add(gun);

        const spawn = this.findSpawn(team);
        group.position.set(spawn.x, 0, spawn.z);
        group.userData.bot = null;
        const bot = {
          group, team, hp: 100, target: null, alive: true,
          nextFire: performance.now() + Math.random() * 1200,
          nextThink: 0, speed: 2.8 + Math.random() * 1.0,
          aim: .72 + Math.random() * .2
        };
        group.userData.bot = bot;
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
      if (d < bestDistance) { bestDistance = d; best = { type: 'bot', bot: enemy, position: p }; }
    }
    if (bot.team === 2) {
      const p = this.player.position;
      const d = Math.hypot(p.x - bot.group.position.x, p.z - bot.group.position.z);
      if (d < bestDistance * 1.1 && d < 52) best = { type: 'player', position: p };
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
        this.moveBot(bot, dx, dz, dt, 3.2);
        continue;
      }
      const p = bot.group.position;
      const t = target.position;
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const distance = Math.hypot(dx, dz);
      bot.group.rotation.y = Math.atan2(-dx, -dz);
      if (distance > 13) this.moveBot(bot, dx, dz, dt, bot.speed);
      if (distance < 42 && now > bot.nextFire && this.lineClear(p, t)) {
        bot.nextFire = now + (920 / this.difficulty) + Math.random() * 700;
        const chance = bot.aim * this.difficulty * (distance < 16 ? .42 : .2);
        if (Math.random() < chance) {
          if (target.type === 'player') {
            this.onPlayerHit(5 + Math.random() * 8);
          } else {
            this.damageBot(target.bot, 9 + Math.random() * 10);
          }
        }
      }
    }
  }

  moveBot(bot, dx, dz, dt, speed) {
    const distance = Math.hypot(dx, dz);
    if (distance < .01) return;
    const p = bot.group.position;
    const nx = p.x + dx / distance * speed * dt;
    const nz = p.z + dz / distance * speed * dt;
    if (!isBlocked(nx, p.z, .38)) p.x = nx;
    if (!isBlocked(p.x, nz, .38)) p.z = nz;
  }

  damageBot(bot, damage) {
    if (!bot?.alive) return false;
    bot.hp -= damage;
    if (bot.hp <= 0) {
      bot.alive = false;
      bot.group.visible = false;
      this.onKill(bot);
    }
    return true;
  }

  hit(object, damage) {
    let node = object;
    while (node && !node.userData?.bot) node = node.parent;
    const bot = node?.userData?.bot;
    if (!bot || !bot.alive || bot.team !== 2) return { hit: false };
    const headshot = object.userData?.hitZone === 'head';
    this.damageBot(bot, damage * (headshot ? 2 : 1));
    return { hit: true, headshot, killed: !bot.alive };
  }

  damageRadius(position, radius, damage) {
    for (const bot of this.bots) {
      if (!bot.alive || bot.team !== 2) continue;
      const p = bot.group.position;
      const d = Math.hypot(p.x - position.x, p.z - position.z);
      if (d < radius) this.damageBot(bot, damage * (1 - d / radius));
    }
  }

  getTargetMeshes() {
    return this.bots.filter((b) => b.alive && b.team === 2)
      .flatMap((b) => b.group.children.filter((child) => child.userData.hitZone));
  }

  getAlive(team) { return this.bots.filter((b) => b.alive && b.team === team).length; }
}
