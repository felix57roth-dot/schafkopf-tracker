/* Wastl 5.4 – Tests fuer offline Bewertungshistorie, Sterne und Backups.
 * node --test tests/wastl-player-profile.test.js
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../wastl-match-analysis.js');
const P=require('../wastl-player-profile.js');
const store=new Map();
globalThis.localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k)
};
function reset(){store.clear();}
function row(i,score=70,source='palast',engine='5.1.0'){
 const hex=(i+1).toString(16).padStart(16,'0');
 return {id:'g-'+i,fingerprint:hex+'-500',source,type:'solo',score,
  informative:4,forced:4,evidence:'mittel',engineVersion:engine,qualityVersion:'5.2.0',
  savedAt:1700000000000+i*86400000,updatedAt:1700000000000+i*86400000,analysisAt:1700000000000+i*86400000};
}
function data(){return {version:1,records:[]};}
function forced(){return {ok:false,onlyLegal:true,version:'5.1.0'};}
function report(){
 const best={card:'eichel-A',winRate:.8,meanEyes:80};
 return {ok:true,actual:'eichel-A',recorded:best,reference:best,
  candidates:[best,{card:'gras-7',winRate:.25,meanEyes:20}],
  sampleCount:160,pairedUncertainty:.04,clearAlternative:false,version:'5.1.0'};
}
function makeGame(id='x',source='palast',flip=false){
 const suits=['eichel','gras','herz','schell'];
 const ranks=['A','10','K','O','U','9','8','7'];
 const cards=suits.flatMap(s=>ranks.map(r=>s+'-'+r));
 if(flip){const [a]=cards.splice(0,1);cards.splice(4,0,a);}
 return {id,type:'solo',trumpSuit:'herz',source,mySeat:'vh',declarerSeat:'hh',
  tricks:Array.from({length:8},(_,k)=>({leaderSeat:'vh',cards:cards.slice(k*4,k*4+4)}))};
}
function analysis(){return {reports:[report(),report(),report(),report(),forced(),forced(),forced(),forced()],finished:1700000000000};}
test('Leere Historie zeigt keine erfundenen Sterne',()=>{
 reset();const s=P.stats();
 assert.equal(s.games,0);assert.equal(s.points,null);assert.equal(s.stars,0);
 assert.match(P.render(),/Noch im Aufbau/);
});
test('Mindestanzahl verhindert voreilige Sternvergabe',()=>{
 reset();P.restore({version:1,records:[row(0,95),row(1,95),row(2,95),row(3,95)]},'replace');
 assert.equal(P.stats().points,null);
 assert.equal(P.stats().neededGames,1);
 P.restore({version:1,records:[row(4,95)]},'merge');
 assert.equal(P.stats().stars,5);
 assert.equal(P.stats().provisional,true);
});
test('Sterne nach 5, 10, 20, 30 Wertungspunkten',()=>{
 reset();
 for(const [quality,stars] of [[50,1],[54,2],[62,3],[79,4],[95,5]]){
  P.restore({version:1,records:Array.from({length:5},(_,i)=>row(i,quality))},'replace');
  assert.equal(P.stats().stars,stars,'quality '+quality);
 }
});
test('Mehr gleich gute Partien allein geben keinen Punktebonus',()=>{
 reset();
 P.restore({version:1,records:Array.from({length:6},(_,i)=>row(i,79))},'replace');
 const old=P.stats();
 P.restore({version:1,records:Array.from({length:18},(_,i)=>row(i+6,79))},'merge');
 const newer=P.stats();
 assert.equal(newer.games,24);
 assert.equal(newer.points,old.points);
 assert.equal(newer.stars,old.stars);
 assert.ok(newer.history.length>old.history.length);
});
test('Botpartien beeinflussen offizielle Wastl-Sterne nicht',()=>{
 reset();P.restore({version:1,records:Array.from({length:5},(_,i)=>row(i,62))},'replace');
 const prior=P.stats();
 P.restore({version:1,records:Array.from({length:15},(_,i)=>row(i+20,100,'bot'))},'merge');
 const after=P.stats();
 assert.equal(after.stars,prior.stars);
 assert.equal(after.points,prior.points);
 assert.equal(after.botAnalyzed,15);
});
test('Andere Engine-Versionen werden nicht stillschweigend in neue Punkte gemischt',()=>{
 reset();P.restore({version:1,records:Array.from({length:5},(_,i)=>row(i,70))},'replace');
 const prior=P.stats();
 P.restore({version:1,records:[row(100,100,'palast','4.9.0')]},'merge');
 assert.equal(P.stats().games,prior.games);
 assert.equal(P.stats().points,prior.points);
 assert.equal(P.stats().unrated,1);
});
test('Analyse wird genau einmal erfasst – auch mit neuem Partienamen',()=>{
 reset();const g=makeGame(),a=analysis();
 assert.equal(P.record(g,a).ok,true);
 assert.equal(P.record(g,a).changed,false);
 assert.equal(P.record({...g,id:'umbenannt'},a).changed,false);
 assert.equal(P.stats().allAnalyzed,1);
});
test('Korrigierte Partie mit gleicher ID aktualisiert statt zu duplizieren',()=>{
 reset();const g=makeGame(),a=analysis();P.record(g,a);
 assert.equal(P.record(makeGame('x','palast',true),a).ok,true);
 assert.equal(P.stats().allAnalyzed,1);
});
test('Alle Werte ueberstehen JSON-Export und -Import ohne Datenverlust',()=>{
 reset();const initial=Array.from({length:8},(_,i)=>row(i,80));
 P.restore({version:1,records:initial},'replace');
 const before=P.stats(),backup=JSON.parse(JSON.stringify(P.exportData()));
 reset();const res=P.restore(backup,'replace');
 assert.equal(res.ok,true);
 assert.deepEqual(P.stats().history,before.history);
 assert.equal(P.stats().points,before.points);
 assert.equal(P.read().length,8);
});
test('Import: Zusammenfuehren entfernt Dubletten und bewahrt neue Eintraege',()=>{
 reset();P.restore({version:1,records:[row(0),row(1)]},'replace');
 P.restore({version:1,records:[row(1),row(2)]},'merge');
 assert.equal(P.read().length,3);
});
test('Altes Backup ohne Wastl-Teil loescht keine Sterne',()=>{
 reset();P.restore({version:1,records:Array.from({length:5},(_,i)=>row(i,80))},'replace');
 const before=P.stats().points;
 assert.equal(P.restore(null,'replace').ok,true);
 assert.equal(P.stats().points,before);
});
test('Fehlerhafte Backup-Historie wird ohne Veraenderung abgewiesen',()=>{
 reset();P.restore({version:1,records:[row(0)]},'replace');
 assert.throws(()=>P.validImport({version:1,records:[{unsafe:true}]}));
 assert.equal(P.read().length,1);
});
test('Realistisch gespeicherte Analyse zeichnet qualitative Partie nur einmal auf',()=>{
 reset();const x=P.record(makeGame('a','palast'),analysis());
 assert.equal(x.ok,true);
 assert.ok(x.record.score>=0&&x.record.score<=100);
 assert.equal(x.record.informative,4);
 assert.equal(P.read().length,1);
});
test('Entwicklungskurve rendert bei mehrfacher Bewertung ein SVG',()=>{
 reset();P.restore({version:1,records:Array.from({length:7},(_,i)=>row(i,65+i*2))},'replace');
 const html=P.render();
 assert.match(html,/class="wpp-chart"/);
 assert.match(html,/polyline/);
 assert.match(html,/aria-label=/);
});

test('Bisheriger Analyse-Cache wird ohne neue Simulation einmalig nachgetragen',()=>{
 reset();const game=makeGame('cached','palast');
 A.save(game,analysis().reports,160);
 const first=P.syncArchived([game]);
 assert.equal(first,1);
 assert.equal(P.stats().allAnalyzed,1);
 assert.equal(P.syncArchived([game]),0);
 assert.equal(P.stats().allAnalyzed,1);
});
test('Speicherfehler darf vorhandene Spielerhistorie nicht veraendern',()=>{
 reset();
 P.restore({version:1,records:[row(0)]},'replace');
 const before=JSON.stringify(P.exportData());
 const initial=globalThis.localStorage.setItem;
 globalThis.localStorage.setItem=()=>{throw Error('Speicher voll')};
 try {
  const result=P.record(makeGame('quota'),analysis());
  assert.equal(result.ok,false);
  assert.equal(JSON.stringify(P.exportData()),before);
 }finally{globalThis.localStorage.setItem=initial;}
});
