/* Wastl 5.1 – gepaarte, reproduzierbare Offline-Vergleichsstudie.
 * Nutzung: node tests/wastl-opponent-study.js --cases=36 --samples=80 --holdouts=16
 * Der Gegner in den Testfortsetzungen benutzt eine SEPARATE einfache Regelheuristik.
 * Das ist KEINE Validierung gegen echte Menschen oder erfahrene Schafkopfspieler.
 */
'use strict';
const MC=require('../wastl-montecarlo.js');
const Benchmark=require('../wastl-benchmark.js');
const TYPES=['solo','wenz','rufspiel','geier','ramsch','kreuzrunde'];
const average=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
function meanMargin(rows){
 const avg=average(rows);
 const variance=rows.length>1?rows.reduce((s,n)=>s+(n-avg)**2,0)/(rows.length-1):0;
 return {value:avg,margin95:rows.length>1?1.96*Math.sqrt(variance/rows.length):null};
}
function study(options={}){
 const requested=Math.min(120,Math.max(6,Math.floor(options.cases||18)));
 const samples=Math.min(350,Math.max(30,Math.floor(options.samples||70)));
 const holdouts=Math.min(64,Math.max(4,Math.floor(options.holdouts||10)));
 const rows=[],errors=[];
 for(let i=0;i<requested;i++){
  const type=TYPES[i%TYPES.length],seed=(20100+i*237)>>>0;
  try{
   const {game}=Benchmark.makeGame(seed,type);
   const available=Array.from({length:8},(_,step)=>step).filter(step=>MC.buildPosition(game,step).ok);
   if(!available.length)throw Error('Kein bewertbarer Zug');
   const turn=available[Math.min(available.length-1,i%3)];
   const params={samples,seed:(12000+i*101)>>>0};
   const mixed=MC.analyze(game,turn,params);
   const old=MC.analyze(game,turn,{...params,opponentModel:'legacy'});
   if(!mixed.ok||!old.ok)throw Error(mixed.reason||old.reason||'Analyse fehlt');
   const compare=(card)=>{
    const scores=[];
    for(let j=0;j<holdouts;j++){
     // Gleiche Referenzhand, Seed und Pruefgegner fuer beide Karten.
     const world=(42000+i*983+j*601)>>>0;
     scores.push(Benchmark.heldout(game,turn,card,world,0,'independent'));
    }
    return {win:average(scores.map(x=>x.win)),eyes:average(scores.map(x=>x.eyes))};
   };
   const a=compare(mixed.reference.card),b=compare(old.reference.card);
   rows.push({type,turn:turn+1,changed:mixed.reference.card!==old.reference.card,
    mixedCard:mixed.reference.card,oldCard:old.reference.card,
    deltaWin:a.win-b.win,deltaEyes:a.eyes-b.eyes});
  }catch(error){errors.push({type,seed,error:String(error.message||error)});}
 }
 const win=meanMargin(rows.map(r=>r.deltaWin)),eyes=meanMargin(rows.map(r=>r.deltaEyes));
 const breakdown=Object.fromEntries(TYPES.map(type=>{
  const subset=rows.filter(r=>r.type===type);
  return [type,{cases:subset.length,changed:subset.filter(r=>r.changed).length,meanDeltaWin:average(subset.map(r=>r.deltaWin))}];
 }));
 return {version:'5.1.0',requested,usable:rows.length,model:'mixed vs legacy',
  reference:'synthetische vollständige Kartenhände; getrennte einfache Regel-Testgegner',
  samples,holdoutsPerCase:holdouts,
  changed:rows.filter(r=>r.changed).length,
  meanDeltaWin:win.value,margin95DeltaWin:win.margin95,
  meanDeltaEyes:eyes.value,margin95DeltaEyes:eyes.margin95,
  byType:breakdown,rows,errors,
  warning:'Gepaarte, selbst erzeugte Referenzfälle. Weder die Tests noch eine positive Differenz belegen menschliche Spielstärke. Das 95%-Intervall umfasst nur die Variation zwischen den getesteten Situationen; Modellfehler bleiben bestehen.'};
}
if(typeof require==='function'&&require.main===module){
 const get=(key,fallback)=>{
  const entry=process.argv.find(s=>s.startsWith('--'+key+'='));
  return entry?Number(entry.slice(key.length+3)):fallback;
 };
 console.log(JSON.stringify(study({cases:get('cases',18),samples:get('samples',70),holdouts:get('holdouts',10)}),null,2));
}
module.exports={study};
