/* Wastl Lernbegleiter 1.0 – sicherer Regel- und Taktikunterricht. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../wastl-engine.js');
const Coach=require('../wastl-coach.js');
const B=require('../wastl-bots.js');
const gameRule={type:'rufspiel',calledSuit:'eichel',declarerSeat:'mh'};
function view(hand,lead='gras-10'){
 return {mySeat:'g',turn:'g',phase:'playing',hand:[...hand],
  current:lead?[{seat:'vh',card:lead}]:[],past:[],leaderSeat:'vh',
  ...gameRule};
}
test('Anfaengerhilfe bekommt ausschliesslich die eigene Hand und öffentliche Informationen',()=>{
 const g=B.create({mySeat:'g',random:()=>.3});
 Object.assign(g,{phase:'playing',type:'rufspiel',calledSuit:'eichel',
  declarerSeat:'vh',leaderSeat:'g',turn:'g'});
 const v=Coach.publicView(g);
 assert.ok(v);
 assert.deepEqual(Object.keys(v).sort(),[
  'mySeat','phase','hand','current','past','leaderSeat','turn',
  'type','calledSuit','trumpSuit','declarerSeat','auctionStage','best'].sort());
 assert.deepEqual(v.hand,g.hands.g);
 assert.ok(!Object.hasOwn(v,'hands')&&!Object.hasOwn(v,'initialHands'));
 assert.ok(!Object.hasOwn(v,'partnerSeat')&&!Object.hasOwn(v,'lastTrick'));
 const copy=JSON.stringify(v);
 g.hands.mh=['eichel-7'];g.hands.vh=['gras-7'];g.initialHands.hh=['herz-O'];
 assert.equal(JSON.stringify(Coach.publicView(g)),copy);
});
test('Bedienpflicht erzeugt genau eine sichere Regelantwort',()=>{
 const v=view(['gras-7','herz-O','eichel-9','schell-A']);
 assert.deepEqual(Coach.legal(v),['gras-7']);
 const hint=Coach.hint(v),rule=Coach.rule(v),review=Coach.feedback(v,'gras-7');
 assert.equal(hint.forced,true);
 assert.equal(hint.card,'gras-7');
 assert.equal(rule.forced,true);
 assert.equal(review.forced,true);
 assert.match(review.text,/Bedienpflicht|einzige erlaubte Karte/);
 assert.equal(Coach.feedback(v,'eichel-9').ok,false);
});
test('Regeltext erklaert Fehlfarbe ohne Trumpf-Farbsymbol zu verwechseln',()=>{
 const v=view(['gras-7','gras-9','eichel-O','herz-8']);
 const r=Coach.rule(v);
 assert.match(r.text,/Fehlfarbe/);
 assert.match(r.text,/Ober oder Unter/);
 assert.deepEqual(Coach.legal(v),['gras-7','gras-9']);
});
test('Bei Trumpfanspiel fordert Wastl Trumpf, nicht nur dieselbe Farbe',()=>{
 const v=view(['eichel-O','herz-7','gras-A','schell-10'],'herz-10');
 const moves=Coach.legal(v);
 assert.deepEqual(new Set(moves),new Set(['eichel-O','herz-7']));
 assert.match(Coach.rule(v).text,/Trumpf/);
 assert.ok(Coach.rule(v).text.includes('Trümpfe'));
});
test('Ohne Farbe ist eine andere Karte erlaubt; keine erfundene Stechpflicht',()=>{
 const v=view(['eichel-7','schell-9','herz-7']);
 assert.equal(Coach.legal(v).length,3);
 assert.match(Coach.rule(v).text,/nicht stechen/);
});
test('Der Coach liefert auf Wunsch nur legale Heuristik-Tipps',()=>{
 const v=view(['gras-7','gras-9','eichel-O','herz-8']);
 const h=Coach.hint(v);
 assert.equal(h.ok,true);
 assert.equal(h.forced,false);
 assert.ok(Coach.legal(v).includes(h.card));
 if(h.alternative)assert.ok(Coach.legal(v).includes(h.alternative));
 assert.match(h.text,/keine garantiert beste Karte/);
});
test('Andere legale Karte wird nicht als sicherer Fehler ausgegeben',()=>{
 const v=view(['gras-7','gras-9','eichel-O','herz-8']);
 const hint=Coach.hint(v),other=Coach.legal(v).find(c=>c!==hint.card);
 const feedback=Coach.feedback(v,other);
 assert.equal(feedback.ok,true);
 assert.match(feedback.text,/kein sicherer Fehler/);
 assert.ok(!/schlecht gespielt|falsch gespielt|klarer Fehler/i.test(feedback.text));
});
test('Coach vermerkt ohne laufenden eigenen Zug keine Empfehlung',()=>{
 const v=view(['gras-7','gras-9']);
 assert.equal(Coach.hint({...v,turn:'vh'}).ok,false);
 assert.equal(Coach.hint({...v,phase:'trickDone'}).ok,false);
});
test('Ansagerunde wird ohne unkalibrierte Gewinnversprechen erklaert',()=>{
 const g={...view(['gras-7']),phase:'bidding',auctionStage:'opening'};
 assert.match(Coach.rule(g).text,/Ich spiele/);
 assert.match(Coach.rule({...g,auctionStage:'declaration'}).text,/höherwertigen Spiel/);
 assert.ok(!/Gewinnchance|garantiert/.test(Coach.rule(g).text));
});
test('Wastl ist in Freiem Spiel standardmaessig inaktiv und Optionen bleiben getrennt',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../wastl-bots-ui.js'),'utf8');
 assert.match(html,/coach:\['beginner','advanced','free'\]\.includes\(o\.coach\)\?o\.coach:'free'/);
 assert.match(html,/coachModeButtons\(opts\.coach\)/);
 assert.match(html,/coachModeButtons\(readOptions\(\)\.coach\)/);
 assert.match(html,/if\(mode==='free'\|\|!Coach\)return ''/);
 assert.match(html,/window\.WastlCoach\.feedback\(view,played\)/);
 assert.match(html,/data-bots-coach-hint/);
 assert.match(html,/data-bots-coach-mode/);
 assert.match(html,/coachHint=null;coachFeedback=null/);
 assert.match(html,/bots-card-coach-hint/);
});
test('Coach im Spieltisch und in Offline-PWA eingebunden',()=>{
 const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../wastl-coach.css'),'utf8');
 assert.match(index,/wastl-coach\.js/);
 assert.match(index,/wastl-coach\.css/);
 assert.ok(index.indexOf('src="./wastl-coach.js"')<index.indexOf('src="./wastl-bots-ui.js"'));
 for(const asset of ['wastl-coach.js','wastl-coach.css']){
  assert.ok(sw.includes('"./'+asset+'"'),'Offline-Asset fehlt: '+asset);
 }
 assert.match(css,/\.bots-coach-panel/);
 assert.match(css,/\.bots-coach-modes/);
 assert.match(css,/\.bots-card-button\.bots-card-coach-hint/);
});
test('Keine aenderung an Bot-Partien, Sternen oder Geldabrechnung',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../wastl-coach.js'),'utf8');
 assert.ok(!src.includes('initialHands'));
 assert.ok(!src.includes('localStorage'));
 assert.ok(!src.includes('fetch('));
 assert.ok(!src.includes('WastlPlayerProfile'));
 assert.ok(!src.includes('BANK.'));
 assert.deepEqual(Object.keys(Coach).sort(),['VERSION','publicView','legal','rule','hint','feedback','name'].sort());
});
