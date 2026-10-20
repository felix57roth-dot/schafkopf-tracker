/* Komplett lokal. Unbekannte Referenzhaende sind NUR dem Pruefer bekannt. */
importScripts('./wastl-engine.js','./wastl-policy.js','./wastl-montecarlo.js','./wastl-benchmark.js');
self.onmessage=event=>{
 const {requestId,options}=event.data||{};
 try{
  const report=self.WastlBenchmark.suite({...options,onProgress:p=>self.postMessage({requestId,kind:'progress',...p})});
  self.postMessage({requestId,kind:'complete',report});
 }catch(error){self.postMessage({requestId,kind:'error',reason:String(error.message||error)});}
};
