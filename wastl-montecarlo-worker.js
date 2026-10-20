/* Asynchronous, fully offline worker: does not access UI or user storage. */
importScripts('./wastl-engine.js', './wastl-policy.js', './wastl-montecarlo.js');
self.onmessage = event => {
 const {game,turn,options,requestId} = event.data || {};
 try {
  const report=self.WastlMonteCarlo.analyze(game,turn,options||{});
  self.postMessage({requestId,report});
 } catch (error) {
  self.postMessage({requestId,report:{ok:false,reason:'Simulation abgebrochen: '+String(error.message||error)}});
 }
};
