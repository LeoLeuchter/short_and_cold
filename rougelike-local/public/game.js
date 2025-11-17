// FILE: public/game.js

// ============================================================================
// KONSTANTEN & KONFIGURATION
// ============================================================================

const TILE_SIZE = 32;
const MAP_WIDTH = 50;
const MAP_HEIGHT = 40;
const ROOM_MIN_SIZE = 5;
const ROOM_MAX_SIZE = 12;
const MAX_ROOMS = 15;
const FOV_RADIUS = 8;

const TILE_TYPES = {
  WALL: 0,
  FLOOR: 1
};

// ============================================================================
// GLOBALE VARIABLEN
// ============================================================================

let canvas, ctx, renderer;
let tweenManager, particleSystem;
let lastFrameTime = 0;

let game = {
  map: [],
  rooms: [],
  player: null,
  enemies: [],
  items: [],
  seed: 0,
  rng: null,
  gameOver: false,
  turn: 0,
  kills: 0,
  explored: [],
  visible: [],
  debugMode: false
};

// ============================================================================
// INITIALISIERUNG
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  renderer = new Renderer(canvas, ctx, TILE_SIZE);
  tweenManager = new TweenManager();
  particleSystem = new ParticleSystem();
  
  // Seed setzen
  game.seed = getSeedFromURL();
  game.rng = new SeededRandom(game.seed);
  document.getElementById('seed-display').textContent = game.seed;
  
  // Spiel initialisieren
  initGame();
  
  // Event Listener
  document.addEventListener('keydown', handleInput);
  document.getElementById('restart-button').addEventListener('click', restartGame);
  document.getElementById('new-seed-button').addEventListener('click', restartWithNewSeed);
  
  // Debug DevCheck
  const devCheckBtn = document.getElementById('run-devcheck');
  if (devCheckBtn) {
    devCheckBtn.addEventListener('click', () => {
      const result = devCheck();
      alert(`DevCheck ${result.passed ? 'BESTANDEN' : 'FEHLGESCHLAGEN'}\n\nRäume: ${result.rooms}\nFloor Tiles: ${result.floorTiles}\nItems: ${result.items}\nItems auf Wänden: ${result.itemsOnWalls}`);
    });
  }
  
  // Game Loop starten
  requestAnimationFrame(gameLoop);
  
  addMessage('Spiel gestartet. Seed: ' + game.seed);
});

function initGame() {
  game.gameOver = false;
  game.turn = 0;
  game.kills = 0;
  game.enemies = [];
  game.items = [];
  
  tweenManager.clear();
  particleSystem.clear();
  
  // Map generieren
  generateMap();
  
  // Spieler erstellen
  const startRoom = game.rooms[0];
  game.player = {
    x: Math.floor(startRoom.x + startRoom.w / 2),
    y: Math.floor(startRoom.y + startRoom.h / 2),
    renderX: undefined,
    renderY: undefined,
    hp: 100,
    maxHp: 100,
    inventory: [null, null, null],
    attack: 10
  };
  
  game.player.renderX = game.player.x;
  game.player.renderY = game.player.y;
  
  // Gegner spawnen
  spawnEnemies();
  
  // Items spawnen (FIX: Nur auf Floor-Tiles)
  spawnItems();
  
  // FOV initialisieren
  initFOV();
  updateFOV();
  
  // UI aktualisieren
  updateHUD();
  updateInventoryDisplay();
}

function initFOV() {
  game.explored = [];
  game.visible = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    game.explored[y] = [];
    game.visible[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      game.explored[y][x] = false;
      game.visible[y][x] = false;
    }
  }
}

// ============================================================================
// GAME LOOP (für Animationen)
// ============================================================================

function gameLoop(timestamp) {
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  
  // Update Animationen
  tweenManager.update(deltaTime);
  particleSystem.update(deltaTime);
  
  // Render
  render();
  
  requestAnimationFrame(gameLoop);
}

// ============================================================================
// MAP GENERATION
// ============================================================================

function generateMap() {
  game.map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    game.map[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      game.map[y][x] = TILE_TYPES.WALL;
    }
  }
  
  game.rooms = [];
  
  for (let i = 0; i < MAX_ROOMS; i++) {
    const w = game.rng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const h = game.rng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const x = game.rng.nextRange(1, MAP_WIDTH - w - 1);
    const y = game.rng.nextRange(1, MAP_HEIGHT - h - 1);
    
    const newRoom = { x, y, w, h };
    
    let overlaps = false;
    for (const room of game.rooms) {
      if (roomsIntersect(newRoom, room)) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      carveRoom(newRoom);
      
      if (game.rooms.length > 0) {
        const prevRoom = game.rooms[game.rooms.length - 1];
        connectRooms(prevRoom, newRoom);
      }
      
      game.rooms.push(newRoom);
    }
  }
  
  console.log(`Map generiert: ${game.rooms.length} Räume`);
}

function carveRoom(room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        game.map[y][x] = TILE_TYPES.FLOOR;
      }
    }
  }
}

function connectRooms(room1, room2) {
  const x1 = Math.floor(room1.x + room1.w / 2);
  const y1 = Math.floor(room1.y + room1.h / 2);
  const x2 = Math.floor(room2.x + room2.w / 2);
  const y2 = Math.floor(room2.y + room2.h / 2);
  
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  for (let x = startX; x <= endX; x++) {
    if (y1 >= 0 && y1 < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
      game.map[y1][x] = TILE_TYPES.FLOOR;
    }
  }
  
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);
  for (let y = startY; y <= endY; y++) {
    if (x2 >= 0 && x2 < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      game.map[y][x2] = TILE_TYPES.FLOOR;
    }
  }
}

// ============================================================================
// ENTITÄTEN SPAWNEN
// ============================================================================

function spawnEnemies() {
  const numEnemies = game.rng.nextRange(5, 10);
  
  for (let i = 0; i < numEnemies; i++) {
    const roomIndex = game.rng.nextRange(1, game.rooms.length);
    const room = game.rooms[roomIndex];
    
    let attempts = 0;
    let spawned = false;
    
    while (attempts < 50 && !spawned) {
      const x = game.rng.nextRange(room.x, room.x + room.w);
      const y = game.rng.nextRange(room.y, room.y + room.h);
      
      if (game.map[y][x] === TILE_TYPES.FLOOR && !isPositionOccupied(x, y)) {
        game.enemies.push({
          x, y,
          renderX: x,
          renderY: y,
          hp: 30,
          maxHp: 30,
          attack: 5,
          type: 'drone'
        });
        spawned = true;
      }
      attempts++;
    }
  }
  
  console.log(`${game.enemies.length} Gegner gespawnt`);
}

function spawnItems() {
  // FIX: Items spawnen nur auf Floor-Tiles, mit Retry-Logik
  const itemTypes = [
    { type: 'medkit', count: 3 },
    { type: 'battery', count: 2 },
    { type: 'emp', count: 2 }
  ];
  
  itemTypes.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const roomIndex = game.rng.nextRange(1, game.rooms.length);
      const room = game.rooms[roomIndex];
      
      let attempts = 0;
      let spawned = false;
      
      while (attempts < 50 && !spawned) {
        const x = game.rng.nextRange(room.x, room.x + room.w);
        const y = game.rng.nextRange(room.y, room.y + room.h);
        
        if (game.map[y][x] === TILE_TYPES.FLOOR && !isPositionOccupied(x, y)) {
          game.items.push({ x, y, type });
          spawned = true;
        }
        attempts++;
      }
    }
  });
  
  console.log(`${game.items.length} Items gespawnt`);
}

// ============================================================================
// FIELD OF VIEW
// ============================================================================

function updateFOV() {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      game.visible[y][x] = false;
    }
  }
  
  const px = game.player.x;
  const py = game.player.y;
  
  for (let y = py - FOV_RADIUS; y <= py + FOV_RADIUS; y++) {
    for (let x = px - FOV_RADIUS; x <= px + FOV_RADIUS; x++) {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) continue;
      
      const dist = distance(px, py, x, y);
      if (dist <= FOV_RADIUS && hasLineOfSight(px, py, x, y)) {
        game.visible[y][x] = true;
        game.explored[y][x] = true;
      }
    }
  }
}

function hasLineOfSight(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  let x = x0;
  let y = y0;
  
  while (true) {
    if (x === x1 && y === y1) return true;
    if (game.map[y][x] === TILE_TYPES.WALL) return false;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

function handleInput(e) {
  if (game.gameOver) {
    if (e.key === 'r' || e.key === 'R') {
      restartGame();
    }
    return;
  }
  
  // Keine Eingabe während Animationen
  if (tweenManager.isAnimating()) return;
  
  let dx = 0, dy = 0;
  let action = null;
  
  // FIX: Bewegung konsistent für WASD UND Pfeiltasten
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    dy = -1;
  } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
    dy = 1;
  } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    dx = -1;
  } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    dx = 1;
  } else if (e.key === 'e' || e.key === 'E') {
    action = 'pickup';
  } else if (e.key === '1' || e.key === '2' || e.key === '3') {
    const slot = parseInt(e.key) - 1;
    useItem(slot);
    return;
  } else if (e.key === 'r' || e.key === 'R') {
    restartGame();
    return;
  } else if (e.key === '~' || e.key === '`') {
    toggleDebug();
    return;
  }
  
  if (dx !== 0 || dy !== 0) {
    movePlayer(dx, dy);
    enemyTurn();
    game.turn++;
    updateFOV();
    updateDebug();
  } else if (action === 'pickup') {
    pickupItem();
  }
}

function movePlayer(dx, dy) {
  const newX = game.player.x + dx;
  const newY = game.player.y + dy;
  
  if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
  if (game.map[newY][newX] === TILE_TYPES.WALL) return;
  
  const enemy = getEnemyAt(newX, newY);
  if (enemy) {
    attackEnemy(enemy);
    return;
  }
  
  game.player.x = newX;
  game.player.y = newY;
  
  // Animate movement
  tweenManager.add(game.player, newX, newY, 120);
}

function attackEnemy(enemy) {
  const damage = game.player.attack + game.rng.nextRange(-2, 3);
  enemy.hp -= damage;
  
  particleSystem.createHitEffect(enemy.x + 0.5, enemy.y + 0.5);
  particleSystem.showDamage(enemy.x, enemy.y, damage, false);
  
  addMessage(`Du greifst Drohne an: ${damage} Schaden!`, 'combat');
  
  if (enemy.hp <= 0) {
    addMessage('Drohne zerstört!', 'combat');
    particleSystem.createExplosion(enemy.x + 0.5, enemy.y + 0.5, '#ff6b6b', 16);
    game.enemies = game.enemies.filter(e => e !== enemy);
    game.kills++;
    document.getElementById('kill-count').textContent = game.kills;
  }
}

function enemyTurn() {
  game.enemies.forEach(enemy => {
    const dist = distance(enemy.x, enemy.y, game.player.x, game.player.y);
    
    if (dist < FOV_RADIUS && game.visible[enemy.y][enemy.x]) {
      moveEnemyTowardsPlayer(enemy);
    } else {
      const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
      const dir = game.rng.choice(dirs);
      const newX = enemy.x + dir[0];
      const newY = enemy.y + dir[1];
      
      if (isWalkable(newX, newY) && !isPositionOccupied(newX, newY)) {
        enemy.x = newX;
        enemy.y = newY;
        tweenManager.add(enemy, newX, newY, 150);
      }
    }
  });
}

function moveEnemyTowardsPlayer(enemy) {
  const dx = game.player.x - enemy.x;
  const dy = game.player.y - enemy.y;
  
  let moveX = 0, moveY = 0;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    moveX = dx > 0 ? 1 : -1;
  } else {
    moveY = dy > 0 ? 1 : -1;
  }
  
  const newX = enemy.x + moveX;
  const newY = enemy.y + moveY;
  
  if (newX === game.player.x && newY === game.player.y) {
    const damage = enemy.attack + game.rng.nextRange(-1, 2);
    game.player.hp -= damage;
    
    particleSystem.createHitEffect(game.player.x + 0.5, game.player.y + 0.5);
    particleSystem.showDamage(game.player.x, game.player.y, damage, true);
    
    addMessage(`Drohne greift an: ${damage} Schaden erhalten!`, 'combat');
    
    if (game.player.hp <= 0) {
      gameOver();
    }
    
    updateHUD();
    return;
  }
  
  if (isWalkable(newX, newY) && !isPositionOccupied(newX, newY)) {
    enemy.x = newX;
    enemy.y = newY;
    tweenManager.add(enemy, newX, newY, 150);
  }
}

// ============================================================================
// ITEMS
// ============================================================================

function pickupItem() {
  const item = game.items.find(i => i.x === game.player.x && i.y === game.player.y);
  if (!item) {
    addMessage('Hier ist kein Item.', 'item');
    return;
  }
  
  const emptySlot = game.player.inventory.findIndex(slot => slot === null);
  if (emptySlot === -1) {
    addMessage('Inventar voll!', 'warning');
    return;
  }
  
  game.player.inventory[emptySlot] = item.type;
  game.items = game.items.filter(i => i !== item);
  
  let color = '#51cf66';
  if (item.type === 'battery') color = '#ffd43b';
  if (item.type === 'emp') color = '#748ffc';
  
  particleSystem.createPickup(item.x + 0.5, item.y + 0.5, color);
  addMessage(`${item.type.toUpperCase()} aufgehoben!`, 'item');
  updateInventoryDisplay();
}

function useItem(slot) {
  const item = game.player.inventory[slot];
  if (!item) {
    addMessage('Slot ist leer.', 'item');
    return;
  }
  
  switch(item) {
    case 'medkit':
      const healAmount = 30;
      game.player.hp = Math.min(game.player.hp + healAmount, game.player.maxHp);
      particleSystem.createPickup(game.player.x + 0.5, game.player.y + 0.5, '#51cf66');
      addMessage(`Medkit benutzt: +${healAmount} HP`, 'item');
      break;
      
    case 'battery':
      game.player.maxHp += 10;
      game.player.hp += 10;
      particleSystem.createPickup(game.player.x + 0.5, game.player.y + 0.5, '#ffd43b');
      addMessage('Batterie benutzt: +10 Max HP', 'item');
      break;
      
    case 'emp':
      let empCount = 0;
      game.enemies.forEach(enemy => {
        if (game.visible[enemy.y][enemy.x]) {
          enemy.hp -= 20;
          particleSystem.createExplosion(enemy.x + 0.5, enemy.y + 0.5, '#748ffc', 12);
          empCount++;
          if (enemy.hp <= 0) {
            game.enemies = game.enemies.filter(e => e !== enemy);
            game.kills++;
          }
        }
      });
      addMessage(`EMP ausgelöst: ${empCount} Drohnen beschädigt!`, 'combat');
      document.getElementById('kill-count').textContent = game.kills;
      break;
    }
  game.player.inventory[slot] = null;
  updateInventoryDisplay();
  updateHUD();
  
  // Gegner-Zug nach Item-Nutzung
  enemyTurn();
  game.turn++;
  updateFOV();
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function isWalkable(x, y) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  return game.map[y][x] !== TILE_TYPES.WALL;
}

function isPositionOccupied(x, y) {
  if (game.player.x === x && game.player.y === y) return true;
  if (game.enemies.some(e => e.x === x && e.y === y)) return true;
  return false;
}

function getEnemyAt(x, y) {
  return game.enemies.find(e => e.x === x && e.y === y);
}

// ============================================================================
// UI & RENDERING
// ============================================================================

function render() {
  renderer.clear();
  
  const camera = renderer.calculateCamera(game.player, MAP_WIDTH, MAP_HEIGHT);
  
  // Map rendern
  renderer.renderMap(game.map, game.explored, game.visible, camera);
  
  // Items rendern
  renderer.renderItems(game.items, game.visible, camera);
  
  // Gegner rendern
  renderer.renderEnemies(game.enemies, game.visible, camera);
  
  // Spieler rendern
  renderer.renderPlayer(game.player, camera);
  
  // Partikel rendern
  particleSystem.render(ctx, camera.camX, camera.camY, TILE_SIZE);
}

function updateHUD() {
  document.getElementById('player-hp').textContent = Math.max(0, game.player.hp);
  document.getElementById('player-max-hp').textContent = game.player.maxHp;
  document.getElementById('current-level').textContent = 1;
  document.getElementById('kill-count').textContent = game.kills;
}

function updateInventoryDisplay() {
  for (let i = 0; i < 3; i++) {
    const slot = document.querySelector(`[data-slot="${i}"]`);
    const slotContent = slot.querySelector('.slot-content');
    const item = game.player.inventory[i];
    
    if (item) {
      slotContent.textContent = item.toUpperCase();
      slot.classList.add('has-item');
    } else {
      slotContent.textContent = 'Leer';
      slot.classList.remove('has-item');
    }
  }
}

function addMessage(text, type = '') {
  const log = document.getElementById('message-log');
  const msg = document.createElement('div');
  msg.className = 'message ' + type;
  msg.textContent = text;
  log.appendChild(msg);
  log.scrollTop = log.scrollHeight;
  
  // Maximal 20 Nachrichten
  while (log.children.length > 20) {
    log.removeChild(log.firstChild);
  }
}

// ============================================================================
// GAME OVER & RESTART
// ============================================================================

function gameOver() {
  game.gameOver = true;
  document.getElementById('game-over').classList.remove('hidden');
  document.getElementById('death-message').textContent = 
    `Du wurdest von Drohnen überwältigt.`;
  document.getElementById('final-kills').textContent = game.kills;
  document.getElementById('final-turns').textContent = game.turn;
}

function restartGame() {
  document.getElementById('game-over').classList.add('hidden');
  
  // Gleicher Seed, neue Partie
  game.rng = new SeededRandom(game.seed);
  
  // Log leeren
  document.getElementById('message-log').innerHTML = '';
  
  initGame();
  addMessage('Neues Spiel gestartet. Seed: ' + game.seed);
}

function restartWithNewSeed() {
  document.getElementById('game-over').classList.add('hidden');
  
  // Neuen Seed generieren
  game.seed = Date.now();
  game.rng = new SeededRandom(game.seed);
  document.getElementById('seed-display').textContent = game.seed;
  
  // Log leeren
  document.getElementById('message-log').innerHTML = '';
  
  initGame();
  addMessage('Neues Spiel mit neuem Seed gestartet: ' + game.seed);
}

// ============================================================================
// DEBUG
// ============================================================================

function toggleDebug() {
  game.debugMode = !game.debugMode;
  const panel = document.getElementById('debug-panel');
  
  if (game.debugMode) {
    panel.classList.remove('hidden');
    updateDebug();
  } else {
    panel.classList.add('hidden');
  }
}

function updateDebug() {
  if (!game.debugMode) return;
  
  const content = document.getElementById('debug-content');
  content.innerHTML = `
    <div><strong>Seed:</strong> ${game.seed}</div>
    <div><strong>Turn:</strong> ${game.turn}</div>
    <div><strong>Kills:</strong> ${game.kills}</div>
    <div><strong>Player Pos:</strong> (${game.player.x}, ${game.player.y})</div>
    <div><strong>Player HP:</strong> ${game.player.hp}/${game.player.maxHp}</div>
    <div><strong>Enemies:</strong> ${game.enemies.length}</div>
    <div><strong>Items:</strong> ${game.items.length}</div>
    <div><strong>Rooms:</strong> ${game.rooms.length}</div>
    <div><strong>Map Size:</strong> ${MAP_WIDTH}x${MAP_HEIGHT}</div>
    <div><strong>Tweens Active:</strong> ${tweenManager.tweens.length}</div>
    <div><strong>Particles:</strong> ${particleSystem.particles.length}</div>
    <div><strong>Damage Numbers:</strong> ${particleSystem.damageNumbers.length}</div>
  `;
}