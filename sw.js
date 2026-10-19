const APP='contabilidad-control-servicios-taxi';
const VERSION='1.11.1';
const BASE=new URL('./',self.location.href);
const PREFIX=APP+':'+encodeURIComponent(BASE.pathname)+':';
const CACHE=PREFIX+VERSION;
const ASSETS=['./','./index.html','./styles.css','./app.js','./json-transfer.js','./pdf-assets.js','./pdf-report.js','./pwa-install.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./logos/pidetaxi.webp','./logos/imbric.webp','./logos/joinup.webp','./logos/abonado.webp','./logos/uber.webp','./logos/freenow.webp','./logos/concertado.webp'];
const URLS=ASSETS.map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})))));
 // Una actualización espera a que el usuario la aplique; no interrumpe un servicio.
});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_TAXI_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const asset=URLS.includes(url.origin+url.pathname);
  if(asset){const saved=await cache.match(url.origin+url.pathname);if(saved)return saved;}
  try{return await fetch(event.request);}
  catch(error){
   if(event.request.mode==='navigate'){
    const saved=await cache.match(new URL('index.html',BASE).href);if(saved)return saved;
   }
   return new Response('Recurso no disponible sin conexión.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
 })());
});
