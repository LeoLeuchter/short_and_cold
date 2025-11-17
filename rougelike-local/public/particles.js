const screenX = (this.x - camX) * tileSize + tileSize / 2;
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