/* Reproduzierbare Offline-Tests fuer Wastls Kartenverteilung und Stichanalyse.
 * Start: node --test tests/wastl-montecarlo.test.js
 * Keine Fremdbibliotheken, keine echten Spieler-/Partiedaten.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../wastl-engine.js');
const MC=require('../wastl-montecarlo.js');
const Benchmark=require('../wastl-benchmark.js');
function random(seed){
 let a=seed>>>0;
 return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function position(overrides={}){
 return {seat:'g',game:{type:'solo',trumpSuit:'herz',declarerSeat:'vh'},
  unknown:['eichel-7','gras-7','schell-7'],capacities:{vh:1,mh:1,hh:1,g:0},
  voids:Object.fromEntries(E.SEATS.map(seat=>[seat,new Set()])),knownCalledAce:null,...overrides};
}
test('Gleichverteilung: drei Karten auf drei Gegner = sechs gleichwahrscheinliche Zuteilungen',()=>{
 const p=position(),sampler=MC.prepareDealSampler(p);
 assert.equal(sampler.count,6);
 const rng=random(123456789),count={vh:0,mh:0,hh:0};
 for(let i=0;i<6000;i++){
  const hands=sampler.sample(rng);
  assert.ok(hands);
  for(const seat of ['vh','mh','hh'])if(hands[seat].includes('eichel-7'))count[seat]++;
  assert.deepEqual([hands.vh.length,hands.mh.length,hands.hh.length,hands.g.length],[1,1,1,0]);
 }
 for(const n of Object.values(count))assert.ok(n>1850&&n<2150,'Haeufigkeit ausserhalb des Toleranzbands: '+n);
});
test('Maximal 24 unbekannte Karten: exakte Anzahl ohne Fliesskomma-Ueberlauf',()=>{
 const p=position({unknown:E.FULL.slice(0,24),capacities:{vh:8,mh:8,hh:8,g:0}});
 const sampler=MC.prepareDealSampler(p);
 assert.equal(sampler.count,9465511770);
 const hands=sampler.sample(random(654321));
 assert.equal(hands.vh.length,8);assert.equal(hands.mh.length,8);assert.equal(hands.hh.length,8);
 assert.equal(new Set([...hands.vh,...hands.mh,...hands.hh]).size,24);
});
test('Rufspiel: Ruf-Sau landet nie beim Ansager',()=>{
 const p=position({game:{type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'},
  unknown:['eichel-A','gras-7','schell-7'],knownCalledAce:'eichel-A'});
 const sampler=MC.prepareDealSampler(p);assert.equal(sampler.count,4);
 const rng=random(9731);
 for(let i=0;i<120;i++)assert.ok(!sampler.sample(rng).vh.includes('eichel-A'));
});
test('Bekannte Fehlfarbe: Spieler darf diese unbekannte Farbkarte nicht haben',()=>{
 const p=position({voids:{vh:new Set(['eichel']),mh:new Set(),hh:new Set(),g:new Set()}});
 const sampler=MC.prepareDealSampler(p);assert.equal(sampler.count,4);
 const rng=random(9732);
 for(let i=0;i<120;i++)assert.ok(!sampler.sample(rng).vh.includes('eichel-7'));
});
test('Unmoegliche Bedienpflicht-Zuteilungen werden verworfen',()=>{
 const p=position({voids:{vh:new Set(['eichel']),mh:new Set(['eichel']),hh:new Set(['eichel']),g:new Set()}});
 const sampler=MC.prepareDealSampler(p);
 assert.equal(sampler.count,0);assert.equal(sampler.sample(random(9733)),null);
 assert.equal(MC.assignUnknown(p,random(9734)),null);
});
test('Wiederholbare Simulation bei gleichem Zufallssamen',()=>{
 const {game}=Benchmark.makeGame(101,'solo');
 const turn=Array.from({length:8},(_,i)=>i).find(i=>MC.buildPosition(game,i).ok);
 assert.ok(Number.isInteger(turn));
 const a=MC.analyze(game,turn,{samples:60,seed:12345});
 const b=MC.analyze(game,turn,{samples:60,seed:12345});
 assert.deepEqual(a,b);assert.equal(a.sampler,'exact-uniform-conditional-v1');
});
for(const [type,seed] of [['solo',101],['wenz',114],['rufspiel',127],['geier',140],['ramsch',153],['kreuzrunde',166]]){
 test(type+': vollstaendige regelkonforme Referenzpartie und Entscheidungsanalyse',()=>{
  const {game}=Benchmark.makeGame(seed,type);
  assert.equal(E.review(game).ok,true);
  const turn=Array.from({length:8},(_,i)=>i).find(i=>MC.buildPosition(game,i).ok);
  assert.ok(Number.isInteger(turn),'Keine freie Entscheidung im Testfall');
  const report=MC.analyze(game,turn,{samples:60,seed:0xabc123});
  assert.equal(report.ok,true,report.reason);
  assert.equal(report.sampleCount,60);
  assert.ok(report.possibleDeals>0);
  assert.ok(report.recorded.winRate>=0&&report.recorded.winRate<=1);
  assert.ok(report.candidates.some(x=>x.card===report.actual));
 });
}
