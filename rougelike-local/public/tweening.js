// FILE: public/tweening.js

/**
 * Einfaches Tweening-System für glatte Bewegungen
 * Entities haben display-Position (renderX, renderY) die interpoliert wird
 */

class Tween {
  constructor(entity, targetX, targetY, duration = 150) {
    this.entity = entity;
    this.startX = entity.renderX || entity.x;
    this.startY = entity.renderY || entity.y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.duration = duration;
    this.elapsed = 0;
    this.complete = false;
  }

  update(deltaTime) {
    this.elapsed += deltaTime;
    const progress = Math.min(this.elapsed / this.duration, 1);
    
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    
    this.entity.renderX = this.startX + (this.targetX - this.startX) * eased;
    this.entity.renderY = this.startY + (this.targetY - this.startY) * eased;
    
    if (progress >= 1) {
      this.entity.renderX = this.targetX;
      this.entity.renderY = this.targetY;
      this.complete = true;
    }
  }
}

class TweenManager {
  constructor() {
    this.tweens = [];
  }

  add(entity, targetX, targetY, duration) {
    // Entferne existierende Tweens für diese Entity
    this.tweens = this.tweens.filter(t => t.entity !== entity);
    
    const tween = new Tween(entity, targetX, targetY, duration);
    this.tweens.push(tween);
    return tween;
  }

  update(deltaTime) {
    this.tweens.forEach(tween => {
      if (!tween.complete) {
        tween.update(deltaTime);
      }
    });
    
    // Entferne abgeschlossene Tweens
    this.tweens = this.tweens.filter(t => !t.complete);
  }

  isAnimating() {
    return this.tweens.length > 0;
  }

  clear() {
    this.tweens = [];
  }
}