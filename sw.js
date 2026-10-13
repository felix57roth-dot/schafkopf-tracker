/* Schafkopf Tracker – Offline-Cache v1.2 */
const CACHE='schafkopf-v1.2';
const ASSETS=['./','./index.html','./icon.svg','./manifest.webmanifest'];
const PREFIX='schafkopf-';

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(ASSETS);
    // Einmaliges Upgrade von v1.1: Dort gab es noch keine Update-Schaltfläche.
    // Erst ab dieser Version wird auf die ausdrückliche Bestätigung gewartet.
    const keys=await caches.keys();
    if(keys.includes('schafkopf-v1'))await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      // Online neu laden, damit neue App-Versionen nicht im alten Cache hängen bleiben.
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok)await cache.put(request,response.clone()).catch(()=>{});
      return response;
    }catch{
      return (await cache.match(request,{ignoreSearch:true})) ||
             (request.mode==='navigate' && ((await cache.match('./index.html'))||(await cache.match('./')))) ||
             Response.error();
    }
  })());
});
