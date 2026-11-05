/* Wastl Rufspiel-Labor: alte Live-KI bleibt Standard, Experiment nur explizit.
 * node --test tests/wastl-rufspiel-inference.test.js
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../wastl-engine.js');
const B=require('../wastl-bots.js');
const T=require('../wastl-tactics.js');
const Brain=require('../wastl-bot-brain.js');
const Lab=require('./wastl-rufspiel-independent-study.js');
const game={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
function rng(seed){let a=seed>>>0;return()=>((a=(Math.imul(a,1664525)+1013904223)>>>0)/4294967296);}
function validGame(){
 for(let i=1;i<80;i++){
  const hands=B.deal(rng(i*791)),aceOwner=E.SEATS.find(s=>hands[s].includes('eichel-A'));
  const declarer=E.SEATS.find(s=>s!==aceOwner&&B.bidOptions(hands[s],null,s)
   .some(o=>o.type==='rufspiel'&&o.calledSuit==='eichel'));
  if(!declarer)continue;
  const g=B.create({hands,mySeat:E.nextSeat(declarer,1)});
  Object.assign(g,{phase:'playing',type:'rufspiel',calledSuit:'eichel',
   declarerSeat:declarer,leaderSeat:declarer,turn:declarer,current:[],tricks:[]});
  return g;
 }
 throw Error('Kein legaler Rufspiel-Testfall gefunden.');
}
test('Die neue Partnerinferenz ist nur im expliziten Testmodus aktiv',()=>{
 const g=validGame(),view=Brain.publicView(g,g.turn),options={samples:12,seed:777};
 assert.deepEqual(Brain.analyze(view,options),
  Brain.analyze(view,{...options,opponentModel:'tactical'}));
 const experimental=Brain.analyze(view,{...options,opponentModel:'partnerAware'});
 assert.equal(experimental.ok,true,experimental.reason);
 assert.equal(experimental.opponentModel,'partnerAware');
 assert.ok(B.playable(g,g.turn).includes(experimental.card));
});
test('Eigene Ruf-Sau: versteckter Partner kennt seine Mannschaft selbst',()=>{
 const situation=T.situational(['eichel-A','gras-9'],['gras-10'],
  'hh','mh',game,{past:[]},'partnerAware');
 assert.equal(situation.ownSide,'attack');
 assert.equal(situation.opponentAhead,true);
 assert.equal(situation.revealedPartner,false);
});
test('Ohne eigene Ruf-Sau kennt ein Nichtansager seine Verteidigerrolle',()=>{
 const situation=T.situational(['gras-A','schell-9'],['gras-10'],
  'hh','vh',game,{past:[]},'partnerAware');
 assert.equal(situation.ownSide,'defense');
 assert.equal(situation.opponentAhead,true);
 assert.equal(T.situational(['gras-A','schell-9'],['gras-10'],
  'hh','vh',game,{past:[]},'legacy').ownSide,'unknown');
});
test('Andere Nichtansager bleiben ohne Aufdeckung unbekannt',()=>{
 const s=T.situational(['gras-A','schell-9'],['gras-10'],
  'hh','mh',game,{past:[]},'partnerAware');
 assert.equal(s.ownSide,'defense');
 assert.equal(s.ahead,'unknown');
 assert.equal(s.teammateAhead,false);
 assert.equal(s.opponentAhead,false);
});
test('Davonlaufen: komplette Ruffarben-Runde ohne Ruf-Sau enthuellt Anspieler',()=>{
 const run={leaderSeat:'mh',cards:['eichel-9','eichel-K','herz-7','eichel-10']};
 assert.equal(T.publicPartner(game,[run],[],'vh','partnerAware'),'mh');
 assert.equal(T.publicPartner(game,[run],[],'vh'),null);
});
test('Davonlaufen darf aus einem noch offenen Stich nicht erfunden werden',()=>{
 const begun={leaderSeat:'mh',cards:['eichel-9','eichel-K']};
 assert.equal(T.publicPartner(game,[begun],[],'vh','partnerAware'),null);
 assert.equal(T.publicPartner(game,[],begun.cards,'mh','partnerAware'),null);
});
test('Unpassende Fehlfarbe oder Ansager-Anspiel sind kein Davonlaufen',()=>{
 const other={leaderSeat:'mh',cards:['gras-9','gras-10','herz-7','gras-K']};
 const declarerLead={leaderSeat:'vh',cards:['eichel-9','eichel-K','herz-7','eichel-10']};
 assert.equal(T.publicPartner(game,[other],[],'vh','partnerAware'),null);
 assert.equal(T.publicPartner(game,[declarerLead],[],'vh','partnerAware'),null);
});
test('Explizit gesehene Ruf-Sau hat Vorrang vor anderer Partnerannahme',()=>{
 const ace={leaderSeat:'vh',cards:['gras-9','eichel-A','gras-10','herz-7']};
 assert.equal(T.publicPartner(game,[ace],[],'vh','partnerAware'),'mh');
 assert.equal(T.publicPartner(game,[],['gras-9','eichel-A'],'vh','partnerAware'),'mh');
});
test('Manipuliertes verborgenes partnerSeat verrät dem Versuchsbot nichts',()=>{
 const hand=['gras-7','schell-K','herz-9','gras-A'],prefix=['gras-10'];
 const args=[hand,prefix,'hh','vh',game,{past:[]},'balanced','partnerAware'];
 const one=T.score(...args);
 const fake={...game,partnerSeat:'hh',initialHands:{mh:['eichel-A']}};
 const two=T.score(hand,prefix,'hh','vh',fake,{past:[],partner:'hh',initialHands:{hh:['eichel-A']}},'balanced','partnerAware');
 assert.deepEqual(one,two);
});
test('Wenz-Entscheidungen aendern sich im Rufspiel-Experiment nicht',()=>{
 const wenz={type:'wenz',declarerSeat:'vh'},hand=['eichel-U','gras-K','eichel-7'];
 const args=[hand,['gras-A'],'hh','vh',wenz,{past:[]},'balanced'];
 assert.deepEqual(T.score(...args,'legacy'),T.score(...args,'partnerAware'));
});
test('Getrenntes Rufspiel-Labor liefert regelkonforme und reproduzierbare Ausgaenge',()=>{
 const s=Lab.scenario(6);
 assert.ok(s);
 assert.equal(s.role,'ansager');
 const x=Lab.play(s,'tactical',8),y=Lab.play(s,'tactical',8);
 assert.deepEqual(x,y);
 assert.ok(x.eyes>=0&&x.eyes<=120);
 assert.ok([0,1].includes(x.win));
});
