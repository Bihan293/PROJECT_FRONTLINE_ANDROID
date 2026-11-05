export const CONFIG = {
  map: { size: 180, half: 90 },
  match: { targetScore: 300, scorePerSecond: 1.5, captureRate: 0.2, captureRadius: 9 },
  player: { speed: 7.2, sprint: 10.5, height: 1.72, eyeCrouch: 1.18, jumpSpeed: 5.2, gravity: 14 },
  performance: { mobilePixelRatio: 1.1, desktopPixelRatio: 1.5, mobileShadows: false },
  weapons: {
    ak: { name: 'АК-74', mag: 30, reserve: 150, damage: 27, fireRate: 105, reload: 1900, spread: 0.012, pellets: 1, range: 100, automatic: true },
    shotgun: { name: 'ДРОБОВИК', mag: 8, reserve: 48, damage: 12, fireRate: 700, reload: 2300, spread: 0.085, pellets: 9, range: 28 },
    sniper: { name: 'СНАЙПЕРСКАЯ ВИНТОВКА', mag: 5, reserve: 30, damage: 95, fireRate: 1150, reload: 2600, spread: 0.002, pellets: 1, range: 180 },
    pistol: { name: 'ПИСТОЛЕТ', mag: 12, reserve: 72, damage: 24, fireRate: 260, reload: 1250, spread: 0.018, pellets: 1, range: 55 }
  }
};
