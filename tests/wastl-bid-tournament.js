/* Bot 8.1: getrennte Ansagepruefung in noch nie gesehenen Kartenwelten.
 * node tests/wastl-bid-tournament.js --hands=32 --samples=20 --holdouts=24
 * Simulationsgegner im Test verwenden eine unabhaengige einfache Strategie.
 * Ertragseinheiten 1/2/3 fuer Rufspiel/Wenz/Solo sind Testgewichte, keine
 * festen Tarifregeln fuer echte Schafkopf-Abrechnungen.
 */
'use strict';
const B=require('../wastl-bots.js');
const Bid=require('../wastl-bid-brain.js');
const E=require('../wastl-engine.js');
function seeded(seed){let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
const WEIGHTS={rufspiel:1,wenz:2,solo:3};
const THRESHOLDS={rufspiel:5.5,wenz:7.5,solo:6.8};
function legacyBid(hand){
 const candidates=B.bidOptions(hand,null,'vh').map(offer=>({
  offer,margin:B.bidStrength(hand,offer)-THRESHOLDS[offer.type]
 })).sort((a,b)=>b.margin-a.margin);
 return candidates[0]?.margin>=0?candidates[0].offer:null;
}
function compareOptions(hand,offers,seed,holdouts){
 const sampled=Bid.randomDeals(hand,'vh');
 const rng=seeded(seed),totals=new Map();
 for(const offer of offers){
  if(offer)totals.set(JSON.stringify(offer),{wins:0,valid:0});
 }
 for(let i=0;i<holdouts;i++){
  const world=sampled.sample(rng),common=(rng()*4294967296)>>>0;
  for(const offer of offers){
   if(!offer)continue;
   const result=Bid.simulate(hand,'vh',world,offer,common,'independent');
   if(!result)continue;
   const row=totals.get(JSON.stringify(offer));row.wins+=result.win;row.valid++;
  }
 }
 return offers.map(offer=>{
  if(!offer)return {label:'Weiter',probability:null,payoff:0,valid:holdouts};
  const r=totals.get(JSON.stringify(offer));
  const probability=r.valid?r.wins/r.valid:null;
  return {label:offer.label,probability,payoff:r.valid?WEIGHTS[offer.type]*(2*probability-1):0,valid:r.valid};
 });
}
function summary(vals){
 const mean=vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length);
 const varr=vals.length>1?vals.reduce((a,b)=>a+(b-mean)**2,0)/(vals.length-1):0;
 return {mean,margin95:vals.length>1?1.96*Math.sqrt(varr/vals.length):null};
}
function tournament({hands=32,samples=20,holdouts=24}={}){
 hands=Math.max(4,Math.min(256,Math.floor(hands)));
 samples=Math.max(10,Math.min(80,Math.floor(samples)));
 holdouts=Math.max(8,Math.min(128,Math.floor(holdouts)));
 const rows=[],errors=[];
 for(let i=0;i<hands;i++){
  const h=B.deal(seeded(10023+i*3881)).vh;
  try{
   const old=legacyBid(h),estimate=Bid.analyze({seat:'vh',hand:h},{samples,seed:0x817211+i*37});
   if(!estimate.ok)throw Error(estimate.reason);
   const newer=estimate.offer;
   const [o,n]=compareOptions(h,[old,newer],0x117455+i*7919,holdouts);
   rows.push({i,old:o.label,new:n.label,oldPayoff:o.payoff,newPayoff:n.payoff,
    diff:n.payoff-o.payoff,oldProb:o.probability,newProb:n.probability,
    different:o.label!==n.label,oldBid:!!old,newBid:!!newer});
  }catch(e){errors.push({i,error:String(e.message||e)});}
 }
 const d=summary(rows.map(x=>x.diff));
 return {version:'8.1.0',hands:rows.length,trainingSamples:samples,holdouts,
  newBidRate:rows.filter(r=>r.newBid).length/Math.max(1,rows.length),
  oldBidRate:rows.filter(r=>r.oldBid).length/Math.max(1,rows.length),
  changed:rows.filter(r=>r.different).length,
  meanDeltaTestPayoff:d.mean,margin95:d.margin95,
  errors,rows,
  note:'Pruefung auf komplett getrennten, zur Planung nicht verwendeten Verteilungen gegen einfache unabhängige Simulationsbots. Kein Nachweis menschlicher Schafkopfstaerke und keine realen Geldwerte.'};
}
if(typeof require==='function'&&require.main===module){
 function arg(name,defaultValue){const v=process.argv.find(a=>a.startsWith('--'+name+'='));return v?Number(v.slice(name.length+3)):defaultValue;}
 console.log(JSON.stringify(tournament({hands:arg('hands',32),samples:arg('samples',20),holdouts:arg('holdouts',24)}),null,2));
}
module.exports={tournament,legacyBid,compareOptions};
