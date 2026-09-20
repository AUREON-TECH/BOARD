const CACHE_PREFIX='board-shell-';
const CACHE_VERSION='v2';
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const SHELL=['./','./index.html','./styles.css','./app.js','./src/model.js','./src/history.js','./src/geometry.js','./src/drawing.js','./src/templates.js','./src/render.js','./src/storage.js','./src/interactions.js','./src/gesture.js','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
const PRIVATE_PATHS=/\/(api|auth|login|logout|session|token|account|profile|admin)(\/|$)/i;
const SENSITIVE_QUERY=/(token|access_token|refresh_token|auth|session|password|secret|key)=/i;

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

function requestIsPrivate(request,url){return request.headers.has('Authorization')||request.headers.has('Cookie')||request.headers.has('Range')||request.headers.has('If-Range')||PRIVATE_PATHS.test(url.pathname)||SENSITIVE_QUERY.test(url.search.slice(1));}
function responseIsPrivate(response){const cc=(response.headers.get('Cache-Control')||'').toLowerCase();const vary=(response.headers.get('Vary')||'').toLowerCase();return response.status===206||response.headers.has('Set-Cookie')||response.headers.has('Content-Range')||cc.includes('no-store')||cc.includes('private')||vary==='*'||vary.includes('authorization')||vary.includes('cookie')||vary.includes('range')||vary.includes('if-range');}
function isShellPath(url){const p=url.pathname.replace(/\/+$/,'/');return /\/(BOARD\/)?(index\.html|styles\.css|app\.js|manifest\.webmanifest|offline\.html)?$/i.test(p)||/\/src\/(model|history|geometry|drawing|templates|render|storage|interactions|gesture)\.js$/i.test(url.pathname)||/\/icons\/(icon-192|icon-512|icon-maskable-512)\.png$/i.test(url.pathname);}

self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin||requestIsPrivate(request,url))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>caches.match('./index.html')).then(response=>response||caches.match('./offline.html')));return;
  }
  if(!isShellPath(url))return;
  event.respondWith(caches.match(request).then(async cached=>{const network=fetch(request,{cache:'no-store'}).then(async response=>{if(response.ok&&!responseIsPrivate(response)){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}return response});return cached||network.catch(()=>new Response('',{status:503,statusText:'Offline'}))}));
});
