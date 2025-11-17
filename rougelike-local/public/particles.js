// FILE: public/particles.js

/**
 * Einfaches Partikelsystem für visuelle Effekte
 * Genutzt für: Item-Pickup, Enemy-Tod, Angriffe
 */

class Particle {
  constructor(x, y, vx, vy, color, lifetime = 1000, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.size = size;
    this.alive = true;
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime / 16;
    this.y += this.vy * deltaTime / 16;
    this.vy += 0.2; // Gravity
    this.lifetime -= deltaTime;

    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  render(ctx, camX, camY, tileSize) {
    const alpha = this.lifetime / this.maxLifetime;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    const screenX = (this.x - camX) * tileSize;
    const screenY = (this.y - camY) * tileSize;

    ctx.fillRect(screenX, screenY, this.size, this.size);
    ctx.globalAlpha = 1.0;
  }
}

class DamageNumber {
  constructor(x, y, damage, color = '#ff6b6b') {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.color = color;
    this.lifetime = 800;
    this.maxLifetime = 800;
    this.alive = true;
  }

  update(deltaTime) {
    this.y -= 0.05 * deltaTime / 16;
    this.lifetime -= deltaTime;

    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }

  render(ctx, camX, camY, tileSize) {
    const alpha = this.lifetime / this.maxLifetime;
    const scale = 1 + (1 - alpha) * 0.3;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${16 * scale}px 'Courier New'`;
    ctx.textAlign = 'center'; const screenX = (this.x - camX) * tileSize + tileSize / 2;
    const screenY = (this.y - camY) * tileSize;

    ctx.fillText(`-${this.damage}`, screenX, screenY);
    ctx.globalAlpha = 1.0;
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.damageNumbers = [];
  }

  createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.particles.push(new Particle(x, y, vx, vy, color, 600, 4));
    }
  }

  createPickup(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random();
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2;

      this.particles.push(new Particle(x, y, vx, vy, color, 800, 3));
    }
  }

  createHitEffect(x, y) {
    for (let i = 0; i < 6; i++) {
      const vx = (Math.random() - 0.5) * 3;
      const vy = (Math.random() - 0.5) * 3 - 1;

      this.particles.push(new Particle(x, y, vx, vy, '#ff6b6b', 400, 2));
    }
  }

  showDamage(x, y, damage, isPlayer = false) {
    const color = isPlayer ? '#ff6b6b' : '#00ffcc';
    this.damageNumbers.push(new DamageNumber(x, y, damage, color));
  }

  update(deltaTime) {
    this.particles.forEach(p => p.update(deltaTime));
    this.particles = this.particles.filter(p => p.alive);

    this.damageNumbers.forEach(d => d.update(deltaTime));
    this.damageNumbers = this.damageNumbers.filter(d => d.alive);
  }

  render(ctx, camX, camY, tileSize) {
    this.particles.forEach(p => p.render(ctx, camX, camY, tileSize));
    this.damageNumbers.forEach(d => d.render(ctx, camX, camY, tileSize));
  }

  clear() {
    this.particles = [];
    this.damageNumbers = [];
  }
}