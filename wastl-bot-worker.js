/* Wastl Bot Brain 8.0 – Hintergrundberechnung je genau einem Botzug.
 * Worker bekommt ausschliesslich eine oeffentliche Spielansicht und die eigene Hand.
 */
'use strict';
importScripts('./wastl-engine.js','./wastl-policy.js','./wastl-opponents.js',
 './wastl-montecarlo.js','./wastl-tactics.js','./wastl-bot-brain.js','./wastl-bots.js','./wastl-bid-brain.js');
self.onmessage=function(event){
 const data=event.data||{},id=data.requestId;
 try{
  if(data.kind==='bid'){
   const bid=self.WastlBidBrain.analyze(data.view,{samples:data.samples,seed:data.seed});
   self.postMessage({requestId:id,kind:'bid',ok:!!bid.ok,
    offer:bid.ok?bid.offer:null,version:self.WastlBidBrain.VERSION,
    reason:bid.reason||null,samples:bid.samples||0});
   return;
  }
  const result=self.WastlBotBrain.analyze(data.view,{
   samples:data.samples,seed:data.seed
  });
  self.postMessage({requestId:id,ok:!!result.ok,card:result.ok?result.card:null,
   version:self.WastlBotBrain.VERSION,
   reason:result.reason||null,samples:result.samples||0});
 }catch(e){
  self.postMessage({requestId:id,ok:false,card:null,
   reason:String(e?.message||e),version:self.WastlBotBrain.VERSION});
 }
};
