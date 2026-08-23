const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

test('desktop startup clears stale Chromium cache before loading the frontend', () => {
  assert.match(source, /await\s+mainWindow\.webContents\.session\.clearCache\(\)/);
});

test('desktop frontend URL carries the application build version', () => {
  assert.match(source, /desktopBuild=.*app\.getVersion\(\)/s);
});
