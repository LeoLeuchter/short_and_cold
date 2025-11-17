# Kurz & Kalt - Roguelike

Ein browserbasiertes Roguelike-Spiel in einer Sci-Fi-Raumstation-Umgebung.

## Features

- 🎲 Prozedural generierte Level mit BSP-Algorithmus
- 👁️ Field of View (FoV) mit Fog of War
- ⚔️ Rundenbasierter Kampf gegen Wächter-Drohnen
- 🎒 Inventarsystem mit Items (Medkit, Batterie, EMP)
- 🎯 Deterministische Seeds für reproduzierbare Maps
- 💀 Permadeath-Mechanik
- 🐛 Debug-Modus (Taste ~)

## Technologie-Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JavaScript (ES6) + HTML5 Canvas
- **Dev:** Optional nodemon für Auto-Reload

## Installation & Start

### Voraussetzungen

- Node.js >= 16.x
- npm

### Schritt 1: Projekt einrichten
```bash
# Ordner erstellen
mkdir roguelike-local
cd roguelike-local

# Dateien aus diesem Repository kopieren
# (alle Dateien wie oben beschrieben)

# Dependencies installieren
npm install
```

### Schritt 2: Server starten

**Standard-Start:**
```bash
npm start
```

**Mit Auto-Reload (empfohlen):**
```bash
npm install -D nodemon
npm run dev
```

### Schritt 3: Spiel öffnen

Öffne in deinem Browser:
```
http://localhost:3000
```

**Mit spezifischem Seed:**
```
http://localhost:3000?seed=1234
```

## Steuerung

- **WASD / Pfeiltasten:** Bewegen
- **E:** Item aufheben
- **1-3:** Item aus Inventar benutzen
- **~:** Debug-Panel öffnen/schließen

## Items

- 🟢 **Medkit:** Heilt 30 HP
- 🟡 **Batterie:** Erhöht Max HP um 10
- 🔵 **EMP:** Schadet allen sichtbaren Gegnern (20 Schaden)

## Gameplay-Tipps

1. Bewege dich strategisch - jede Bewegung ist ein Zug
2. Nutze Items weise - Inventar ist limitiert
3. Vermeide es, von mehreren Drohnen umzingelt zu werden
4. EMP ist mächtig für Hinterhalte

## Entwicklung

### Ordnerstruktur
```
roguelike-local/
├── package.json          # Dependencies & Scripts
├── server.js             # Express Server
├── README.md             # Diese Datei
└── public/               # Frontend-Dateien
    ├── index.html        # HTML-Struktur
    ├── styles.css        # Styling
    ├── game.js           # Hauptspiel-Logik
    └── utils.js          # PRNG & Hilfsfunktionen
```

### Code-Struktur (game.js)

- **Konstanten:** Tile-Größen, Map-Dimensionen, Farben
- **Map Generation:** BSP-basierte Raum & Korridor-Generierung
- **FOV System:** Bresenham-basierte Sichtlinien
- **Turn-System:** Player → Enemies → Update
- **Rendering:** Canvas-basiertes Tile-Rendering mit Kamera

## Troubleshooting

### Port bereits belegt
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Node-Version prüfen
```bash
node --version  # Sollte >= 16.x sein
```

### Canvas rendert nicht

- Browser-Console auf Fehler prüfen (F12)
- Cache leeren (Ctrl+Shift+R / Cmd+Shift+R)

## Tests

Ein einfacher Map-Generierungs-Test läuft automatisch beim Laden:
```javascript
testMapGeneration() // Prüft ob >= 100 begehbare Tiles existieren
```

Öffne Browser-Console (F12) um Test-Ergebnis zu sehen.

## Weitere Entwicklung

Mögliche Erweiterungen:

- Mehrere Level/Stockwerke
- Mehr Gegner-Typen mit unterschiedlichem Verhalten
- Erfahrungssystem & Level-Ups
- Mehr Item-Typen (Waffen, Rüstung)
- Sound-Effekte
- Speichern/Laden

## Lizenz

MIT

---

**Viel Erfolg beim Überleben auf der Raumstation! 🚀**