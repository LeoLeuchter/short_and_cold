// FILE: server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Statische Dateien aus dem public-Ordner servieren
app.use(express.static(path.join(__dirname, 'public')));

// Fallback für SPA-Routing (falls nötig)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
  console.log(`   Spiel starten: http://localhost:${PORT}`);
  console.log(`   Mit Seed: http://localhost:${PORT}?seed=1234`);
});