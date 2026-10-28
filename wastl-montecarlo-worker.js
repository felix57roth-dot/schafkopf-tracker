/* Wastl 4.3: offline Komplettsimulation mit Fortschrittsmeldungen. */
importScripts('./wastl-engine.js','./wastl-policy.js','./wastl-montecarlo.js');
self.onmessage=event=>{
 const {game,turn,options,requestId,wholeGame}=event.data||{};
 try{
  if(wholeGame){
   const results=[];
   for(let i=0;i<8;i++){
    const report=self.WastlMonteCarlo.analyze(game,i,{...(options||{}),seed:((Number(options?.seed)||0x4302026)+i*7919)>>>0});
    results.push(report);
    self.postMessage({requestId,kind:'progress',completed:i+1,total:8,report});
   }
   self.postMessage({requestId,kind:'complete',reports:results});
  }else{
   const report=self.WastlMonteCarlo.analyze(game,turn,options||{});
   self.postMessage({requestId,kind:'single',report});
  }
 }catch(error){self.postMessage({requestId,kind:'error',reason:'Simulation abgebrochen: '+String(error.message||error)});}
};
