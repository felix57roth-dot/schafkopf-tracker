/* Wastl Rufspiel 7.25: neuer Referenzgegner und getrennte Entscheidungsstudie.
 * CI: node --test tests/wastl-rufspiel-reference.test.js
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../wastl-engine.js');
const B=require('../wastl-bots.js');
const Ref=require('../wastl-reference-opponent.js');
const Brain=require('../wastl-bot-brain.js');
const Lab=require('./wastl-rufspiel-reference-study.js');
const T=require('../wastl-tactics.js');
function random(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function sampleHand(seed=154){return B.deal(random(seed));}
test('Referenzgegner implementiert eigene Taktik ohne WastlPolicy/Opponents/Tactics',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../wastl-reference-opponent.js'),'utf8');
 assert.match(src,/require\('\.\/wastl-engine\.js'\)/);
 assert.ok(!/require\('\.\/wastl-(?:policy|opponents|tactics|montecarlo|bot-brain)\.js'\)/.test(src));
 assert.deepEqual(Ref.STYLES,['resource','tempo']);
});
test('Referenzgegner darf aus versteckten Karten keine Informationen beziehen',()=>{
 const game={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
 const hand=['gras-7','gras-A','schell-9','herz-U','herz-7','eichel-K','schell-O','gras-K'];
 const args=[hand,[],'hh','hh',game,{past:[]},'resource',()=>.5];
 const normal=Ref.choose(...args);
 const manipulated={...game,hands:{vh:['eichel-A']},initialHands:{hh:['eichel-A']},
  partnerSeat:'hh',futureTricks:[{cards:['eichel-A']}]};
 assert.equal(normal,Ref.choose(hand,[],'hh','hh',manipulated,{past:[]},'resource',()=>.5));
});
test('Referenzgegner respektiert Bedienpflicht und Ruffarb-Sonderregel',()=>{
 const g={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
 const hand=['eichel-A','eichel-K','gras-10','gras-9'];
 for(const style of Ref.STYLES){
  const played=['eichel-9'],seat='mh';
  const move=Ref.choose(hand,played,seat,'vh',g,{past:[]},style,()=>.5);
  assert.equal(move,'eichel-A');
  assert.ok(E.legalMoves(hand,played[0],g,{past:[],trickIndex:0}).includes(move));
 }
});
test('Beide Referenz-Spielstile waehlen nur regelkonforme Karten',()=>{
 const hands=sampleHand(5178),g={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
 for(const style of Ref.STYLES)for(const seat of E.SEATS){
  const hand=hands[seat];
  const legal=E.legalMoves(hand,null,g,{past:[],trickIndex:0});
  const chosen=Ref.choose(hand,[],seat,seat,g,{past:[]},style,random(22));
  assert.ok(legal.includes(chosen),style+' '+seat+' '+chosen);
 }
});
test('Referenzgegner ist mit festem Seed reproduzierbar',()=>{
 const hands=sampleHand(204),g={type:'rufspiel',calledSuit:'gras',declarerSeat:'vh'};
 for(const style of Ref.STYLES){
  const x=Ref.choose(hands.mh,[],'mh','mh',g,{past:[]},style,random(321));
  const y=Ref.choose(hands.mh,[],'mh','mh',g,{past:[]},style,random(321));
  assert.equal(x,y);
 }
});
test('Positionssuche nimmt nur Entscheidungen vor der oeffentlichen Ruf-Sau-Aufdeckung',()=>{
 let found=0;
 for(let i=0;i<30;i++)for(const style of Ref.STYLES){
  const p=Lab.position(i,style);
  if(!p)continue;
  found++;
  const played=p.game.tricks.flatMap(t=>t.cards).concat(p.game.current.map(x=>x.card));
  assert.equal(played.includes(p.game.calledSuit+'-A'),false);
  assert.equal(T.publicPartner(p.game,p.game.tricks,p.game.current.map(x=>x.card),
   p.game.leaderSeat,'partnerAware'),null);
  assert.ok(p.legal.length>=2);
  assert.ok(['ansager','rufpartner','verteidiger'].includes(p.role));
  assert.equal(p.game.turn,p.focal);
 }
 assert.ok(found>=15,'Zu wenig geeignete Rufspielstellungen im Seed-Bereich.');
});
test('Entscheidungsvergleich setzt genau die gewaehlte Karte und spielt regelkonform zu Ende',()=>{
 let p=null;
 for(let i=0;i<20&&!p;i++)p=Lab.position(i,'tempo');
 assert.ok(p);
 const a=Lab.finish(p,p.legal[0]);
 const b=Lab.finish(p,p.legal[0]);
 assert.deepEqual(a,b);
 assert.ok(a.eyes>=0&&a.eyes<=120);
 assert.ok([0,1].includes(a.win));
});
test('Standard-KI unveraendert, Experiment kennt zusaetzlichen Modus knowledgeOnly',()=>{
 let p=null;
 for(let i=0;i<25&&!p;i++)p=Lab.position(i,'resource');
 assert.ok(p);
 const v=Brain.publicView(p.game,p.focal),opts={samples:10,seed:123};
 assert.deepEqual(Brain.analyze(v,opts),
  Brain.analyze(v,{...opts,opponentModel:'tactical'}));
 for(const mode of ['partnerAware','knowledgeOnly']){
  const x=Brain.analyze(v,{...opts,opponentModel:mode});
  assert.equal(x.ok,true,x.reason);
  assert.ok(p.legal.includes(x.card));
  assert.equal(x.opponentModel,mode);
 }
});
test('Die beiden A/B-Referenzreihen sind getrennt und deterministisch',()=>{
 const settings={cases:6,samples:8,model:'knowledgeOnly',styles:['resource','tempo']};
 const a=Lab.study(settings),b=Lab.study(settings);
 assert.deepEqual(a,b);
 assert.equal(a.errors.length,0);
 assert.ok(a.evaluated>0);
 assert.equal(a.overall.cases,a.evaluated);
 assert.equal(a.byRole.ansager.cases+a.byRole.rufpartner.cases+a.byRole.verteidiger.cases,
  a.evaluated);
 const next=Lab.study({...settings,from:1000});
 assert.equal(next.errors.length,0);
 assert.ok(next.evaluated>0);
});
