import * as THREE from 'three';

export class GrenadeSystem {
  constructor(scene, camera, player, bots, onMessage, onInventory) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.bots = bots;
    this.onMessage = onMessage;
    this.onInventory = onInventory;
    this.inventory = { frag: 2, smoke: 2 };
    this.projectiles = [];
    this.effects = [];
    this.cooldownUntil = 0;
    this.sharedGeometry = new THREE.SphereGeometry(.16, 10, 8);
    this.onInventory(this.inventory);
  }

  throw(type) {
    const now = performance.now();
    if (!['frag', 'smoke'].includes(type)) return false;
    if (now < this.cooldownUntil) return false;
    if (this.inventory[type] <= 0) {
      this.onMessage(type === 'frag' ? 'ОСКОЛОЧНЫЕ ЗАКОНЧИЛИСЬ' : 'ДЫМОВЫЕ ЗАКОНЧИЛИСЬ');
      return false;
    }
    this.inventory[type]--;
    this.cooldownUntil = now + 500;
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    const position = this.camera.getWorldPosition(new THREE.Vector3()).addScaledVector(direction, .65);
    const mesh = new THREE.Mesh(this.sharedGeometry, new THREE.MeshStandardMaterial({
      color: type === 'frag' ? 0x45513f : 0x777e7b,
      roughness: .85,
      metalness: .25
    }));
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.projectiles.push({
      type, mesh,
      velocity: direction.multiplyScalar(13).add(new THREE.Vector3(0, 5.2, 0)),
      fuse: type === 'frag' ? 1.55 : 1.05,
      age: 0
    });
    this.onInventory(this.inventory);
    this.onMessage(type === 'frag' ? 'ОСКОЛОЧНАЯ ГРАНАТА!' : 'ДЫМОВАЯ ГРАНАТА!');
    return true;
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const grenade = this.projectiles[i];
      grenade.age += dt;
      grenade.fuse -= dt;
      grenade.velocity.y -= 12 * dt;
      grenade.mesh.position.addScaledVector(grenade.velocity, dt);
      if (grenade.mesh.position.y < .18) {
        grenade.mesh.position.y = .18;
        grenade.velocity.y *= -.34;
        grenade.velocity.x *= .72;
        grenade.velocity.z *= .72;
      }
      if (grenade.fuse <= 0) {
        this.detonate(grenade);
        this.scene.remove(grenade.mesh);
        grenade.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.age += dt;
      if (effect.type === 'flash') {
        const scale = .5 + effect.age * 12;
        effect.group.scale.setScalar(scale);
        effect.material.opacity = Math.max(0, .7 * (1 - effect.age / effect.duration));
      } else {
        const progress = Math.min(1, effect.age / effect.duration);
        effect.group.scale.set(1 + progress * .8, 1 + progress * .45, 1 + progress * .8);
        effect.materials.forEach((m, index) => { m.opacity = .15 * (1 - progress) * (index % 3 === 0 ? 1.15 : 1); });
      }
      if (effect.age >= effect.duration) {
        this.scene.remove(effect.group);
        if (effect.group.traverse) effect.group.traverse((obj) => {
          if (obj.isMesh) { obj.geometry.dispose(); if (obj.material !== this.sharedGeometry) obj.material.dispose(); }
        });
        this.effects.splice(i, 1);
      }
    }
  }

  detonate(grenade) {
    const p = grenade.mesh.position.clone();
    if (grenade.type === 'frag') {
      this.bots.damageRadius(p, 13, 120);
      const playerDistance = Math.hypot(this.player.position.x - p.x, this.player.position.z - p.z);
      if (playerDistance < 13) this.player.damage(75 * (1 - playerDistance / 13));
      const group = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({ color: 0xffd28b, transparent: true, opacity: .7, depthWrite: false });
      const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material);
      group.add(flash); group.position.copy(p); this.scene.add(group);
      this.effects.push({ type: 'flash', group, material, age: 0, duration: .26 });
      this.onMessage('ВЗРЫВ!');
    } else {
      const group = new THREE.Group();
      const materials = [];
      for (let i = 0; i < 11; i++) {
        const material = new THREE.MeshBasicMaterial({
          color: i % 2 ? 0x727b78 : 0x59625f,
          transparent: true, opacity: .15, depthWrite: false
        });
        materials.push(material);
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), material);
        const angle = i * 2.399;
        cloud.position.set(Math.cos(angle) * (i % 3) * .8, (i % 4) * .55, Math.sin(angle) * (i % 3) * .8);
        cloud.scale.set(2.1 + (i % 3) * .4, 1.6 + (i % 2) * .3, 2.1 + (i % 3) * .4);
        group.add(cloud);
      }
      group.position.set(p.x, 2.2, p.z);
      this.scene.add(group);
      this.effects.push({ type: 'smoke', group, materials, age: 0, duration: 9.5 });
      this.onMessage('ДЫМОВАЯ ЗАВЕСА');
    }
  }
}
