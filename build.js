// build.js - Simple build script to concatenate all card modules into a single file for Home Assistant/HACS
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const OUT_FILE = 'savant-energy-scenes-card.js';
const PARTS = [
  'savant-energy-api.js',
  'savant-energy-card-style.js',
  'savant-energy-card-editor.js',
  'card.js', // This will be the main card logic (to be created/refactored)
];

let output = '';
for (const part of PARTS) {
  const filePath = path.join(__dirname, part);
  if (fs.existsSync(filePath)) {
    output += fs.readFileSync(filePath, 'utf8') + '\n';
  } else {
    console.warn(`Warning: ${part} not found, skipping.`);
  }
}

fs.writeFileSync(path.join(__dirname, OUT_FILE), output, 'utf8');
console.log(`Build complete: ${OUT_FILE}`);
