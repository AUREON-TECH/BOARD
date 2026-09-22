const CACHE_PREFIX='board-shell-';
const CACHE_VERSION='v3';
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const SHELL=['./','./index.html','./styles.css?v=3','./app.js?v=3','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('./offline.html')));return}
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,clone))}return res})));
});