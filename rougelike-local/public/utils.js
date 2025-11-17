// FILE: public/utils.js

/**
 * Linear Congruential Generator für deterministische Zufallszahlen
 * Basiert auf einem Seed, um reproduzierbare Maps zu erzeugen
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /**
   * Gibt nächste Zufallszahl zwischen 0 und 1 zurück
   */
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Gibt Zufallszahl zwischen min (inkl.) und max (exkl.) zurück
   */
  nextRange(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Gibt zufälliges Element aus Array zurück
   */
  choice(array) {
    return array[this.nextRange(0, array.length)];
  }
}

/**
 * Hilfsfunktion: Distanz zwischen zwei Punkten
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Hilfsfunktion: Seed aus URL-Parameter extrahieren
 */
function getSeedFromURL() {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');
  return seedParam ? parseInt(seedParam) : Date.now();
}