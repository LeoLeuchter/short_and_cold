// FILE: public/renderer.js

/**
 * Render-System für Canvas
 * Zeichnet Map, Entities, Partikel mit FOV und Animationen
 */

class Renderer {
  constructor(canvas, ctx, tileSize) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.tileSize = tileSize;
    
    this.colors = {
      WALL: '#2d3748',
      FLOOR: '#4a5568',
      PLAYER: '#00ffcc',
      ENEMY: '#ff6b6b',
      ITEM_MEDKIT: '#51cf66',
      ITEM_BATTERY: '#ffd43b',
      ITEM_EMP: '#748ffc',
      FOG: 'rgba(0, 0, 0, 0.7)',
      EXPLORED: 'rgba(0, 0, 0, 0.5)'
    };
  }

  calculateCamera(player, mapWidth, mapHeight) {
    const tilesX = Math.floor(this.canvas.width / this.tileSize);
    const tilesY = Math.floor(this.canvas.height / this.tileSize);
    
    let camX = player.x - Math.floor(tilesX / 2);
    let camY = player.y - Math.floor(tilesY / 2);
    
    camX = Math.max(0, Math.min(camX, mapWidth - tilesX));
    camY = Math.max(0, Math.min(camY, mapHeight - tilesY));
    
    return { camX, camY, tilesX, tilesY };
  }

  renderMap(map, explored, visible, camera) {
    const { camX, camY, tilesX, tilesY } = camera;
    
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const mapX = camX + x;
        const mapY = camY + y;
        
        if (mapX < 0 || mapX >= map[0].length || mapY < 0 || mapY >= map.length) continue;
        
        const tile = map[mapY][mapX];
        const isExplored = explored[mapY][mapX];
        const isVisible = visible[mapY][mapX];
        
        if (!isExplored) continue;
        
        // Tile zeichnen
        this.ctx.fillStyle = tile === 0 ? this.colors.WALL : this.colors.FLOOR;
        this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        
        // Grid-Linien (optional)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        
        // Fog of War
        if (!isVisible) {
          this.ctx.fillStyle = this.colors.EXPLORED;
          this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
  }

  renderItems(items, visible, camera) {
    const { camX, camY } = camera;
    
    items.forEach(item => {
      if (!visible[item.y][item.x]) return;
      
      const screenX = (item.x - camX) * this.tileSize;
      const screenY = (item.y - camY) * this.tileSize;
      
      let color = this.colors.ITEM_MEDKIT;
      if (item.type === 'battery') color = this.colors.ITEM_BATTERY;
      if (item.type === 'emp') color = this.colors.ITEM_EMP;
      
      // Item mit Glow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = color;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(screenX + 8, screenY + 8, 16, 16);
      this.ctx.shadowBlur = 0;
    });
  }

  renderEnemies(enemies, visible, camera) {
    const { camX, camY } = camera;
    
    enemies.forEach(enemy => {
      if (!visible[enemy.y][enemy.x]) return;
      
      const renderX = enemy.renderX !== undefined ? enemy.renderX : enemy.x;
      const renderY = enemy.renderY !== undefined ? enemy.renderY : enemy.y;
      
      const screenX = (renderX - camX) * this.tileSize;
      const screenY = (renderY - camY) * this.tileSize;
      
      // Enemy-Body
      this.ctx.fillStyle = this.colors.ENEMY;
      this.ctx.fillRect(screenX + 4, screenY + 4, 24, 24);
      
      // HP-Bar
      const hpPercent = enemy.hp / enemy.maxHp;
      this.ctx.fillStyle = '#2d2d2d';
      this.ctx.fillRect(screenX, screenY - 4, this.tileSize, 3);
      this.ctx.fillStyle = hpPercent > 0.5 ? '#51cf66' : '#ff6b6b';
      this.ctx.fillRect(screenX, screenY - 4, this.tileSize * hpPercent, 3);
    });
  }

  renderPlayer(player, camera) {
    const { camX, camY } = camera;
    
    const renderX = player.renderX !== undefined ? player.renderX : player.x;
    const renderY = player.renderY !== undefined ? player.renderY : player.y;
    
    const screenX = (renderX - camX) * this.tileSize;
    const screenY = (renderY - camY) * this.tileSize;
    
    // Player mit Glow
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.colors.PLAYER;
    this.ctx.fillStyle = this.colors.PLAYER;
    this.ctx.fillRect(screenX + 6, screenY + 6, 20, 20);
    this.ctx.shadowBlur = 0;
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}