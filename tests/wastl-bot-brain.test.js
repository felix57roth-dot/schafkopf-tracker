/* Wastl Bot Brain 8.0: reproduzierbare Offline-Live-Tests.
 * Ohne fremde Bibliotheken, ohne echte Spielernutzerdaten.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../wastl-engine.js');
const B=require('../wastl-bots.js');
const Brain=require('../wastl-bot-brain.js');
function random(seed){
 let x=seed>>>0;
 return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
}
function game(type='solo',seed=40123){
 const g=B.create({mySeat:'g',random:random(seed),knockEnabled:false,shotEnabled:false});
 Object.assign(g,{phase:'playing',type,calledSuit:'eichel',trumpSuit:'herz',
  declarerSeat:'vh',leaderSeat:'vh',turn:'vh',current:[],tricks:[]});
 return g;
}
test('Worker-Ansicht enthält nur die eigene Hand und öffentliche Stiche',()=>{
 const g=game(),view=Brain.publicView(g,'vh');
 assert.deepEqual(Object.keys(view).sort(),['current','game','hand','leaderSeat','past','seat'].sort());
 assert.equal(view.hand.length,8);
 assert.equal(view.past.length,0);
 assert.ok(!Object.hasOwn(view,'initialHands')&&!Object.hasOwn(view,'hands'));
 assert.equal(JSON.stringify(view).includes('initialHands'),false);
});
test('Verborgene Gegnerkarten beeinflussen die Botentscheidung nicht unmittelbar',()=>{
 const g=game(),other=game();
 other.hands.vh=[...g.hands.vh];other.initialHands.vh=[...g.initialHands.vh];
 // Gleiche eigene Karten / öffentlicher Verlauf, andere fremde Handdaten.
 for(const seat of ['mh','hh','g']){
  other.hands[seat]=['eichel-7'];other.initialHands[seat]=['eichel-A'];
 }
 const a=Brain.publicView(g,'vh'),b=Brain.publicView(other,'vh');
 assert.deepEqual(a,b);
 assert.deepEqual(Brain.analyze(a,{samples:12,seed:42}),Brain.analyze(b,{samples:12,seed:42}));
});
test('Rufspiel: Ein Bot darf aus eigener Ruf-Sau seine echte Teamzugehoerigkeit ableiten',()=>{
 let g,owner;
 for(let seed=100;seed<200;seed++){
  const candidate=game('rufspiel',seed);
  const seat=['mh','hh'].find(s=>candidate.hands[s].includes('eichel-A'));
  if(seat){g=candidate;owner=seat;break;}
 }
 assert.ok(owner,'Kein deterministischer Ruf-Sau-Testfall gefunden');
 g.leaderSeat=owner;g.turn=owner;
 const view=Brain.publicView(g,owner),built=Brain.build(view);
 assert.equal(built.ok,true,built.reason);
 assert.ok(view.hand.includes('eichel-A'));
 const result=Brain.analyze(view,{samples:10,seed:987654});
 assert.equal(result.ok,true,result.reason);
 assert.ok(B.playable(g,owner).includes(result.card));
});
test('Wiederholte Berechnung mit gleichem Seed liefert dieselbe Empfehlung',()=>{
 const view=Brain.publicView(game(),'vh'),settings={samples:12,seed:123456};
 const a=Brain.analyze(view,settings),b=Brain.analyze(view,settings);
 assert.deepEqual(a,b);
 assert.equal(a.ok,true,a.reason);
 assert.equal(a.version,'8.2.0');
 assert.equal(a.calibrated,false);
 assert.ok(a.possibleDeals>0);
});
test('Unbekannte Handverteilungen respektieren öffentlich sichtbare Bedienpflicht',()=>{
 const v=Brain.publicView(game(),'vh');
 const built=Brain.build(v);
 assert.equal(built.ok,true);
 assert.equal(built.unknown.length,24);
 assert.equal(built.capacities.vh,0);
 assert.deepEqual(built.legal,v.hand);
});
test('Frühere abgelegte Karten dürfen im späteren Simulationspool nicht auftauchen',()=>{
 const g=game();const initial=E.FULL;
 const seen=[];
 // Eine simulierte Partie erzeugt legitime, öffentliche Stichfolgen.
 for(let n=0;n<9;n++){
  if(g.phase==='trickDone')B.nextTrick(g);
  const seat=g.turn;
  if(g.phase!=='playing')break;
  const legal=B.playable(g,seat);
  assert.ok(legal.length>0);
  seen.push(legal[0]);
  if(seat===g.mySeat)B.play(g,legal[0]);
  else B.stepBot(g,random(110+n));
 }
 assert.ok(g.tricks.length>=2);
 if(g.phase==='trickDone')B.nextTrick(g);
 const view=Brain.publicView(g,g.turn),built=Brain.build(view);
 assert.equal(built.ok,true,built.reason);
 const played=[...built.past.flatMap(t=>t.cards),...built.prefix];
 assert.ok(built.unknown.every(card=>!played.includes(card)));
 assert.ok(built.unknown.every(card=>!view.hand.includes(card)));
 assert.equal(new Set([...built.unknown,...played,...view.hand]).size,32);
});
test('Bei ungültigen Eingaben wird keine Karte erfunden',()=>{
 const g=game(),v=Brain.publicView(g,'vh');
 assert.equal(Brain.analyze({...v,seat:'nobody'},{}).ok,false);
 assert.equal(Brain.analyze({...v,hand:[...v.hand,'eichel-A']},{}).ok,false);
 assert.equal(Brain.analyze({...v,game:{...v.game,type:'unbekannt'}},{}).ok,false);
});
test('Solo, Wenz, Rufspiel: alle Karten bleiben legal und vollständige Partien gültig',()=>{
 for(const [i,type] of ['solo','wenz','rufspiel'].entries()){
  const g=game(type,50301+i*113);
  let brainMoves=0,steps=0;
  while(g.phase!=='done'&&steps++<45){
   if(g.phase==='trickDone'){B.nextTrick(g);continue;}
   if(g.phase==='finalTrick'){B.showResult(g);break;}
   assert.equal(g.phase,'playing');
   const seat=g.turn,legal=B.playable(g,seat);
   assert.ok(legal.length>0);
   if(seat===g.mySeat)B.play(g,legal[0]);
   else{
    const view=Brain.publicView(g,seat);
    const a=Brain.analyze(view,{samples:8,seed:90214+steps});
    assert.equal(a.ok,true,a.reason);
    assert.ok(legal.includes(a.card),type+': illegale Karte '+a.card);
    B.stepBot(g,random(100+steps),{card:a.card});
    brainMoves++;
   }
  }
  assert.equal(g.phase,'done',type);
  const saved=B.toRecord(g);
  assert.equal(E.review(saved).ok,true,type);
  assert.equal(saved.botBrainMoves,brainMoves);
  assert.equal(saved.botEngineVersion,'8.2.0-hybrid');
  assert.equal(saved.tricks.length,8);
 }
});
test('Nicht legale Vorschläge fallen auf die bisherige, legale KI zurück',()=>{
 const g=game();
 B.stepBot(g,random(8),{card:'unbekannte-Karte'});
 assert.equal(g.botFallbackMoves,1);
 assert.equal(g.botBrainMoves||0,0);
 assert.equal(g.current.length,1);
});
test('Oberfläche startet einen Worker und bricht veraltete Berechnungen ab',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../wastl-bots-ui.js'),'utf8');
 assert.match(html,/new Worker\('\.\/wastl-bot-worker\.js'\)/);
 assert.match(html,/function stopBotWorker\(/);
 assert.match(html,/if\(botCard\)prepareBotDecision\(g\)/);
 assert.match(html,/stopBotWorker\(\);\s*if\(game!==g/);
 const worker=fs.readFileSync(path.join(__dirname,'../wastl-bot-worker.js'),'utf8');
 assert.match(worker,/importScripts/);
 assert.match(worker,/WastlBotBrain\.analyze\(data\.view/);
 assert.ok(!worker.includes('initialHands'));
});
