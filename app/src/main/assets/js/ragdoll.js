import * as THREE from 'three';

export class RagdollSystem {
  constructor(scene) {
    this.scene = scene;
    this.ragdolls = [];
    this.flyingProps = []; // Detached helmets, dropped weapons
    this.maxRagdolls = 20;
  }

  // Turn a fallen soldier into a dynamic physics ragdoll
  spawn(soldier, impulse, isHeadshot = false) {
    // If over limit, smoothly retire the oldest corpse
    if (this.ragdolls.length >= this.maxRagdolls) {
      const oldest = this.ragdolls.shift();
      this.scene.remove(oldest.soldier.root);
    }

    const root = soldier.root;
    const initialPos = root.position.clone();
    const facing = root.rotation.y;

    // Bullet or blast impulse
    const force = impulse ? impulse.clone() : new THREE.Vector3(0, 0, -1);
    const speed = force.length() > 0.001 ? force.length() : 3.5;
    force.normalize();

    // Headshot: pop helmet off with independent tumbling physics
    if (isHeadshot && soldier.helmet && soldier.neck) {
      soldier.neck.remove(soldier.helmet);
      soldier.helmet.position.copy(initialPos).add(new THREE.Vector3(0, 1.7, 0));
      this.scene.add(soldier.helmet);

      this.flyingProps.push({
        mesh: soldier.helmet,
        velocity: new THREE.Vector3(
          force.x * speed * 0.8 + (Math.random() - 0.5) * 2.5,
          Math.max(2.5, force.y * 3.0 + 3.2),
          force.z * speed * 0.8 + (Math.random() - 0.5) * 2.5
        ),
        angVel: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        settled: false,
        life: 15
      });
    }

    // Detach weapon so it drops to the floor
    if (soldier.weapon && soldier.rightElbow) {
      const worldGunPos = new THREE.Vector3();
      soldier.weapon.getWorldPosition(worldGunPos);
      soldier.rightElbow.remove(soldier.weapon);
      soldier.weapon.position.copy(worldGunPos);
      this.scene.add(soldier.weapon);

      this.flyingProps.push({
        mesh: soldier.weapon,
        velocity: new THREE.Vector3(
          force.x * speed * 0.4 + (Math.random() - 0.5) * 1.5,
          Math.max(1.0, force.y * 1.5 + 1.8),
          force.z * speed * 0.4 + (Math.random() - 0.5) * 1.5
        ),
        angVel: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
        settled: false,
        life: 18
      });
    }

    // Setup active ragdoll state
    const ragdoll = {
      soldier,
      root,
      pos: initialPos,
      velocity: new THREE.Vector3(
        force.x * speed * 0.9,
        Math.max(0.8, force.y * 2.5 + 1.8),
        force.z * speed * 0.9
      ),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 4.5 - (force.z * 3.5),
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 4.5 + (force.x * 3.5)
      ),
      limbAngles: {
        leftHip: soldier.leftHip.rotation.x,
        rightHip: soldier.rightHip.rotation.x,
        leftKnee: soldier.leftKnee.rotation.x,
        rightKnee: soldier.rightKnee.rotation.x,
        torso: soldier.torso.rotation.x,
        leftArm: soldier.leftShoulder.rotation.x,
        rightArm: soldier.rightShoulder.rotation.x
      },
      settled: false,
      sleepTimer: 0,
      life: 30
    };

    this.ragdolls.push(ragdoll);
  }

  update(dt) {
    const gravity = 14.0;

    // 1. Update ragdoll corpses
    for (let i = this.ragdolls.length - 1; i >= 0; i--) {
      const r = this.ragdolls[i];
      r.life -= dt;

      // Despawn old corpses
      if (r.life <= 0) {
        this.scene.remove(r.root);
        this.ragdolls.splice(i, 1);
        continue;
      }

      if (r.settled) continue;

      // Apply physics to body center of mass (pelvis)
      r.velocity.y -= gravity * dt;
      r.pos.addScaledVector(r.velocity, dt);

      // Rotate body with angular inertia
      r.root.rotation.x += r.angVel.x * dt;
      r.root.rotation.z += r.angVel.z * dt;
      r.root.rotation.y += r.angVel.y * dt;

      // Ground plane collision (floor is y = 0)
      const floorY = 0.22;
      if (r.pos.y <= floorY) {
        r.pos.y = floorY;
        r.velocity.y *= -0.22; // Bounce
        r.velocity.x *= 0.65;  // Friction
        r.velocity.z *= 0.65;
        r.angVel.multiplyScalar(0.6);

        // Flop limbs onto the ground when collapsing
        r.soldier.torso.rotation.x = THREE.MathUtils.lerp(r.soldier.torso.rotation.x, -0.75, dt * 5.0);
        r.soldier.neck.rotation.x = THREE.MathUtils.lerp(r.soldier.neck.rotation.x, -0.55, dt * 6.0);
        r.soldier.leftHip.rotation.x = THREE.MathUtils.lerp(r.soldier.leftHip.rotation.x, 0.45, dt * 4.0);
        r.soldier.rightHip.rotation.x = THREE.MathUtils.lerp(r.soldier.rightHip.rotation.x, -0.65, dt * 4.0);
        r.soldier.leftShoulder.rotation.z = THREE.MathUtils.lerp(r.soldier.leftShoulder.rotation.z, -1.2, dt * 5.0);
        r.soldier.rightShoulder.rotation.z = THREE.MathUtils.lerp(r.soldier.rightShoulder.rotation.z, 1.2, dt * 5.0);
      } else {
        // In mid-air: arms and legs swing with momentum
        r.soldier.leftHip.rotation.x += dt * 3.5;
        r.soldier.rightHip.rotation.x -= dt * 3.0;
        r.soldier.leftShoulder.rotation.x += dt * 4.0;
      }

      r.root.position.copy(r.pos);

      // Check if velocity settled to put ragdoll to sleep (saves mobile CPU)
      if (r.pos.y <= floorY + 0.05 && r.velocity.lengthSq() < 0.08) {
        r.sleepTimer += dt;
        if (r.sleepTimer > 0.8) {
          r.settled = true;
        }
      } else {
        r.sleepTimer = 0;
      }
    }

    // 2. Update flying props (dropped helmets, weapons)
    for (let i = this.flyingProps.length - 1; i >= 0; i--) {
      const p = this.flyingProps[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.flyingProps.splice(i, 1);
        continue;
      }

      if (p.settled) continue;

      p.velocity.y -= gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      p.mesh.rotation.x += p.angVel.x * dt;
      p.mesh.rotation.y += p.angVel.y * dt;
      p.mesh.rotation.z += p.angVel.z * dt;

      // Prop ground collision
      const propFloor = 0.08;
      if (p.mesh.position.y <= propFloor) {
        p.mesh.position.y = propFloor;
        p.velocity.y *= -0.32;
        p.velocity.x *= 0.55;
        p.velocity.z *= 0.55;
        p.angVel.multiplyScalar(0.45);

        if (p.velocity.lengthSq() < 0.05) {
          p.settled = true;
        }
      }
    }
  }

  clear() {
    this.ragdolls.forEach((r) => this.scene.remove(r.root));
    this.ragdolls = [];
    this.flyingProps.forEach((p) => this.scene.remove(p.mesh));
    this.flyingProps = [];
  }
}
