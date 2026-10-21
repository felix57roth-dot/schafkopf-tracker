/* Eigene Offline-A/B-Verifikation; keine personenbezogenen Daten werden versendet. */
importScripts('./wastl-engine.js','./wastl-policy.js','./wastl-montecarlo.js','./wastl-benchmark.js','./wastl-validation.js');
self.onmessage=event=>{
 const {requestId,options}=event.data||{};
 try{
  const report=self.WastlValidation.suite({...options,onProgress:p=>self.postMessage({requestId,kind:'progress',...p})});
  self.postMessage({requestId,kind:'complete',report});
 }catch(error){self.postMessage({requestId,kind:'error',reason:String(error.message||error)});}
};
