import * as THREE from 'three';

export class BloodSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.decals = [];
    this.maxDecals = 64;

    // Shared blood materials and geometries for optimal performance on mobile
    this.bloodColors = [0x8b0000, 0x660000, 0xa30000, 0x4a0000];
    this.particleGeometry = new THREE.BoxGeometry(0.065, 0.065, 0.065);
    this.particleMaterials = this.bloodColors.map((color) => new THREE.MeshBasicMaterial({ color }));

    this.decalGeometry = new THREE.CircleGeometry(1, 8);
    this.decalGeometry.rotateX(-Math.PI / 2);
    this.decalMaterial = new THREE.MeshBasicMaterial({
      color: 0x470202,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    });
  }

  // Directional blood spray on bullet impact (Dummy War style)
  spray(position, direction, count = 14, isHeadshot = false) {
    const total = isHeadshot ? count * 2 : count;
    const baseSpeed = isHeadshot ? 6.5 : 4.2;

    for (let i = 0; i < total; i++) {
      const mat = this.particleMaterials[Math.floor(Math.random() * this.particleMaterials.length)];
      const mesh = new THREE.Mesh(this.particleGeometry, mat);

      // Spawn at hit position with small jitter
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 0.15,
        position.y + (Math.random() - 0.5) * 0.15,
        position.z + (Math.random() - 0.5) * 0.15
      );

      // Spray velocity mostly in bullet exit direction with conical spread
      const spreadX = (Math.random() - 0.5) * 1.6;
      const spreadY = (Math.random() - 0.2) * 1.8;
      const spreadZ = (Math.random() - 0.5) * 1.6;

      const velocity = new THREE.Vector3(
        direction.x * baseSpeed + spreadX,
        Math.max(1.0, direction.y * baseSpeed + spreadY + 1.2),
        direction.z * baseSpeed + spreadZ
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.9 + Math.random() * 0.6,
        size: 0.05 + Math.random() * 0.04
      });
    }
  }

  // Large explosive blood splatter (e.g. from grenades)
  burst(position, count = 28) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.2) * 1.4;
      const speed = 3.5 + Math.random() * 6.0;

      const dir = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.abs(Math.sin(elevation)) + 0.5,
        Math.sin(angle) * Math.cos(elevation)
      );

      const mat = this.particleMaterials[Math.floor(Math.random() * this.particleMaterials.length)];
      const mesh = new THREE.Mesh(this.particleGeometry, mat);
      mesh.position.copy(position);

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: dir.multiplyScalar(speed),
        life: 1.1 + Math.random() * 0.8,
        size: 0.07 + Math.random() * 0.06
      });
    }

    // Immediately create a large ground pool directly underneath
    this.addDecal(new THREE.Vector3(position.x, 0.025, position.z), 0.75 + Math.random() * 0.45);
  }

  // Create persistent ground blood splatters / decals
  addDecal(position, radius = 0.28) {
    if (this.decals.length >= this.maxDecals) {
      const oldest = this.decals.shift();
      this.scene.remove(oldest);
      oldest.material.dispose?.();
    }

    const mat = this.decalMaterial.clone();
    mat.opacity = 0.75 + Math.random() * 0.2;
    const decal = new THREE.Mesh(this.decalGeometry, mat);

    decal.position.set(position.x, 0.02 + Math.random() * 0.005, position.z);
    decal.scale.set(radius, radius, radius);
    decal.rotation.z = Math.random() * Math.PI * 2;

    this.scene.add(decal);
    this.decals.push(decal);
  }

  update(dt) {
    const gravity = 13.5;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      p.velocity.y -= gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      // Droplet hits ground: create pool and destroy droplet
      if (p.mesh.position.y <= 0.03) {
        if (Math.random() < 0.65) {
          this.addDecal(p.mesh.position, 0.16 + Math.random() * 0.22);
        }
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Expired in mid-air
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  clear() {
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
    this.decals.forEach((d) => this.scene.remove(d));
    this.decals = [];
  }
}
