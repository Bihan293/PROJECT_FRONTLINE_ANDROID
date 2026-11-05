import * as THREE from 'three';
import { CONFIG } from './config.js';

export class WeaponSystem {
  constructor(camera, onChange, onMessage) {
    this.camera = camera;
    this.onChange = onChange;
    this.onMessage = onMessage;
    this.current = 'ak';
    this.states = {};
    for (const [key, weapon] of Object.entries(CONFIG.weapons)) {
      this.states[key] = { ammo: weapon.mag, reserve: weapon.reserve };
    }
    this.lastShot = 0;
    this.reloading = false;
    this.recoil = 0;
    this.viewmodels = new Map();
    this.createViewModels();
    this.updateHud();
  }

  createViewModels() {
    const dark = new THREE.MeshStandardMaterial({ color: 0x202722, metalness: 0.58, roughness: 0.42 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x3e4642, metalness: 0.78, roughness: 0.28 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x574638, roughness: 0.82 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x171b19, roughness: 0.95 });
    const addBox = (g, sx, sy, sz, x, y, z, material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
      m.position.set(x, y, z); g.add(m); return m;
    };
    const addBarrel = (g, length, radius, x, y, z, material = steel) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 9), material);
      m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
    };

    for (const key of Object.keys(CONFIG.weapons)) {
      const g = new THREE.Group();
      g.position.set(0.34, -0.28, -0.63);
      if (key === 'ak') {
        addBox(g, .16, .15, .56, 0, 0, 0, dark);
        addBarrel(g, .66, .024, 0, .045, -.54);
        addBox(g, .12, .13, .32, 0, -.03, .34, wood);
        addBox(g, .095, .24, .14, 0, -.19, -.02, dark);
        addBox(g, .18, .12, .16, 0, .13, -.08, rubber);
        addBox(g, .055, .12, .1, .09, -.11, -.17, wood);
      } else if (key === 'shotgun') {
        addBox(g, .17, .14, .55, 0, 0, 0, dark);
        addBarrel(g, .78, .042, 0, .04, -.6);
        addBox(g, .12, .11, .32, 0, -.02, .34, wood);
        addBox(g, .12, .11, .24, 0, -.13, -.17, wood);
      } else if (key === 'sniper') {
        addBox(g, .15, .14, .72, 0, 0, 0, dark);
        addBarrel(g, 1.02, .018, 0, .045, -.79);
        addBox(g, .18, .12, .3, 0, -.02, .45, rubber);
        addBox(g, .12, .1, .25, 0, -.11, -.16, dark);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .28, 12), dark);
        scope.rotation.x = Math.PI / 2; scope.position.set(0, .14, -.12); g.add(scope);
        addBox(g, .12, .035, .08, 0, .11, -.12, rubber);
      } else {
        addBox(g, .12, .13, .28, 0, 0, 0, dark);
        addBox(g, .09, .2, .1, 0, -.15, .06, rubber);
        addBarrel(g, .28, .018, 0, .035, -.25);
        addBox(g, .07, .045, .12, 0, .08, -.06, steel);
      }
      g.visible = key === this.current;
      this.camera.add(g);
      this.viewmodels.set(key, g);
    }
  }

  equip(key) {
    if (!CONFIG.weapons[key] || this.current === key) return;
    this.viewmodels.get(this.current).visible = false;
    this.current = key;
    this.viewmodels.get(this.current).visible = true;
    this.reloading = false;
    this.recoil = 0;
    this.updateHud();
    this.onMessage(CONFIG.weapons[key].name);
  }

  updateHud() {
    const w = CONFIG.weapons[this.current];
    const s = this.states[this.current];
    this.onChange(w.name, s.ammo, s.reserve, this.current);
  }

  update(dt) {
    this.recoil = Math.max(0, this.recoil - dt * 3.6);
    for (const [key, group] of this.viewmodels) {
      if (!group.visible) continue;
      group.position.z = -0.63 + this.recoil * 0.2;
      group.rotation.x = -this.recoil * 0.11;
    }
  }

  reload() {
    const w = CONFIG.weapons[this.current];
    const s = this.states[this.current];
    if (this.reloading || s.ammo === w.mag || s.reserve <= 0) return false;
    this.reloading = true;
    this.onMessage('ПЕРЕЗАРЯДКА');
    setTimeout(() => {
      const amount = Math.min(w.mag - s.ammo, s.reserve);
      s.ammo += amount;
      s.reserve -= amount;
      this.reloading = false;
      this.updateHud();
    }, w.reload);
    return true;
  }

  fire(now, raycaster, targets, onHit) {
    const w = CONFIG.weapons[this.current];
    const s = this.states[this.current];
    if (this.reloading || now - this.lastShot < w.fireRate) return false;
    if (s.ammo <= 0) { this.onMessage('НЕТ ПАТРОНОВ — НАЖМИ R'); return false; }
    this.lastShot = now;
    s.ammo--;
    this.recoil = Math.min(1, this.recoil + (this.current === 'sniper' ? .8 : .34));
    this.updateHud();

    for (let i = 0; i < w.pellets; i++) {
      const spread = this.current === 'shotgun' ? 1 : 1;
      const dir = new THREE.Vector3(
        (Math.random() - .5) * w.spread * spread,
        (Math.random() - .5) * w.spread * spread,
        -1
      ).normalize().applyQuaternion(this.camera.quaternion);
      raycaster.set(this.camera.getWorldPosition(new THREE.Vector3()), dir);
      raycaster.far = w.range;
      const intersections = raycaster.intersectObjects(targets, true);
      if (intersections.length) onHit(intersections[0], w.damage);
    }
    return true;
  }
}
