// build.js - Simple build script to concatenate all card modules into a single file for Home Assistant/HACS
// Usage: node build.js

const fs = require('fs');
const path = require('path');

// Output to project root, not dev/
const OUT_FILE = path.join(__dirname, '../savant-energy-scenes-card.js');
const INTEGRATION_DIR = path.join(__dirname, '../integration_version');
const INTEGRATION_OUT_FILE = path.join(INTEGRATION_DIR, 'savant-energy-scenes-card.js');
const PARTS = [
  'savant-energy-api.js',
  'savant-energy-card-style.js',
  'savant-energy-card-editor.js',
  'savant-energy-card-main.js', // Main card logic (renamed)
];

function stripImports(content) {
  // Remove ES6 import statements
  return content.replace(/^import .*;\s*$/gm, '');
}

function replaceStandaloneWithCard(content) {
  // Replace all occurrences of 'standalone' in custom element names, class names, and registration
  // Only replace in the context of the card name, not in unrelated text
  return content
    // Custom element tag
    .replace(/savant-energy-scenes-standalone-card-editor/g, 'savant-energy-scenes-card-editor')
    .replace(/savant-energy-scenes-standalone-card/g, 'savant-energy-scenes-card')
    // Class name (if used)
    .replace(/SavantEnergyScenesCardEditor/g, 'SavantEnergyScenesCardEditor')
    .replace(/SavantEnergyScenesCard/g, 'SavantEnergyScenesCard')
    // Card registration (type, name, description)
    .replace(/Savant Energy Scenes Standalone Card/g, 'Savant Energy Scenes Card')
    .replace(/Savant Energy Scenes Standalone/g, 'Savant Energy Scenes')
    .replace(/standalone/g, 'card'); // fallback for lowercase usages
}

let output = '';
for (const part of PARTS) {
  const filePath = path.join(__dirname, part);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Only strip imports from non-API files
    if (part !== 'savant-energy-api.js') {
      content = stripImports(content);
    }
    output += content + '\n';
  } else {
    console.warn(`Warning: ${part} not found, skipping.`);
  }
}

fs.writeFileSync(OUT_FILE, output, 'utf8');
console.log(`Build complete: ${OUT_FILE}`);

// Build integration version
if (!fs.existsSync(INTEGRATION_DIR)) {
  fs.mkdirSync(INTEGRATION_DIR);
}
let integrationOutput = replaceStandaloneWithCard(output);
fs.writeFileSync(INTEGRATION_OUT_FILE, integrationOutput, 'utf8');
console.log(`Integration build complete: ${INTEGRATION_OUT_FILE}`);
