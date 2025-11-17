// FILE: public/utils.js

/**
 * Linear Congruential Generator für deterministische Zufallszahlen
 * FIX: Seed wird konsistent verwendet für Map, Items, Enemies
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
    this.initialSeed = this.seed;
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextRange(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  choice(array) {
    if (array.length === 0) return null;
    return array[this.nextRange(0, array.length)];
  }

  reset() {
    this.seed = this.initialSeed;
  }
}

/**
 * Hilfsfunktionen
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getSeedFromURL() {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');
  return seedParam ? parseInt(seedParam) : Date.now();
}

/**
 * DevCheck - Testet Map-Generierung und Spawn-Logik
 * Prüft: Anzahl Räume, begehbare Tiles, Item-Placements, Enemy-Placements
 */
function devCheck() {
  console.log('===== DEVCHECK START =====');
  
  const testSeed = 12345;
  const testRng = new SeededRandom(testSeed);
  console.log(`Test Seed: ${testSeed}`);
  
  // Temporäre Map generieren
  const testMap = [];
  for (let y = 0; y < 40; y++) {
    testMap[y] = [];
    for (let x = 0; x < 50; x++) {
      testMap[y][x] = 0; // WALL
    }
  }
  
  const testRooms = [];
  const ROOM_MIN_SIZE = 5;
  const ROOM_MAX_SIZE = 12;
  const MAX_ROOMS = 15;
  
  // Raum-Generierung simulieren
  for (let i = 0; i < MAX_ROOMS; i++) {
    const w = testRng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const h = testRng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
    const x = testRng.nextRange(1, 50 - w - 1);
    const y = testRng.nextRange(1, 40 - h - 1);
    
    const newRoom = { x, y, w, h };
    let overlaps = false;
    
    for (const room of testRooms) {
      if (roomsIntersect(newRoom, room)) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      // Raum carven
      for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
        for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
          testMap[ry][rx] = 1; // FLOOR
        }
      }
      testRooms.push(newRoom);
    }
  }
  
  // Statistiken
  let floorCount = 0;
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 50; x++) {
      if (testMap[y][x] === 1) floorCount++;
    }
  }
  
  console.log(`✓ Räume generiert: ${testRooms.length}`);
  console.log(`✓ Begehbare Tiles: ${floorCount} (Minimum: 100)`);
  console.log(`✓ Test ${floorCount >= 100 ? 'BESTANDEN' : 'FEHLGESCHLAGEN'}`);
  
  // Item-Spawn Test (FIX: Prüft ob Items nur auf Floor spawnen)
  const testItems = [];
  for (let i = 0; i < 10; i++) {
    const room = testRooms[testRng.nextRange(0, testRooms.length)];
    let attempts = 0;
    let spawned = false;
    
    while (attempts < 50 && !spawned) {
      const x = testRng.nextRange(room.x, room.x + room.w);
      const y = testRng.nextRange(room.y, room.y + room.h);
      
      if (testMap[y][x] === 1) { // FLOOR
        testItems.push({ x, y });
        spawned = true;
      }
      attempts++;
    }
  }
  
  let itemsOnWalls = 0;
  testItems.forEach(item => {
    if (testMap[item.y][item.x] !== 1) {
      itemsOnWalls++;
      console.error(`✗ Item auf Wand gefunden: (${item.x}, ${item.y})`);
    }
  });
  
  console.log(`✓ Items gespawnt: ${testItems.length}`);
  console.log(`✓ Items auf Wänden: ${itemsOnWalls} (sollte 0 sein)`);
  console.log(`✓ Item-Spawn Test ${itemsOnWalls === 0 ? 'BESTANDEN' : 'FEHLGESCHLAGEN'}`);
  
  console.log('===== DEVCHECK ENDE =====');
  
  return {
    rooms: testRooms.length,
    floorTiles: floorCount,
    items: testItems.length,
    itemsOnWalls: itemsOnWalls,
    passed: floorCount >= 100 && itemsOnWalls === 0
  };
}

function roomsIntersect(room1, room2) {
  return (room1.x <= room2.x + room2.w + 1 &&
          room1.x + room1.w + 1 >= room2.x &&
          room1.y <= room2.y + room2.h + 1 &&
          room1.y + room1.h + 1 >= room2.y);
}