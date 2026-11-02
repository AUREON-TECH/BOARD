const CACHE_PREFIX='board-shell-';const CACHE_VERSION='v11';const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const SHELL=['./','./index.html','./styles.css?v=10','./app.js?v=10','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
const SHELL_URLS=new Set(SHELL.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match('./offline.html')));
    return;
  }
  if(!SHELL_URLS.has(u.href))return;
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{
    if(res.ok&&res.type!=='opaque'){
      const copy=res.clone();
      e.waitUntil(caches.open(CACHE_NAME).then(c=>c.put(r,copy)));
    }
    return res;
  }).catch(()=>caches.match(r)));
});
