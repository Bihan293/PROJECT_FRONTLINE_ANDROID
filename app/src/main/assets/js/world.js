import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9aa49b);
scene.fog = new THREE.Fog(0x9aa49b, 65, 190);
export const colliders = [];

const mat = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness });
const groundMat = mat(0x59634b);
const roadMat = mat(0x766e5a);
const wallMats = [mat(0x9a8c72), mat(0x77796d), mat(0xaaa18c)];
const roofMat = mat(0x514b43);
const woodMat = mat(0x514638);
const glassMat = new THREE.MeshStandardMaterial({ color: 0x53666a, roughness: .35 });

function addBox(x, y, z, sx, sy, sz, material, collide = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  scene.add(mesh);
  if (collide) colliders.push({ x, z, hx: sx / 2, hz: sz / 2 });
  return mesh;
}

function addHouse(x, z, width = 10, depth = 9, height = 4) {
  const wall = wallMats[Math.floor(Math.random() * wallMats.length)];
  addBox(x, height / 2, z, width, height, depth, wall, true);
  const roof = new THREE.Group();
  roof.position.set(x, height, z);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width * .58, .35, depth + 1), roofMat);
    panel.position.set(side * width * .27, .8, 0);
    panel.rotation.z = side * .42;
    roof.add(panel);
  }
  scene.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, .12), woodMat);
  door.position.set(x - width * .18, 1.1, z - depth / 2 - .08);
  scene.add(door);
  for (const wx of [-.3, .3]) {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, .1), glassMat);
    windowMesh.position.set(x + wx * width * .55, 2.1, z - depth / 2 - .09);
    scene.add(windowMesh);
  }
  for (let i = -2; i <= 2; i++) {
    if (Math.abs(i) === 1) continue;
    addBox(x + i * 1.1, .55, z - depth / 2 - 1.25, .12, 1.1, .12, woodMat, false);
  }
}

function tree(x, z, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22 * scale, .32 * scale, 2.2 * scale, 7), woodMat);
  trunk.position.set(x, 1.1 * scale, z);
  scene.add(trunk);
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * .18) * scale, 2.5 * scale, 7), mat(i % 2 ? 0x344b36 : 0x40583b));
    crown.position.set(x, 2.5 * scale + i * .75 * scale, z);
    scene.add(crown);
  }
}

export function buildWorld() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(210, 210), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(18, 190), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = .015;
  scene.add(road);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(150, 12), roadMat);
  cross.rotation.x = -Math.PI / 2;
  cross.position.y = .02;
  scene.add(cross);

  const houses = [
    [-34, -34, 12, 10], [-12, -39, 10, 9], [28, -34, 12, 10],
    [43, -10, 10, 12], [-43, 5, 12, 10], [-25, 37, 12, 10],
    [12, 40, 13, 10], [42, 35, 11, 10], [-58, -28, 9, 9], [58, 5, 9, 10]
  ];
  houses.forEach(([x, z, w, d]) => addHouse(x, z, w, d, 3.8));
  for (const [x, z] of [[-8, -16], [8, 17], [33, 15], [-35, 22]]) addBox(x, 1.25, z, 4, 2.5, 3, woodMat, true);

  for (let i = 0; i < 48; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 68 + Math.random() * 22;
    tree(Math.cos(angle) * radius, Math.sin(angle) * radius, .7 + Math.random() * .5);
  }
  for (const [x, z] of [[-56, -5], [-53, 25], [55, -27], [22, 57], [-12, 58], [60, 45]]) tree(x, z, .8);

  const zones = [
    { id: 'A', x: 0, z: -55, color: 0x6aa6d0 },
    { id: 'B', x: 0, z: 0, color: 0xd1b06c },
    { id: 'C', x: 0, z: 55, color: 0xd27668 }
  ];
  zones.forEach((point) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(7.5, 8.1, 40), new THREE.MeshBasicMaterial({ color: point.color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(point.x, .06, point.z);
    scene.add(ring);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 5, 8), mat(0x343a35));
    pole.position.set(point.x, 2.5, point.z);
    scene.add(pole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.5, .85, .06), new THREE.MeshStandardMaterial({ color: 0x7d8580, side: THREE.DoubleSide }));
    flag.position.set(point.x + .8, 4.1, point.z);
    scene.add(flag);
    point.flag = flag;
    point.ring = ring;
    point.owner = 0;
    point.progress = 0;
    point.contested = false;
  });

  const hemi = new THREE.HemisphereLight(0xdce6e7, 0x4c503e, 1.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6c4, 2.05);
  sun.position.set(-45, 80, 30);
  sun.castShadow = false;
  scene.add(sun);
  return zones;
}

export function isBlocked(x, z, radius = .45) {
  for (const collider of colliders) {
    if (x + radius > collider.x - collider.hx && x - radius < collider.x + collider.hx &&
        z + radius > collider.z - collider.hz && z - radius < collider.z + collider.hz) return true;
  }
  return false;
}
