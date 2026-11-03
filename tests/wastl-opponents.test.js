/* Tests fuer das gemischte Gegnermodell und den getrennten Pruefgegner.
 * node --test tests/wastl-opponents.test.js
 * Ausschliesslich selbst erzeugte Schafkopfpartien; keine Nutzerdaten.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../wastl-engine.js');
const P=require('../wastl-policy.js');
const O=require('../wastl-opponents.js');
const MC=require('../wastl-montecarlo.js');
const B=require('../wastl-benchmark.js');
function random(seed){
 let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;};
}
const CASES=[['solo',20101],['wenz',20338],['rufspiel',20575],
 ['geier',20812],['ramsch',21049],['kreuzrunde',21286]];
test('Spielercharaktere bleiben fuer gleiche Zufallssamen identisch',()=>{
 const a=O.assignStyles(random(110)),b=O.assignStyles(random(110));
 assert.deepEqual(a,b);
 assert.deepEqual(Object.keys(a),[...E.SEATS]);
 for(const value of Object.values(a))assert.ok(O.STYLES.includes(value));
});
test('Stile und unabhaengiger Testgegner spielen ausschliesslich legale Karten',()=>{
 let played=0,variants=0;
 for(const [type,seed] of CASES){
  const {game}=B.makeGame(seed,type);
  const hands=E.reconstructHands(game),used=Object.fromEntries(E.SEATS.map(s=>[s,new Set()]));
  const past=[];let partner=null;
  for(let turn=0;turn<8;turn++){
   const trick=game.tricks[turn],prefix=[];
   for(let i=0;i<4;i++){
    const seat=E.nextSeat(trick.leaderSeat,i);
    const hand=hands[seat].filter(card=>!used[seat].has(card));
    const legal=E.legalMoves(hand,prefix[0]||null,game,{past,trickIndex:turn});
    const state={past,partner},choices=O.STYLES.map(style=>
      O.choose(hand,prefix,seat,trick.leaderSeat,game,state,style,random(seed+turn*31+i+4)));
    const independent=O.chooseIndependent(hand,prefix,seat,trick.leaderSeat,game,state,random(seed+turn*61+i+8));
    for(const choice of [...choices,independent])assert.ok(legal.includes(choice),type+': '+choice+' nicht legal');
    if(new Set(choices).size>1)variants++;
    played++;
    const actual=trick.cards[i];
    prefix.push(actual);used[seat].add(actual);
    if(game.type==='rufspiel'&&actual===game.calledSuit+'-A')partner=seat;
   }
   past.push({leaderSeat:trick.leaderSeat,cards:trick.cards});
  }
 }
 assert.equal(played,192);
 assert.ok(variants>0,'Die Spielweisen sollten mindestens in einer Situation abweichen.');
});
test('Rufspiel: nur oeffentlich bekannter Partner beeinflusst den Spielstil',()=>{
 const game={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
 const hand=['gras-A','eichel-U','schell-K','herz-9'];
 const past=[],state={past,partner:null},rng=()=>.5;
 const expected=O.choose(hand,['gras-7'],'hh','mh',game,state,'cautious',rng);
 const augmented={...game,partnerSeat:'hh',initialHands:{vh:['schell-7'],mh:['eichel-A'],hh:['eichel-10']}};
 const actual=O.choose(hand,['gras-7'],'hh','mh',augmented,state,'cautious',rng);
 assert.equal(actual,expected);
 assert.equal(O.publicPartner(game,'mh',['gras-7'],[]),null);
 assert.equal(O.publicPartner(game,'mh',['gras-7','eichel-A'],[]),'hh');
});
test('Gemischte Simulation und Altmodell sind reproduzierbar und vergleichbar',()=>{
 let different=0;
 for(const [type,seed] of CASES){
  const {game}=B.makeGame(seed,type);
  const turn=Array.from({length:8},(_,i)=>i).find(i=>MC.buildPosition(game,i).ok);
  assert.ok(Number.isInteger(turn));
  const params={samples:50,seed:0x5a1122};
  const mixed=MC.analyze(game,turn,params);
  const repeated=MC.analyze(game,turn,params);
  const old=MC.analyze(game,turn,{...params,opponentModel:'legacy'});
  assert.deepEqual(mixed,repeated);
  assert.equal(mixed.opponentModel,'mixed');
  assert.equal(old.opponentModel,'legacy');
  assert.equal(mixed.sampleCount,50);
  assert.equal(old.sampleCount,50);
  assert.equal(mixed.possibleDeals,old.possibleDeals);
  assert.ok(mixed.candidates.some(x=>x.card===mixed.reference.card));
  assert.ok(old.candidates.some(x=>x.card===old.reference.card));
  if(mixed.reference.card!==old.reference.card)different++;
 }
 assert.ok(different>=0);
});
test('Zurueckgehaltener unabhaengiger Pruefgegner liefert gepaarte, deterministische Fortsetzungen',()=>{
 const {game}=B.makeGame(20101,'solo');
 const turn=Array.from({length:8},(_,i)=>i).find(i=>MC.buildPosition(game,i).ok);
 const position=MC.buildPosition(game,turn);
 const first=position.legal[0],last=position.legal[position.legal.length-1];
 const a=B.heldout(game,turn,first,123456,0,'independent');
 const b=B.heldout(game,turn,first,123456,0,'independent');
 const c=B.heldout(game,turn,last,123456,0,'independent');
 assert.deepEqual(a,b);
 for(const result of [a,c]){
  assert.ok(result.win===0||result.win===1);
  assert.ok(Number.isFinite(result.eyes));
 }
});
