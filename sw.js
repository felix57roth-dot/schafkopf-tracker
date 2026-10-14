/* Schafkopftracker – Offline-Cache v2.1.1 */
const CACHE='schafkopf-v2.1.1';
const ASSETS=['./','./index.html','./icon.svg','./manifest.webmanifest'];
const PREFIX='schafkopf-';
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const res=await fetch(req,{cache:'no-store'});if(res.ok)await cache.put(req,res.clone()).catch(()=>{});return res;}catch{return (await cache.match(req,{ignoreSearch:true}))||((req.mode==='navigate')&&((await cache.match('./index.html'))||(await cache.match('./'))))||Response.error();}})());});
