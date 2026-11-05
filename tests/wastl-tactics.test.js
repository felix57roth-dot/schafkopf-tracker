/* Wastl 8.2: Wenz und Rufspiel – taktische und Regel-Regressionstests.
 * node --test tests/wastl-tactics.test.js
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../wastl-engine.js');
const P=require('../wastl-policy.js');
const T=require('../wastl-tactics.js');
const B=require('../wastl-bots.js');
const Brain=require('../wastl-bot-brain.js');
const Game=require('./wastl-bot-tournament.js');
function rng(seed){let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
test('Wenz: ausschliesslich Unter sind Trumpf, Ober bleiben normale Farbkarten',()=>{
 const g={type:'wenz',declarerSeat:'vh'};
 for(const suit of E.SUITS){assert.equal(E.isTrump(suit+'-U',g),true);assert.equal(E.isTrump(suit+'-O',g),false);}
});
test('Wenz: Eichel-Unter nicht ohne Not auf einen Mitspieler-Stich legen',()=>{
 const g={type:'wenz',declarerSeat:'vh'};
 const hand=['eichel-U','herz-7','gras-9','eichel-A'];
 const cards=['schell-A','gras-U'];
 const info=T.situational(hand,cards,'hh','vh',g,{past:[]});
 assert.equal(info.teammateAhead,true);
 const rows=T.score(hand,cards,'hh','vh',g,{past:[]});
 const ober=rows.find(x=>x.card==='eichel-U');
 assert.ok(ober.adjustment<=-5,'Top-Unter soll hier geschont werden');
 assert.notEqual(T.choose(hand,cards,'hh','vh',g,{past:[]},'balanced',()=>.5),'eichel-U');
});
test('Rufspiel: ohne Aufdeckung keinen verborgenen Partnerplatz annehmen',()=>{
 const game={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh',partnerSeat:'hh'};
 const hand=['gras-7','gras-9','schell-K','herz-7'];
 const publicState={past:[]};
 const neutral=T.situational(hand,['gras-A'],'mh','vh',game,publicState);
 assert.equal(neutral.revealedPartner,false);
 assert.equal(neutral.ownSide,'unknown');
 assert.equal(neutral.teammateAhead,false);
 const fake={...game,partnerSeat:'mh',initialHands:{vh:['eichel-A'],hh:['gras-10']}};
 assert.deepEqual(T.score(hand,['gras-A'],'mh','vh',game,publicState),
  T.score(hand,['gras-A'],'mh','vh',fake,publicState));
});
test('Rufspiel: nur selbst gehaltenes oder offen gespieltes Ruf-Ass zeigt Partner an',()=>{
 const game={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
 const hand=['eichel-A','gras-10','schell-7'];
 const prior=[];
 assert.equal(T.situational(hand,[],'mh','mh',game,{past:prior}).ownSide,'attack');
 const fromPast=[{leaderSeat:'vh',cards:['gras-9','eichel-A','gras-K','herz-7']}];
 assert.equal(T.situational(['gras-9','gras-10'],[],'hh','hh',game,{past:fromPast}).partner,'mh');
});
test('Rufspiel: Augen zum bekannten Partner, nicht blind zu fremden Gewinnern',()=>{
 const g={type:'rufspiel',calledSuit:'eichel',declarerSeat:'g'};
 const prior=[{leaderSeat:'vh',cards:['schell-7','eichel-A','herz-7','gras-7']}];
 const hand=['gras-10','gras-9'],cards=['gras-7','gras-A','schell-9'];
 const info=T.situational(hand,cards,'g','vh',g,{past:prior});
 assert.equal(info.teammateAhead,true);
 assert.equal(info.last,true);
 const tall=T.score(hand,cards,'g','vh',g,{past:prior});
 assert.ok(tall.find(x=>x.card==='gras-10').adjustment>tall.find(x=>x.card==='gras-9').adjustment);
});
test('Gegnerische/versteckte Handdaten beeinflussen Taktik nicht',()=>{
 const g={type:'wenz',declarerSeat:'vh'};
 const hand=['eichel-U','gras-9','eichel-A'];
 const p1={past:[],partnerSeat:'hh',initialHands:{g:['eichel-A']}};
 const p2={past:[],partnerSeat:'vh',initialHands:{g:['gras-10']}};
 const args=[hand,['schell-A','gras-U'],'hh','vh',g];
 assert.deepEqual(T.score(...args,p1),T.score(...args,p2));
});
test('Alle Stilentscheidungen bleiben in Rufspiel und Wenz regelkonform',()=>{
 for(const type of ['rufspiel','wenz']){
  const g={type,calledSuit:'eichel',trumpSuit:'herz',declarerSeat:'vh'};
  const hands=B.deal(rng(type==='wenz'?111:222));
  for(const seat of E.SEATS){
   for(const style of ['balanced','cautious','assertive']){
    const card=T.choose(hands[seat],[],seat,seat,g,{past:[]},style,()=>.5);
    assert.ok(E.legalMoves(hands[seat],null,g,{past:[],trickIndex:0}).includes(card),type+' '+style);
   }
  }
 }
});
test('Alte und neue Live-Engine fuer identische Kartenwelten reproduzierbar',()=>{
 const hands=B.deal(rng(8082)),g=B.create({mySeat:'g',hands});
 Object.assign(g,{type:'wenz',declarerSeat:'vh',phase:'playing',turn:'vh',leaderSeat:'vh'});
 const view=Brain.publicView(g,'vh');
 const classic=Brain.analyze(view,{samples:12,seed:1357,opponentModel:'classic'});
 const tactic=Brain.analyze(view,{samples:12,seed:1357});
 assert.equal(classic.ok,true,classic.reason);
 assert.equal(tactic.ok,true,tactic.reason);
 assert.equal(classic.opponentModel,'classic');
 assert.equal(tactic.opponentModel,'tactical');
 assert.equal(tactic.tacticalVersion,'8.2.0');
 assert.equal(Brain.analyze(view,{samples:12,seed:1357}).card,tactic.card);
 assert.equal(classic.possibleDeals,tactic.possibleDeals);
});
test('Taktikvergleich auf unveraenderten Anfangshaenden produziert gueltige Partien',()=>{
 for(let i=0;i<6;i++){
  const scenario=Game.scenario(i);
  const classic=Game.playGame(scenario,'classic',8);
  const tactical=Game.playGame(scenario,'tactical',8);
  assert.ok([0,1].includes(classic.win)&&[0,1].includes(tactical.win));
  assert.equal(classic.played,8);
  assert.equal(tactical.played,8);
 }
});
