import { CONFIG } from './config.js';

export class CaptureSystem {
  constructor(zones, player, bots, onUpdate, onMessage, onEnd) {
    this.zones = zones;
    this.player = player;
    this.bots = bots;
    this.onUpdate = onUpdate;
    this.onMessage = onMessage;
    this.onEnd = onEnd;
    this.blue = 0;
    this.red = 0;
    this.last = performance.now();
    this.winner = null;
  }

  update(now) {
    if (this.winner) return;
    const dt = Math.min(.1, (now - this.last) / 1000);
    this.last = now;
    const radius = CONFIG.match.captureRadius;

    for (const zone of this.zones) {
      let blue = 0;
      let red = 0;
      if (Math.hypot(this.player.position.x - zone.x, this.player.position.z - zone.z) < radius) blue++;
      for (const bot of this.bots.bots) {
        if (!bot.alive) continue;
        const p = bot.group.position;
        if (Math.hypot(p.x - zone.x, p.z - zone.z) < radius) {
          if (bot.team === 1) blue++; else red++;
        }
      }
      zone.contested = blue > 0 && red > 0;
      if (!zone.contested && blue !== red) {
        const direction = blue > red ? 1 : -1;
        if (zone.owner !== direction) {
          zone.progress += direction * dt * CONFIG.match.captureRate;
          zone.progress = Math.max(-1, Math.min(1, zone.progress));
          if (zone.progress >= 1) zone.owner = 1;
          if (zone.progress <= -1) zone.owner = -1;
        } else {
          zone.progress = direction;
        }
      }
      zone.flag.material.color.setHex(zone.owner === 1 ? 0x477eaa : zone.owner === -1 ? 0xa34b42 : 0x8b928a);
      zone.ring.material.color.setHex(zone.contested ? 0xe0c46d : zone.owner === 1 ? 0x5d9fc9 : zone.owner === -1 ? 0xc66a5e : 0xc5b27c);
    }

    const bluePoints = this.zones.filter((z) => z.owner === 1).length;
    const redPoints = this.zones.filter((z) => z.owner === -1).length;
    this.blue += bluePoints * dt * CONFIG.match.scorePerSecond;
    this.red += redPoints * dt * CONFIG.match.scorePerSecond;
    if (this.blue >= CONFIG.match.targetScore || this.red >= CONFIG.match.targetScore) {
      this.winner = this.blue >= CONFIG.match.targetScore ? 'СИНИЕ' : 'КРАСНЫЕ';
      this.onEnd(this.winner, Math.floor(this.blue), Math.floor(this.red));
    }
    this.onUpdate(this.blue, this.red, this.zones);
  }
}
