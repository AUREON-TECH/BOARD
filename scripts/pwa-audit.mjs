import fs from 'node:fs';

const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'offline.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing required PWA file: ${file}`);
}

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons']) {
  if (!manifest[field]) throw new Error(`Manifest missing ${field}`);
}
if (manifest.display !== 'standalone') throw new Error('Manifest display must be standalone');
const purposes = manifest.icons.flatMap(icon => String(icon.purpose || 'any').split(/\s+/));
if (!manifest.icons.some(icon => String(icon.sizes).includes('192x192'))) throw new Error('Missing 192x192 icon');
if (!manifest.icons.some(icon => String(icon.sizes).includes('512x512'))) throw new Error('Missing 512x512 icon');
if (!purposes.includes('maskable')) throw new Error('Missing maskable icon');

const html = fs.readFileSync('index.html', 'utf8');
for (const token of ['manifest.webmanifest', 'theme-color', 'viewport', 'navigator.serviceWorker']) {
  if (!html.includes(token)) throw new Error(`index.html missing ${token}`);
}

const sw = fs.readFileSync('sw.js', 'utf8');
for (const token of ['CACHE_VERSION', 'Authorization', 'Cookie', 'Range', 'If-Range', 'no-store', 'private', 'Set-Cookie', 'Content-Range', 'Vary', 'offline.html']) {
  if (!sw.includes(token)) throw new Error(`sw.js missing protection/token ${token}`);
}
if (!/request\.mode\s*===\s*['"]navigate['"]/.test(sw)) throw new Error('Navigation fallback policy missing');
if (!sw.includes('caches.delete')) throw new Error('Old cache cleanup missing');

const cacheVersionMatch = sw.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!cacheVersionMatch) throw new Error('Unable to resolve service worker cache version');
const registrationVersionMatch = html.match(/serviceWorker\.register\(['"]\.\/sw\.js\?v=([^'"]+)['"]/);
if (!registrationVersionMatch) throw new Error('Service worker registration must include an explicit version');
if (registrationVersionMatch[1] !== cacheVersionMatch[1]) {
  throw new Error(`Service worker registration version ${registrationVersionMatch[1]} does not match cache version ${cacheVersionMatch[1]}`);
}
if (!html.includes("location.protocol === 'https:'") || !html.includes("location.hostname === 'localhost'")) {
  throw new Error('Service worker registration must be restricted to HTTPS or localhost');
}
if (!html.includes("updateViaCache: 'none'")) throw new Error('Service worker must use updateViaCache none');

console.log('BOARD PWA audit passed');
