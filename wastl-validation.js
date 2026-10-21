/* Wastl 4.6 – vorab definierter, gepaarter Offline-A/B-Test.
 * Vergleicht die bisherige zugbasierte Heuristik mit einer Monte-Carlo-Empfehlung.
 * Beide Entscheidungen sehen nur eigene Karten + öffentliche Vergangenheit.
 * Gleiche verborgene Referenzhände / Seeds für beide Entscheidungen.
 * NICHT als menschliche Spielstärkenkalibrierung geeignet.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const P=node?require('./wastl-policy.js'):root.WastlPolicy;
 const M=node?require('./wastl-montecarlo.js'):root.WastlMonteCarlo;
 const B=node?require('./wastl-benchmark.js'):root.WastlBenchmark;
 const api=factory(E,P,M,B);if(node)module.exports=api;if(root)root.WastlValidation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P,M,B){
 'use strict';
 const VERSION='4.6.0', MODEL='heuristic-4.5-vs-montecarlo-4.5', GROUPS=['solo','wenz','rufspiel','geier','ramsch','kreuzrunde'];
 function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:0;}
 function interval(arr){
  if(arr.length<2)return {mean:mean(arr),margin:1};
  const m=mean(arr),variance=arr.reduce((s,x)=>s+(x-m)**2,0)/(arr.length-1);
  return {mean:m,margin:1.96*Math.sqrt(variance/arr.length)};
 }
 function getChoice(game,turn,seed,samples){
  const pos=M.buildPosition(game,turn);
  if(!pos.ok||pos.legal.length<2)return {ok:false,reason:pos.reason||'Kein vergleichbarer Zug'};
  // Der Baseline-Entscheider bekommt KEINE rekonstruierten gegnerischen Haende.
  const scored=P.evaluate(pos.myHand,pos.prefix,pos.seat,pos.t.leaderSeat,game,{past:pos.past},rng(seed^0x776655));
  const baseline=scored[0]?.card;
  // Monte-Carlo kennt ausschliesslich die Informationen aus buildPosition.
  const simulated=M.analyze(game,turn,{samples,seed:(seed^0x51146)>>>0});
  if(!simulated.ok)return {ok:false,reason:simulated.reason};
  const challenger=simulated.reference?.card;
  if(!pos.legal.includes(baseline)||!pos.legal.includes(challenger))throw Error('A/B: eine Empfehlung ist nicht legal');
  return {ok:true,baseline,challenger,position:pos,modelSamples:simulated.sampleCount};
 }
 function evaluate(game,turn,opts={}){
  const seed=(opts.seed??0x4600001)>>>0;
  const samples=Math.max(25,Math.min(350,Math.floor(opts.samples??60)));
  const evalRuns=Math.max(4,Math.min(64,Math.floor(opts.evalRuns??12)));
  const picks=getChoice(game,turn,seed,samples);if(!picks.ok)return picks;
  const a=[],b=[],eyeDifferences=[];
  for(let i=0;i<evalRuns;i++){
   const worldSeed=(seed+i*13729+0x13572468)>>>0;
   // Paired runs: identical deal and policy RNG for both choices.
   const ref=B.heldout(game,turn,picks.baseline,worldSeed);
   const neo=B.heldout(game,turn,picks.challenger,worldSeed);
   a.push(ref.win);b.push(neo.win);eyeDifferences.push(neo.eyes-ref.eyes);
  }
  const pair=b.map((v,i)=>v-a[i]);
  return {ok:true,type:game.type,turn,baseline:picks.baseline,challenger:picks.challenger,
   changed:picks.baseline!==picks.challenger,samples:picks.modelSamples,evalRuns,
   baselineWin:mean(a),challengerWin:mean(b),lift:mean(pair),eyeLift:mean(eyeDifferences),
   scenarioSeed:seed};
 }
 function summarize(cases,requested,seed,options){
  const usable=cases.filter(x=>x.ok),test=usable.filter(x=>x.set==='test'),train=usable.filter(x=>x.set==='diagnostic');
  const groupSummary=(rows)=>{
   const ci=interval(rows.map(r=>r.lift));
   return {count:rows.length,changed:rows.filter(r=>r.changed).length,lift:ci.mean,margin:ci.margin,eyeLift:mean(rows.map(r=>r.eyeLift))};
  };
  const overall=groupSummary(test);
  const groups=Object.fromEntries(GROUPS.map(type=>[type,groupSummary(test.filter(x=>x.type===type))]));
  return {ok:test.length>0,version:VERSION,model:MODEL,requested,usable:usable.length,
   diagnostic:groupSummary(train),test:overall,groups,seed,
   samples:options.samples,evalRuns:options.evalRuns,
   evidence:test.length>=48&&overall.changed>=16&&overall.lift-overall.margin>.015?'internal-advantage':'not-established',
   warning:'Gepaarter Test gegen eine ältere Heuristik auf zurückgehaltenen vollständigen Händen. Beide Rollouts verwenden weiterhin Wastls Heuristik als Gegner-Modell; das ist kein unabhängiger menschlicher Experte. 95%-Intervall aus TestSITUATIONEN (nicht künstlich aufgebläht durch Einzel-Rollouts). Diagnose- und Testhälfte verwenden verschiedene Seeds. Keine Aussage über reale Spielstärke und keine 1–10-Kalibrierung.',
   cases:usable};
 }
 function suite(opts={}){
  const requested=Math.max(12,Math.min(144,Math.floor(opts.cases??24)));
  const samples=Math.max(25,Math.min(350,Math.floor(opts.samples??60)));
  const evalRuns=Math.max(4,Math.min(64,Math.floor(opts.evalRuns??12)));
  const seed=(opts.seed??0x46660801)>>>0;
  const cases=[],errors=[];
  let attempts=0;
  // Rundenweise je zwei Aufgaben einer Spielart: eine Diagnose, eine Testaufgabe.
  // Die vorab festgelegte Aufteilung darf nicht anhand der Ergebnisse veraendert werden.
  while(cases.length<requested&&attempts<requested*14){
   const k=attempts++,type=GROUPS[Math.floor(k/2)%GROUPS.length],set=k%2===0?'diagnostic':'test';
   const trialSeed=(seed+Math.imul(k+1,27539))>>>0;
   try{
    const {game}=B.makeGame(trialSeed,type);
    const available=[];
    for(let i=0;i<8;i++){
     const pos=M.buildPosition(game,i);
     if(pos.ok&&pos.legal.length>1)available.push(i);
    }
    if(!available.length)continue;
    const turn=available[Math.floor(rng(trialSeed^0xa5501)()*available.length)];
    const r=evaluate(game,turn,{seed:trialSeed^0x4601,samples,evalRuns});
    if(r.ok)cases.push({...r,set});else errors.push(r.reason);
   }catch(e){errors.push(String(e.message||e));}
   if(typeof opts.onProgress==='function')opts.onProgress({completed:cases.length,total:requested,attempts});
  }
  return {...summarize(cases,requested,seed,{samples,evalRuns}),errors:errors.slice(0,8)};
 }
 return Object.freeze({VERSION,MODEL,GROUPS,getChoice,evaluate,suite,summarize});
});
