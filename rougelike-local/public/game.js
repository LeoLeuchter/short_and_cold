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
  FLOOR: 1,
  DOOR: 2
};

const COLORS = {
  WALL: '#2d3748',
  FLOOR: '#4a5568',
  DOOR: '#805ad5',
  PLAYER: '#00ffcc',
  ENEMY: '#ff6b6b',
  ITEM_MEDKIT: '#51cf66',
  ITEM_BATTERY: '#ffd43b',
  ITEM_EMP: '#748ffc',
  FOG: 'rgba(0, 0, 0, 0.7)',
  EXPLORED: 'rgba(0, 0, 0, 0.4)'
};

// ============================================================================
// GLOBALE VARIABLEN
// ============================================================================

let canvas, ctx;
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
  explored: [], // Welche Tiles wurden schon gesehen
  visible: [],  // Welche Tiles sind aktuell sichtbar
  debugMode: false
};

// ============================================================================
// INITIALISIERUNG
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  // Seed setzen
  game.seed = getSeedFromURL();
  game.rng = new SeededRandom(game.seed);
  document.getElementById('seed-display').textContent = game.seed;
  
  // Spiel initialisieren
  initGame();
  
  // Event Listener
  document.addEventListener('keydown', handleInput);
  document.getElementById('restart-button').addEventListener('click', restartGame);
  
  // Ersten Frame rendern
  render();
  
  addMessage('Spiel gestartet. Seed: ' + game.seed);
});

function initGame() {
  game.gameOver = false;
  game.turn = 0;
  game.enemies = [];
  game.items = [];
  
  // Map generieren
  generateMap();
  
  // Spieler erstellen
  const startRoom = game.rooms[0];
  game.player = {
    x: Math.floor(startRoom.x + startRoom.w / 2),
    y: Math.floor(startRoom.y + startRoom.h / 2),
    hp: 100,
    maxHp: 100,
    inventory: [null, null, null],
    attack: 10
  };
  
  // Gegner spawnen
  spawnEnemies();
  
  // Items spawnen
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
// MAP GENERATION (BSP + Raum-Korridor-Algorithmus)
// ============================================================================

function generateMap() {
  // Leere Map initialisieren (alles Wände)
  game.map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    game.map[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      game.map[y][x] = TILE_TYPES.WALL;
    }
  }
  
  game.rooms = [];
  
  // Räume generieren
  for (let i = 0; i < MAX_ROOMS; i++) {
    const w = game.rng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const h = game.rng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const x = game.rng.nextRange(1, MAP_WIDTH - w - 1);
    const y = game.rng.nextRange(1, MAP_HEIGHT - h - 1);
    
    const newRoom = { x, y, w, h };
    
    // Prüfen ob Raum mit existierenden überlappt
    let overlaps = false;
    for (const room of game.rooms) {
      if (roomsIntersect(newRoom, room)) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      carveRoom(newRoom);
      
      // Korridor zum vorherigen Raum
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
  
  // Horizontaler Korridor
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  for (let x = startX; x <= endX; x++) {
    if (y1 >= 0 && y1 < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
      game.map[y1][x] = TILE_TYPES.FLOOR;
    }
  }
  
  // Vertikaler Korridor
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);
  for (let y = startY; y <= endY; y++) {
    if (x2 >= 0 && x2 < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      game.map[y][x2] = TILE_TYPES.FLOOR;
    }
  }
}

function roomsIntersect(room1, room2) {
  return (room1.x <= room2.x + room2.w + 1 &&
          room1.x + room1.w + 1 >= room2.x &&
          room1.y <= room2.y + room2.h + 1 &&
          room1.y + room1.h + 1 >= room2.y);
}

// ============================================================================
// ENTITÄTEN SPAWNEN
// ============================================================================

function spawnEnemies() {
  const numEnemies = game.rng.nextRange(5, 10);
  
  for (let i = 0; i < numEnemies; i++) {
    const room = game.rooms[game.rng.nextRange(1, game.rooms.length)]; // Nicht im ersten Raum
    const x = game.rng.nextRange(room.x, room.x + room.w);
    const y = game.rng.nextRange(room.y, room.y + room.h);
    
    if (game.map[y][x] === TILE_TYPES.FLOOR && !isPositionOccupied(x, y)) {
      game.enemies.push({
        x, y,
        hp: 30,
        maxHp: 30,
        attack: 5,
        type: 'drone'
      });
    }
  }
  
  console.log(`${game.enemies.length} Gegner gespawnt`);
}

function spawnItems() {
  const itemTypes = [
    { type: 'medkit', count: 3 },
    { type: 'battery', count: 2 },
    { type: 'emp', count: 2 }
  ];
  
  itemTypes.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const room = game.rooms[game.rng.nextRange(1, game.rooms.length)];
      const x = game.rng.nextRange(room.x, room.x + room.w);
      const y = game.rng.nextRange(room.y, room.y + room.h);
      
      if (game.map[y][x] === TILE_TYPES.FLOOR && !isPositionOccupied(x, y)) {
        game.items.push({ x, y, type });
      }
    }
  });
  
  console.log(`${game.items.length} Items gespawnt`);
}

// ============================================================================
// FIELD OF VIEW (einfacher Raycasting-Ansatz)
// ============================================================================

function updateFOV() {
  // Alle Tiles als nicht sichtbar markieren
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      game.visible[y][x] = false;
    }
  }
  
  // Sichtbare Tiles markieren
  const px = game.player.x;
  const py = game.player.y;
  
  for (let y = py - FOV_RADIUS; y <= py + FOV_RADIUS; y++) {
    for (let x = px - FOV_RADIUS; x <= px + FOV_RADIUS; x++) {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) continue;
      
      const dist = distance(px, py, x, y);
      if (dist <= FOV_RADIUS) {
        // Einfacher FOV: Prüfe ob Sichtlinie frei (vereinfacht)
        if (hasLineOfSight(px, py, x, y)) {
          game.visible[y][x] = true;
          game.explored[y][x] = true;
        }
      }
    }
  }
}

function hasLineOfSight(x0, y0, x1, y1) {
  // Bresenham-ähnlicher Algorithmus (vereinfacht)
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
  if (game.gameOver) return;
  
  let dx = 0, dy = 0;
  let action = null;
  
  // Bewegung
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    dy = -1;
  } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
    dy = 1;
  } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    dx = -1;
  } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    dx = 1;
  }
  
  // Item aufheben
  else if (e.key === 'e' || e.key === 'E') {
    action = 'pickup';
  }
  
  // Item benutzen
  else if (e.key === '1' || e.key === '2' || e.key === '3') {
    const slot = parseInt(e.key) - 1;
    action = 'use';
    useItem(slot);
    return;
  }
  
  // Debug Toggle
  else if (e.key === '~' || e.key === '`') {
    toggleDebug();
    return;
  }
  
  // Spielzug ausführen
  if (dx !== 0 || dy !== 0) {
    movePlayer(dx, dy);
    enemyTurn();
    game.turn++;
    updateFOV();
    updateDebug();
  } else if (action === 'pickup') {
    pickupItem();
  }
  
  render();
}

function movePlayer(dx, dy) {
  const newX = game.player.x + dx;
  const newY = game.player.y + dy;
  
  // Prüfe Kollision mit Wänden
  if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
  if (game.map[newY][newX] === TILE_TYPES.WALL) return;
  
  // Prüfe Kollision mit Gegnern -> Angriff
  const enemy = getEnemyAt(newX, newY);
  if (enemy) {
    attackEnemy(enemy);
    return;
  }
  
  // Bewege Spieler
  game.player.x = newX;
  game.player.y = newY;
}

function attackEnemy(enemy) {
  const damage = game.player.attack + game.rng.nextRange(-2, 3);
  enemy.hp -= damage;
  addMessage(`Du greifst Drohne an: ${damage} Schaden!`, 'combat');
  
  if (enemy.hp <= 0) {
    addMessage('Drohne zerstört!', 'combat');
    game.enemies = game.enemies.filter(e => e !== enemy);
  }
}

function enemyTurn() {
  game.enemies.forEach(enemy => {
    const dist = distance(enemy.x, enemy.y, game.player.x, game.player.y);
    
    // Wenn Spieler in Sichtweite, bewege dich zu ihm
    if (dist < FOV_RADIUS && game.visible[enemy.y][enemy.x]) {
      moveEnemyTowardsPlayer(enemy);
    } else {
      // Zufällige Bewegung
      const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
      const dir = game.rng.choice(dirs);
      const newX = enemy.x + dir[0];
      const newY = enemy.y + dir[1];
      
      if (isWalkable(newX, newY) && !isPositionOccupied(newX, newY)) {
        enemy.x = newX;
        enemy.y = newY;
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
  
  // Wenn auf Spieler-Position -> Angriff
  if (newX === game.player.x && newY === game.player.y) {
    const damage = enemy.attack + game.rng.nextRange(-1, 2);
    game.player.hp -= damage;
    addMessage(`Drohne greift an: ${damage} Schaden erhalten!`, 'combat');
    
    if (game.player.hp <= 0) {
      gameOver();
    }
    
    updateHUD();
    return;
  }
  
  // Sonst bewegen
  if (isWalkable(newX, newY) && !isPositionOccupied(newX, newY)) {
    enemy.x = newX;
    enemy.y = newY;
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
  
  // Freien Slot finden
  const emptySlot = game.player.inventory.findIndex(slot => slot === null);
  if (emptySlot === -1) {
    addMessage('Inventar voll!', 'item');
    return;
  }
  
  game.player.inventory[emptySlot] = item.type;
  game.items = game.items.filter(i => i !== item);
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
      addMessage(`Medkit benutzt: +${healAmount} HP`, 'item');
      break;
      
    case 'battery':
      game.player.maxHp += 10;
      game.player.hp += 10;
      addMessage('Batterie benutzt: +10 Max HP', 'item');
      break;
      
    case 'emp':
      // EMP: Schade alle Gegner in Sichtweite
      let empCount = 0;
      game.enemies.forEach(enemy => {
        if (game.visible[enemy.y][enemy.x]) {
          enemy.hp -= 20;
          empCount++;
          if (enemy.hp <= 0) {
            game.enemies = game.enemies.filter(e => e !== enemy);
          }
        }
      });
      addMessage(`EMP ausgelöst: ${empCount} Drohnen beschädigt!`, 'combat');
      break;
  }
  
  game.player.inventory[slot] = null;
  updateInventoryDisplay();
  updateHUD();
  
  // Gegner-Zug nach Item-Nutzung
  enemyTurn();
  game.turn++;
  updateFOV();
  render();
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
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const camX = Math.max(0, Math.min(game.player.x - Math.floor(canvas.width / TILE_SIZE / 2), MAP_WIDTH - Math.floor(canvas.width / TILE_SIZE)));
  const camY = Math.max(0, Math.min(game.player.y - Math.floor(canvas.height / TILE_SIZE / 2), MAP_HEIGHT - Math.floor(canvas.height / TILE_SIZE)));
  
  // Map rendern
  for (let y = 0; y < Math.ceil(canvas.height / TILE_SIZE); y++) {
    for (let x = 0; x < Math.ceil(canvas.width / TILE_SIZE); x++) {
      const mapX = camX + x;
      const mapY = camY + y;
      
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        const tile = game.map[mapY][mapX];
        const explored = game.explored[mapY][mapX];
        const visible = game.visible[mapY][mapX];
        
        if (!explored) continue;
        
        // Tile zeichnen
        if (tile === TILE_TYPES.WALL) {
          ctx.fillStyle = COLORS.WALL;
        } else if (tile === TILE_TYPES.FLOOR) {
          ctx.fillStyle = COLORS.FLOOR;
        }
        
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Fog of War
        if (!visible) {
          ctx.fillStyle = COLORS.EXPLORED;
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
  
  // Items rendern
  game.items.forEach(item => {
    const screenX = (item.x - camX) * TILE_SIZE;
    const screenY = (item.y - camY) * TILE_SIZE;
    
    if (game.visible[item.y][item.x]) {
      let color = COLORS.ITEM_MEDKIT;
      if (item.type === 'battery') color = COLORS.ITEM_BATTERY;
      if (item.type === 'emp') color = COLORS.ITEM_EMP;
      
      ctx.fillStyle = color;
      ctx.fillRect(screenX + 8, screenY + 8, 16, 16);
    }
  });
  
  // Gegner rendern
  game.enemies.forEach(enemy => {
    const screenX = (enemy.x - camX) * TILE_SIZE;
    const screenY = (enemy.y - camY) * TILE_SIZE;
    
    if (game.visible[enemy.y][enemy.x]) {
      ctx.fillStyle = COLORS.ENEMY;
      ctx.fillRect(screenX + 4, screenY + 4, 24, 24);
      
      // HP-Bar
      const hpPercent = enemy.hp / enemy.maxHp;
      ctx.fillStyle = '#2d2d2d';
      ctx.fillRect(screenX, screenY - 4, TILE_SIZE, 3);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(screenX, screenY - 4, TILE_SIZE * hpPercent, 3);
    }
  });
  
  // Spieler rendern
  const playerScreenX = (game.player.x - camX) * TILE_SIZE;
  const playerScreenY = (game.player.y - camY) * TILE_SIZE;
  ctx.fillStyle = COLORS.PLAYER;
  ctx.fillRect(playerScreenX + 6, playerScreenY + 6, 20, 20);
}

function updateHUD() {
  document.getElementById('player-hp').textContent = Math.max(0, game.player.hp);
  document.getElementById('player-max-hp').textContent = game.player.maxHp;
  document.getElementById('current-level').textContent = 1;
}

function updateInventoryDisplay() {
  for (let i = 0; i < 3; i++) {
    const slot = document.querySelector(`[data-slot="${i}"]`);
    const item = game.player.inventory[i];
    
    if (item) {
      slot.textContent = item.toUpperCase();
      slot.classList.add('has-item');
    } else {
      slot.textContent = 'Leer';
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
    `Du wurdest von Drohnen überwältigt. Überlebt: ${game.turn} Züge.`;
}

function restartGame() {
  document.getElementById('game-over').classList.add('hidden');
  
  // Neuen Seed generieren
  game.seed = Date.now();
  game.rng = new SeededRandom(game.seed);
  document.getElementById('seed-display').textContent = game.seed;
  
  // Log leeren
  document.getElementById('message-log').innerHTML = '';
  
  initGame();
  render();
  addMessage('Neues Spiel gestartet. Seed: ' + game.seed);
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
    <div><strong>Player Pos:</strong> (${game.player.x}, ${game.player.y})</div>
    <div><strong>Player HP:</strong> ${game.player.hp}/${game.player.maxHp}</div>
    <div><strong>Enemies:</strong> ${game.enemies.length}</div>
    <div><strong>Items:</strong> ${game.items.length}</div>
    <div><strong>Rooms:</strong> ${game.rooms.length}</div>
    <div><strong>Map Size:</strong> ${MAP_WIDTH}x${MAP_HEIGHT}</div>
  `;
}

// ============================================================================
// EINFACHER TEST (Console Output)
// ============================================================================

/**
 * Testet ob Map-Generator mindestens 100 begehbare Tiles erzeugt
 */
function testMapGeneration() {
  const testRng = new SeededRandom(12345);
  const oldRng = game.rng;
  game.rng = testRng;
  
  generateMap();
  
  let walkableTiles = 0;
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (game.map[y][x] === TILE_TYPES.FLOOR) {
        walkableTiles++;
      }
    }
  }
  
  console.log(`✓ Map-Test: ${walkableTiles} begehbare Tiles generiert (Minimum: 100)`);
  
  game.rng = oldRng;
  return walkableTiles >= 100;
}

// Test beim Laden ausführen
window.addEventListener('load', () => {
  setTimeout(() => testMapGeneration(), 1000);
});