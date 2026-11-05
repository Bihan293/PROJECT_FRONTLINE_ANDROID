import * as THREE from 'three';
import { CONFIG } from './config.js';
import { isBlocked } from './world.js';

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.position = new THREE.Vector3(0, 0, 72);
    this.velocityY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.health = 100;
    this.bleeding = false;
    this.bandages = 3;
    this.crouched = false;
    this.aiming = false;
    this.keys = Object.create(null);
    this.move = { x: 0, y: 0 };
    this.lastDamage = 0;
    this.jumpHeight = 0;
    this.bobTime = 0;
    this.bind();
    this.updateCamera(0);
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    this.dom.addEventListener('click', () => {
      if (!this.isMobile() && !document.pointerLockElement) this.dom.requestPointerLock?.();
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.dom) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.42, 1.42);
    });

    let touchId = null;
    let lastX = 0;
    let lastY = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest && e.target.closest('button, select, #joystick, .panel')) return;
      for (const t of e.changedTouches) {
        if (t.clientX > innerWidth * 0.3 && touchId === null) {
          touchId = t.identifier;
          lastX = t.clientX;
          lastY = t.clientY;
        }
      }
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== touchId) continue;
        const dx = t.clientX - lastX;
        const dy = t.clientY - lastY;
        this.yaw -= dx * 0.004;
        this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, -1.4, 1.4);
        lastX = t.clientX;
        lastY = t.clientY;
        e.preventDefault();
      }
    }, { passive: false });
    const clearTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) touchId = null;
      }
    };
    window.addEventListener('touchend', clearTouch);
    window.addEventListener('touchcancel', clearTouch);
  }

  isMobile() { return matchMedia('(pointer: coarse)').matches; }

  jump() {
    if (this.jumpHeight <= 0.001) {
      this.velocityY = CONFIG.player.jumpSpeed;
      return true;
    }
    return false;
  }

  update(dt) {
    const forward = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0) - this.move.y;
    const side = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0) + this.move.x;
    const sprinting = (this.keys.ShiftLeft || this.keys.ShiftRight) && !this.crouched;
    const speed = this.crouched ? CONFIG.player.speed * 0.48 : (sprinting ? CONFIG.player.sprint : CONFIG.player.speed);
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const v = f.multiplyScalar(forward).add(r.multiplyScalar(side));
    const moving = v.lengthSq() > 0.001;
    if (v.length() > 1) v.normalize();
    v.multiplyScalar(speed * dt);

    const radius = 0.42;
    const nx = this.position.x + v.x;
    const nz = this.position.z + v.z;
    if (!isBlocked(nx, this.position.z, radius)) this.position.x = THREE.MathUtils.clamp(nx, -88, 88);
    if (!isBlocked(this.position.x, nz, radius)) this.position.z = THREE.MathUtils.clamp(nz, -88, 88);

    if (this.keys.Space) { this.jump(); this.keys.Space = false; }
    this.velocityY -= CONFIG.player.gravity * dt;
    this.jumpHeight = Math.max(0, this.jumpHeight + this.velocityY * dt);
    if (this.jumpHeight === 0) this.velocityY = 0;
    if (moving) this.bobTime += dt * (sprinting ? 13 : 9);
    else this.bobTime *= Math.max(0, 1 - dt * 8);

    if (this.bleeding && performance.now() - this.lastDamage > 8000) this.damage(0.35);
    this.updateCamera(dt);
  }

  updateCamera() {
    const crouchEye = this.crouched ? CONFIG.player.eyeCrouch : CONFIG.player.height;
    const bob = Math.sin(this.bobTime) * Math.min(0.035, this.bobTime > 0 ? 0.035 : 0);
    this.camera.position.set(this.position.x, crouchEye + this.jumpHeight + bob, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.lastDamage = performance.now();
    if (this.health < 75) this.bleeding = true;
  }

  bandage() {
    if (!this.bleeding || this.bandages <= 0) return false;
    this.bandages--;
    this.bleeding = false;
    this.health = Math.min(100, this.health + 12);
    return true;
  }
}
