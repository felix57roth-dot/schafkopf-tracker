/* Schafkopftracker PWA Offlinecache 7.4.1 – vollständiges Kartenset lokal */
const CACHE='schafkopf-v7.4.1';
const PREFIX='schafkopf-';
const ASSETS=["./", "./index.html", "./icon.png", "./icon.svg", "./wastl.png", "./players/sepp_sitzend.png", "./players/xaver_sitzend.png", "./players/resi_sitzend.png", "./manifest.webmanifest", "./palast-game-labels.js", "./palast-oneclick.css", "./palast-oneclick.js", "./palast-import.js", "./palast-signatures.js", "./palast-import.css", "./training-manager.js", "./training-manager.css", "./wastl-engine.js", "./wastl-engine-ui.js", "./wastl-engine-ui.css", "./wastl-policy.js", "./wastl-montecarlo.js", "./wastl-montecarlo-worker.js", "./wastl-montecarlo-ui.js", "./wastl-match-analysis.js", "./wastl-benchmark.js", "./wastl-benchmark-worker.js", "./wastl-validation.js", "./wastl-validation-worker.js", "./wastl-bots.js", "./wastl-bots-ui.js", "./wastl-bots.css", "./wastl-montecarlo-ui.css", "./cards/eichel-10.webp", "./cards/eichel-7.webp", "./cards/eichel-8.webp", "./cards/eichel-9.webp", "./cards/eichel-A.webp", "./cards/eichel-K.webp", "./cards/eichel-O.webp", "./cards/eichel-U.webp", "./cards/gras-10.webp", "./cards/gras-7.webp", "./cards/gras-8.webp", "./cards/gras-9.webp", "./cards/gras-A.webp", "./cards/gras-K.webp", "./cards/gras-O.webp", "./cards/gras-U.webp", "./cards/herz-10.webp", "./cards/herz-7.webp", "./cards/herz-8.webp", "./cards/herz-9.webp", "./cards/herz-A.webp", "./cards/herz-K.webp", "./cards/herz-O.webp", "./cards/herz-U.webp", "./cards/schell-10.webp", "./cards/schell-7.webp", "./cards/schell-8.webp", "./cards/schell-9.webp", "./cards/schell-A.webp", "./cards/schell-K.webp", "./cards/schell-O.webp", "./cards/schell-U.webp"];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(ASSETS);
 // Optionale perspektivische Stammtisch-Grafik: darf die Offline-Installation
 // auch dann nicht blockieren, wenn die Datei noch nicht hochgeladen ist.
 try{
  for(const name of ['./players/stammtisch-hintergrund-v1.webp','./players/stammtisch-szene.webp']){
   const scene=await fetch(name,{cache:'no-store'});
   if(scene.ok)await cache.put(name,scene);
  }
 }catch{/* Figuren bleiben als einzelne PNGs offline verfügbar. */}
 await self.skipWaiting();
})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})());});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request,{ignoreSearch:true});
  // Images and other immutable local assets: cached first => fast offline display.
  if(cached&&(url.pathname.includes('/cards/')||/\.(webp|png|svg|woff2?)$/i.test(url.pathname)))return cached;
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)await cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch{return cached||(request.mode==='navigate'?await cache.match('./index.html'):null)||Response.error();}
 })());
});
