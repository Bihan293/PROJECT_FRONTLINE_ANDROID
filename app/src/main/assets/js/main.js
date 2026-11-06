import * as THREE from 'three';
import { CONFIG } from './config.js';
import { scene, buildWorld } from './world.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { BotSystem } from './bots.js';
import { CaptureSystem } from './capture.js';
import { GrenadeSystem } from './grenades.js';

const $ = (id) => document.getElementById(id);
const isMobile = matchMedia('(pointer: coarse)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'default',
    stencil: false,
    depth: true,
    failIfMajorPerformanceCaveat: false
  });
} catch (error) {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false });
  } catch (e2) {
    throw new Error('Браузер не смог создать WebGL-контекст. ' + (error?.message || error));
  }
}

const width = window.innerWidth || document.documentElement.clientWidth || 800;
const height = window.innerHeight || document.documentElement.clientHeight || 450;
const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? CONFIG.performance.mobilePixelRatio : CONFIG.performance.desktopPixelRatio);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !isMobile && CONFIG.performance.mobileShadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(78, (width / height) || (16 / 9), .08, 240);
scene.add(camera);
const zones = buildWorld();
const raycaster = new THREE.Raycaster();

let player = null;
let weapons = null;
let bots = null;
let capture = null;
let grenades = null;
let running = false;
let fireHeld = false;
let aiming = false;
let last = performance.now();
let fpsFrames = 0;
let fpsStart = performance.now();
let kills = 0;
let messageTimer = 0;
let endShown = false;

function message(text) {
  $('message').textContent = text;
  $('message').style.opacity = '1';
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { $('message').style.opacity = '0'; }, 1600);
}

function updateWeapon(name, ammo, reserve, key) {
  $('weapon-name').textContent = name;
  $('ammo').textContent = ammo;
  $('reserve').textContent = reserve;
  document.querySelectorAll('.weapon-slot').forEach((button) => {
    button.classList.toggle('selected', button.dataset.weapon === key);
  });
}

function updateHealth() {
  if (!player) return;
  $('health-num').textContent = Math.ceil(player.health);
  $('health-fill').style.width = player.health + '%';
  $('health-fill').classList.toggle('low', player.health < 35);
  $('injury-state').textContent = player.bleeding ? 'КРОВОТЕЧЕНИЕ — НУЖЕН БИНТ' : 'СТАБИЛЬНО';
  $('bandage-count').textContent = player.bandages;
}

function updateGrenades(inventory) {
  $('frag-count').textContent = inventory.frag;
  $('smoke-count').textContent = inventory.smoke;
}

function updateAlive() {
  if (!bots) return;
  $('alive-count').textContent = `ЖИВЫ: ${bots.getAlive(1) + 1} / ${bots.getAlive(2)}`;
}

function hitPlayer(amount) {
  if (!player || !running) return;
  player.damage(amount);
  updateHealth();
  $('hit-indicator').classList.add('hit');
  clearTimeout(hitPlayer.timer);
  hitPlayer.timer = setTimeout(() => $('hit-indicator').classList.remove('hit'), 170);
}

function setAim(value) {
  aiming = value;
  if (player) player.aiming = value;
  camera.fov = value ? (weapons?.current === 'sniper' ? 34 : 54) : 78;
  camera.updateProjectionMatrix();
  document.body.classList.toggle('aiming', value);
}

function finishMatch(title, detail) {
  if (endShown) return;
  endShown = true;
  running = false;
  fireHeld = false;
  setAim(false);
  document.exitPointerLock?.();
  $('end-title').textContent = title;
  $('end-detail').textContent = detail;
  $('end-screen').classList.remove('hidden');
}

function start() {
  if (running) return;
  const teamSize = Number($('team-size').value);
  const difficulty = Number($('bot-difficulty').value);
  kills = 0;
  endShown = false;
  player = new Player(camera, renderer.domElement);
  weapons = new WeaponSystem(camera, updateWeapon, message);
  bots = new BotSystem(scene, player, teamSize, difficulty, hitPlayer, () => { kills++; updateAlive(); });
  capture = new CaptureSystem(
    zones, player, bots,
    (blue, red, points) => {
      $('blue-score').textContent = Math.floor(blue);
      $('red-score').textContent = Math.floor(red);
      points.forEach((point) => {
        const el = $('p' + point.id);
        el.className = point.owner === 1 ? 'blue-own' : point.owner === -1 ? 'red-own' : '';
      });
      $('point-status').textContent = points.some((point) => point.contested) ? 'ТОЧКА ПОД ОГНЁМ' : 'ЗАХВАТ ТОЧЕК';
    },
    message,
    (winner, blue, red) => finishMatch(winner === 'СИНИЕ' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', `Синие ${blue} : ${red} Красные`)
  );
  grenades = new GrenadeSystem(scene, camera, player, bots, message, updateGrenades);
  $('blue-score').textContent = '0';
  $('red-score').textContent = '0';
  $('alive-count').textContent = `ЖИВЫ: ${teamSize} / ${teamSize}`;
  $('start-screen').classList.add('hidden');
  $('pause-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('hud').style.display = 'block';
  updateHealth();
  updateGrenades(grenades.inventory);
  updateAlive();
  running = true;
  last = performance.now();
  if (!isMobile) renderer.domElement.requestPointerLock?.();
  animate();
}

function pause() {
  if (!running) return;
  running = false;
  fireHeld = false;
  setAim(false);
  $('pause-screen').classList.remove('hidden');
  document.exitPointerLock?.();
}

function resume() {
  if (endShown || !player || player.health <= 0) return;
  $('pause-screen').classList.add('hidden');
  running = true;
  last = performance.now();
  if (!isMobile) renderer.domElement.requestPointerLock?.();
  animate();
}

function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(.04, Math.max(0, (now - last) / 1000));
  last = now;

  player.update(dt);
  bots.update(dt, now);
  capture.update(now);
  grenades.update(dt);
  weapons.update(dt);

  if (fireHeld) {
    weapons.fire(now, raycaster, bots.getTargetMeshes(), (hit, damage) => {
      const result = bots.hit(hit.object, damage);
      if (result.hit) {
        if (result.headshot) message('ПОПАДАНИЕ В ГОЛОВУ');
        else if (result.killed) message('ПРОТИВНИК УСТРАНЁН');
        updateAlive();
      }
    });
  }

  updateHealth();
  if (player.health <= 0) {
    finishMatch('ВЫ УСТРАНЕНЫ', `Устранено противников: ${kills}`);
  }

  renderer.render(scene, camera);
  fpsFrames++;
  if (now - fpsStart >= 1000) {
    $('fps').textContent = fpsFrames + ' FPS';
    fpsFrames = 0;
    fpsStart = now;
  }
}

// Main menu and game state.
$('start-btn').addEventListener('click', start);
$('resume-btn').addEventListener('click', resume);
$('restart-btn').addEventListener('click', () => location.reload());
$('end-restart-btn').addEventListener('click', () => location.reload());
$('reload-btn').addEventListener('click', () => weapons?.reload());
$('bandage-btn').addEventListener('click', () => {
  if (player?.bandage()) { message('КРОВОТЕЧЕНИЕ ОСТАНОВЛЕНО'); updateHealth(); }
  else message(player?.bandages <= 0 ? 'БИНТЫ ЗАКОНЧИЛИСЬ' : 'БИНТ НЕ ТРЕБУЕТСЯ');
});
$('aim-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); setAim(true); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => $('aim-btn').addEventListener(eventName, () => setAim(false)));
$('fire-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); fireHeld = true; $('fire-btn').setPointerCapture?.(e.pointerId); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => $('fire-btn').addEventListener(eventName, () => { fireHeld = false; }));
$('jump-btn').addEventListener('click', () => player?.jump());
$('crouch-btn').addEventListener('click', () => {
  if (!player) return;
  player.crouched = !player.crouched;
  $('crouch-btn').textContent = player.crouched ? 'ВСТАТЬ' : 'ПРИСЕСТЬ';
});
$('frag-btn').addEventListener('click', () => grenades?.throw('frag'));
$('smoke-btn').addEventListener('click', () => grenades?.throw('smoke'));
document.querySelectorAll('.weapon-slot').forEach((button) => {
  button.addEventListener('click', () => weapons?.equip(button.dataset.weapon));
});

// Desktop weapon and action shortcuts.
window.addEventListener('keydown', (e) => {
  if (!weapons || !running) return;
  const keys = { Digit1: 'ak', Digit2: 'shotgun', Digit3: 'sniper', Digit4: 'pistol' };
  if (keys[e.code]) weapons.equip(keys[e.code]);
  if (e.code === 'KeyR') weapons.reload();
  if (e.code === 'KeyH') $('bandage-btn').click();
  if (e.code === 'KeyG') grenades.throw('frag');
  if (e.code === 'KeyT') grenades.throw('smoke');
  if (e.code === 'KeyC') $('crouch-btn').click();
  if (e.code === 'Escape') pause();
});
renderer.domElement.addEventListener('mousedown', (e) => {
  if (!running) return;
  if (e.button === 0) fireHeld = true;
  if (e.button === 2) setAim(true);
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) fireHeld = false;
  if (e.button === 2) setAim(false);
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// Mobile movement joystick.
const joystick = $('joystick');
const stick = $('stick');
let joystickPointer = null;
function moveJoystick(e) {
  const rect = joystick.getBoundingClientRect();
  const dx = e.clientX - (rect.left + rect.width / 2);
  const dy = e.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy);
  const strength = Math.min(1, length / 43);
  const x = length ? dx / length * strength : 0;
  const y = length ? dy / length * strength : 0;
  stick.style.transform = `translate(${x * 43}px, ${y * 43}px)`;
  if (player) player.move = { x, y };
}
function resetJoystick() {
  joystickPointer = null;
  stick.style.transform = '';
  if (player) player.move = { x: 0, y: 0 };
}
joystick.addEventListener('pointerdown', (e) => {
  joystickPointer = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  moveJoystick(e);
});
joystick.addEventListener('pointermove', (e) => { if (e.pointerId === joystickPointer) moveJoystick(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((eventName) => joystick.addEventListener(eventName, resetJoystick));

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? CONFIG.performance.mobilePixelRatio : CONFIG.performance.desktopPixelRatio));
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  pause();
  message('ПОТЕРЯН КОНТЕКСТ WEBGL — ОБНОВИ СТРАНИЦУ');
});

$('desktop-help').style.display = isMobile ? 'none' : 'block';
$('loading').style.display = 'none';
