import * as THREE from 'three';

// Materials for Dummy War stylized tactical mannequins
const woodDummyMat = new THREE.MeshStandardMaterial({ color: 0xba966d, roughness: 0.65 });
const jointMat = new THREE.MeshStandardMaterial({ color: 0x272a28, roughness: 0.85, metalness: 0.2 });
const bootMat = new THREE.MeshStandardMaterial({ color: 0x1f2220, roughness: 0.9 });
const gunMat = new THREE.MeshStandardMaterial({ color: 0x252a27, metalness: 0.5, roughness: 0.45 });
const woodStockMat = new THREE.MeshStandardMaterial({ color: 0x5a4332, roughness: 0.8 });

const teamVestBlue = new THREE.MeshStandardMaterial({ color: 0x33526d, roughness: 0.85 });
const teamVestRed = new THREE.MeshStandardMaterial({ color: 0x70372e, roughness: 0.85 });
const helmetBlue = new THREE.MeshStandardMaterial({ color: 0x253c50, roughness: 0.8 });
const helmetRed = new THREE.MeshStandardMaterial({ color: 0x582a24, roughness: 0.8 });

export function createDummySoldier(team) {
  const root = new THREE.Group();
  const vestMat = team === 1 ? teamVestBlue : teamVestRed;
  const helmMat = team === 1 ? helmetBlue : helmetRed;

  // Pelvis / Hips
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.94;
  root.add(pelvis);

  const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.22), jointMat);
  pelvisMesh.userData.hitZone = 'body';
  pelvis.add(pelvisMesh);

  // Torso / Chest with Tactical Vest
  const torso = new THREE.Group();
  torso.position.y = 0.11;
  pelvis.add(torso);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), woodDummyMat);
  chestMesh.position.y = 0.21;
  chestMesh.userData.hitZone = 'body';
  torso.add(chestMesh);

  // Tactical Vest Armor & Pouches
  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.36, 0.26), vestMat);
  vestMesh.position.y = 0.21;
  vestMesh.userData.hitZone = 'body';
  torso.add(vestMesh);

  const pouch1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), jointMat);
  pouch1.position.set(-0.11, 0.14, 0.16);
  torso.add(pouch1);
  const pouch2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), jointMat);
  pouch2.position.set(0.11, 0.14, 0.16);
  torso.add(pouch2);

  // Neck & Head
  const neck = new THREE.Group();
  neck.position.y = 0.43;
  torso.add(neck);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 8), woodDummyMat);
  headMesh.position.y = 0.19;
  headMesh.userData.hitZone = 'head';
  neck.add(headMesh);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.205, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), helmMat);
  helmet.position.y = 0.21;
  helmet.userData.hitZone = 'head';
  neck.add(helmet);

  // Shoulders & Arms (Articulated Left & Right)
  // Left Arm (Supports rifle fore-end)
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.24, 0.38, 0.02);
  torso.add(leftShoulder);

  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.28, 6), woodDummyMat);
  leftUpperArm.position.y = -0.14;
  leftUpperArm.userData.hitZone = 'arm';
  leftUpperArm.userData.limb = 'leftArm';
  leftShoulder.add(leftUpperArm);

  const leftElbow = new THREE.Group();
  leftElbow.position.y = -0.28;
  leftShoulder.add(leftElbow);

  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 6), woodDummyMat);
  leftForearm.position.y = -0.13;
  leftForearm.userData.hitZone = 'arm';
  leftForearm.userData.limb = 'leftArm';
  leftElbow.add(leftForearm);

  // Right Arm (Weapon grip and trigger)
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.24, 0.38, 0.02);
  torso.add(rightShoulder);

  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.28, 6), woodDummyMat);
  rightUpperArm.position.y = -0.14;
  rightUpperArm.userData.hitZone = 'arm';
  rightUpperArm.userData.limb = 'rightArm';
  rightShoulder.add(rightUpperArm);

  const rightElbow = new THREE.Group();
  rightElbow.position.y = -0.28;
  rightShoulder.add(rightElbow);

  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 6), woodDummyMat);
  rightForearm.position.y = -0.13;
  rightForearm.userData.hitZone = 'arm';
  rightForearm.userData.limb = 'rightArm';
  rightElbow.add(rightForearm);

  // Weapon in Right Hand
  const weapon = new THREE.Group();
  weapon.position.set(0, -0.24, -0.06);
  rightElbow.add(weapon);

  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.62), gunMat);
  weapon.add(gunBody);
  const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.22), woodStockMat);
  gunStock.position.set(0, -0.02, 0.36);
  weapon.add(gunStock);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -0.42);
  weapon.add(barrel);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.12), gunMat);
  mag.position.set(0, -0.12, -0.04);
  weapon.add(mag);

  // Legs (Hips, Thighs, Knees, Calves, Boots)
  // Left Leg
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.12, -0.09, 0);
  pelvis.add(leftHip);

  const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.068, 0.42, 6), woodDummyMat);
  leftThigh.position.y = -0.21;
  leftThigh.userData.hitZone = 'leg';
  leftThigh.userData.limb = 'leftLeg';
  leftHip.add(leftThigh);

  const leftKnee = new THREE.Group();
  leftKnee.position.y = -0.42;
  leftHip.add(leftKnee);

  const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.38, 6), woodDummyMat);
  leftCalf.position.y = -0.19;
  leftCalf.userData.hitZone = 'leg';
  leftCalf.userData.limb = 'leftLeg';
  leftKnee.add(leftCalf);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.22), bootMat);
  leftBoot.position.set(0, -0.38, -0.04);
  leftBoot.userData.hitZone = 'leg';
  leftKnee.add(leftBoot);

  // Right Leg
  const rightHip = new THREE.Group();
  rightHip.position.set(0.12, -0.09, 0);
  pelvis.add(rightHip);

  const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.068, 0.42, 6), woodDummyMat);
  rightThigh.position.y = -0.21;
  rightThigh.userData.hitZone = 'leg';
  rightThigh.userData.limb = 'rightLeg';
  rightHip.add(rightThigh);

  const rightKnee = new THREE.Group();
  rightKnee.position.y = -0.42;
  rightHip.add(rightKnee);

  const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.38, 6), woodDummyMat);
  rightCalf.position.y = -0.19;
  rightCalf.userData.hitZone = 'leg';
  rightCalf.userData.limb = 'rightLeg';
  rightKnee.add(rightCalf);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.22), bootMat);
  rightBoot.position.set(0, -0.38, -0.04);
  rightBoot.userData.hitZone = 'leg';
  rightKnee.add(rightBoot);

  return {
    root,
    pelvis,
    torso,
    neck,
    helmet,
    leftShoulder,
    leftElbow,
    rightShoulder,
    rightElbow,
    weapon,
    leftHip,
    leftKnee,
    rightHip,
    rightKnee,
    walkPhase: Math.random() * Math.PI * 2,
    flinch: 0,
    recoil: 0,

    // Natural procedural animation update
    update(dt, speed, isFiring = false, pitch = 0) {
      // Recoil and flinch decay
      this.recoil = Math.max(0, this.recoil - dt * 6.5);
      this.flinch = Math.max(0, this.flinch - dt * 5.0);

      // Walking motion
      const moving = speed > 0.1;
      if (moving) {
        this.walkPhase += speed * dt * 4.8;
      }

      const sin = moving ? Math.sin(this.walkPhase) : 0;
      const cos = moving ? Math.cos(this.walkPhase) : 0;

      // Legs swing naturally in stride
      this.leftHip.rotation.x = sin * 0.65;
      this.leftKnee.rotation.x = Math.max(0, -sin * 0.85); // Knee bends backward
      this.rightHip.rotation.x = -sin * 0.65;
      this.rightKnee.rotation.x = Math.max(0, sin * 0.85);

      // Pelvis natural vertical bounce and slight sway
      this.pelvis.position.y = 0.94 + (moving ? Math.abs(cos) * 0.04 : Math.sin(performance.now() * 0.002) * 0.01);
      this.pelvis.rotation.y = moving ? sin * 0.12 : 0;
      this.pelvis.rotation.z = moving ? -cos * 0.04 : 0;

      // Upper body aiming and tactical stance
      this.torso.rotation.x = pitch * 0.6 - this.flinch * 0.45;
      this.neck.rotation.x = pitch * 0.4 + this.flinch * 0.2;

      // Weapon holding pose
      // Right arm holds pistol grip up towards chest
      this.rightShoulder.rotation.set(-0.75 + this.recoil * 0.35, -0.22, 0.12);
      this.rightElbow.rotation.set(-0.85 - this.recoil * 0.2, 0, 0);

      // Left arm grips fore-end
      this.leftShoulder.rotation.set(-0.65, 0.42, -0.32);
      this.leftElbow.rotation.set(-0.95, 0, 0.25);

      // Recoil weapon kick
      this.weapon.position.z = -0.06 + this.recoil * 0.12;
      this.weapon.rotation.x = this.recoil * 0.22;
    },

    triggerRecoil() {
      this.recoil = 1.0;
    },

    triggerFlinch() {
      this.flinch = 1.0;
    }
  };
}
