/* Wastl 5.3: reproduzierbare Schafkopf-Kurzkommentare.
 * node --test tests/wastl-speech.test.js
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Speech=require('../wastl-speech.js');
const A=require('../wastl-match-analysis.js');
function game(type='solo'){return {id:'sprachtest',type,trumpSuit:'herz',calledSuit:'eichel',declarerSeat:'vh',mySeat:'mh'};}
function report(played='eichel-7',best='gras-K',clear=true){
 return {ok:true,actual:played,reference:{card:best,winRate:.8,meanEyes:75},
  recorded:{card:played,winRate:.4,meanEyes:40},clearAlternative:clear,
  candidates:[{card:played,winRate:.4,meanEyes:40},{card:best,winRate:.8,meanEyes:75}]};
}
function data(r){return {reports:Array.from({length:8},()=>r)};}
test('190 eigenstaendige Kurzkommentare in mindestens 15 Kontext-Kategorien',()=>{
 assert.ok(Speech.phraseCount>=150);
 assert.ok(Speech.categoryCount>=15);
});
test('Acht Stiche verwenden nie dieselbe Schablone, auch bei gleicher Situation',()=>{
 const g=game(),r=report();
 const texts=Array.from({length:8},(_,i)=>Speech.short(g,i,{data:data(r),ready:true}));
 assert.equal(new Set(texts).size,8);
 assert.ok(texts.every(t=>t.length<=140));
});
test('Auswahl bleibt stabil, egal in welcher Reihenfolge Stiche angesehen werden',()=>{
 const g=game(),r=report(),opts={data:data(r),ready:true};
 const earlier=Speech.short(g,2,opts);
 Speech.short(g,7,opts);
 assert.equal(Speech.short(g,2,opts),earlier);
 assert.equal(Speech.short(g,7,opts),Speech.short(g,7,opts));
});
test('Erzwungene Karten bekommen niemals eine Empfehlung fuer Alternativen',()=>{
 const g=game(),r={ok:false,onlyLegal:true};
 assert.equal(Speech.category(g,0,r,true),'forced');
 const text=Speech.short(g,0,{data:data(r),ready:true});
 assert.ok(!/„/.test(text),text);
});
test('Keine Analyse oder fehlerhafte Aufzeichnung erzeugt keine erfundenen Tipps',()=>{
 const g=game();
 assert.equal(Speech.category(g,1,null,true),'unanalysed');
 assert.equal(Speech.category(g,1,report(),false),'invalid');
 const without=Speech.short(g,1,{data:null,ready:true});
 const invalid=Speech.short(g,1,{data:data(report()),ready:false});
 assert.ok(without&&invalid);
 assert.ok(!/„/.test(without)&&!/„/.test(invalid));
});
test('Nur vom Modell klar belegte Alternativen werden als besser empfohlen',()=>{
 const g=game();
 assert.equal(Speech.category(g,1,report('eichel-7','gras-K',true),true),'clearEyes');
 assert.equal(Speech.category(g,1,report('eichel-7','gras-K',false),true),'unclearDefault');
 assert.match(Speech.short(g,1,{data:data(report('eichel-7','gras-K',false)),ready:true}),/Modell|Rechnung|Vergleich|Alternative|denkbar|Züge|Stichproben|sicher|Urteil|eindeutig|Fehler|nachgewiesen|klar|Karten|Wege/);
});
test('Trumpfsparen nur bei wirklich trumpffreier Alternative',()=>{
 const g=game();
 assert.equal(Speech.category(g,0,report('herz-O','eichel-7',true),true),'clearTrump');
 assert.notEqual(Speech.category(g,0,report('herz-O','herz-U',true),true),'clearTrump');
 assert.equal(Speech.category(g,0,report('eichel-7','herz-U',true),true),'clearNonTrump');
});
test('Wenz, Rufspiel, Ramsch und Ende der Partie erhalten eigene passende Aussagen',()=>{
 assert.equal(Speech.category(game('wenz'),0,report('eichel-7','gras-K',false),true),'unclearWenz');
 assert.equal(Speech.category(game('rufspiel'),0,report('eichel-7','gras-K',false),true),'unclearRuf');
 assert.equal(Speech.category(game('ramsch'),0,report('eichel-7','gras-K',true),true),'clearRamsch');
 assert.equal(Speech.category(game('solo'),7,report('eichel-7','gras-K',false),true),'unclearLate');
});
test('Modellentscheidung fuer bereits gespielte Karte fuehrt zu Lob mit Vorbehalt',()=>{
 const g=game(),r=report('herz-U','herz-U',false);
 assert.equal(Speech.category(g,0,r,true),'bestTrump');
 const text=Speech.short(g,0,{data:data(r),ready:true});
 assert.ok(!/statt/.test(text));
});
test('Kompatibilitaet: Alte Analysen und Modellnoten bleiben erreichbar',()=>{
 assert.equal(typeof A.shortExplanation,'function');
 assert.equal(typeof A.quality,'function');
 assert.equal(typeof Speech.short,'function');
});
