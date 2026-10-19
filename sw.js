const CACHE='contabilidad-servicios-v1-8-4-20261019';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-maskable-512.png','./icon-192.png','./icon-512.png','./logos/pidetaxi.webp','./logos/imbric.webp','./logos/joinup.webp','./logos/abonado.webp','./logos/uber.webp','./logos/freenow.webp','./logos/concertado.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(event.request);if(response.ok&&event.request.url.startsWith(self.registration.scope))await cache.put(event.request,response.clone());return response;}
  catch(err){const cached=await caches.match(event.request,{ignoreSearch:false});if(cached)return cached;
   if(event.request.mode==='navigate'){const page=await caches.match('./index.html');if(page)return page;}throw err;}
 })());
});
