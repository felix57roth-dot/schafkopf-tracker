/* Schafkopf-Einsteigerkurs: Offline-Lektionen, Regelkern, UI, Fortschritt. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../wastl-engine.js');
const Content=require('../schafkopf-kurs-inhalte.js');
const Course=require('../schafkopf-kurs.js');
const store=new Map();
globalThis.localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v))
};
function reset(){store.clear();Course.reset();}
function correctAnswer(q){return Course.expected(q);}
test('Fuenf Kapitel mit 19 Anfaenger-Lektionen und mindestens 40 Uebungen',()=>{
 assert.equal(Content.groups.length,5);
 assert.equal(Content.lessons.length,19);
 assert.ok(Course.stats().questions>=40);
 assert.ok(Content.lessons.every(l=>l.facts.length>=3&&l.exercises.length>=2&&l.example?.cards?.length>0));
 assert.ok(Content.lessons.every(l=>l.example.cards.every(c=>!!E.parse(c))));
});
test('Jede Bedienen-Uebung hat genau eine regelkonforme Pflichtkarte',()=>{
 for(const l of Content.lessons)for(const q of l.exercises){
  if(q.kind!=='legal')continue;
  const legal=E.legalMoves(q.hand,q.lead,q.game,{past:[],trickIndex:0});
  assert.equal(legal.length,1,'Mehrdeutig in '+l.id);
  assert.equal(Course.choices(q)[Course.expected(q)].card,legal[0]);
 }
});
test('Alle Stichgewinner und Wissensantworten sind vom Regelkern bestaetigt',()=>{
 for(const l of Content.lessons)for(const q of l.exercises){
  const expected=Course.expected(q);
  assert.ok(expected>=0&&expected<Course.choices(q).length,'Keine Antwort in '+l.id);
  if(q.kind==='winner')assert.equal(q.cards[expected],q.cards[E.winnerIndex(q.cards,q.game)]);
  if(q.kind==='quiz')assert.ok(q.why.length>=10);
 }
});
test('Grundkurs beginnt ohne gespeicherte Daten und erlaubt nur erste Lektion',()=>{
 reset();
 assert.equal(Course.stats().completed,0);
 assert.equal(Course.stats().percent,0);
 assert.equal(Course.isUnlocked('start'),true);
 assert.equal(Course.isUnlocked('wenz'),false);
 assert.equal(Course.open('wenz'),false);
 assert.match(Course.render(),/Von der ersten Karte zum ersten Schafkopfspiel/);
 assert.match(Course.render(),/disabled aria-disabled/);
});
test('Bei falscher Antwort kann erneut probiert werden; kein Gratis-Abschluss',()=>{
 reset();assert.equal(Course.open('start'),true);
 const q=Course.current(),wrong=(Course.expected(q)+1)%Course.choices(q).length;
 assert.equal(Course.answer(wrong).correct,false);
 assert.equal(Course.next(),false);
 assert.equal(Course.stats().completed,0);
 assert.match(Course.render(),/Noch nicht ganz/);
 assert.equal(Course.answer(Course.expected(q)).correct,true);
 assert.equal(Course.answer(wrong),null);
 assert.equal(Course.next(),true);
 assert.equal(Course.stats().completed,0);
});
test('Kompletter Kurs wird nur nach 43 geloesten Fragen abgeschlossen',()=>{
 reset();
 for(const [i,l] of Content.lessons.entries()){
  assert.equal(Course.isUnlocked(l.id),true,'Lektion gesperrt '+l.id);
  assert.equal(Course.open(l.id),true);
  for(let j=0;j<l.exercises.length;j++){
   const q=Course.current();
   assert.equal(Course.answer(Course.expected(q)).correct,true,l.id+' '+j);
   assert.equal(Course.next(),true,l.id+' '+j);
  }
  assert.equal(Course.stats().completed,i+1);
 }
 const s=Course.stats();
 assert.equal(s.completed,s.total);
 assert.equal(s.percent,100);
 assert.equal(s.finished,true);
 assert.match(Course.render(),/Jetzt gegen Bots üben/);
 assert.match(Course.render(),/data-tab="bots"/);
});
test('Wiederholung einer absolvierten Lektion loescht keine bereits gespeicherten Erfolge',()=>{
 reset();
 Course.open('start');
 while(Course.current()){Course.answer(Course.expected(Course.current()));Course.next();}
 assert.equal(Course.stats().completed,1);
 Course.open('start');
 assert.equal(Course.stats().completed,1);
 assert.equal(Course.open('wenz'),false);
 assert.equal(Course.isUnlocked('farben'),true);
});
test('Lernfortschritt ueberlebt Export, Import und JSON-Roundtrip',()=>{
 reset();Course.restore({version:1,completed:['start','farben','karten']},'replace');
 const before=Course.exportData();
 reset();
 const result=Course.restore(JSON.parse(JSON.stringify(before)),'replace');
 assert.equal(result.ok,true);
 assert.deepEqual(Course.exportData(),before);
 assert.equal(Course.stats().completed,3);
});
test('Backup-Zusammenfuehrung behaelt erledigte Lektionen; altes Backup loescht nichts',()=>{
 reset();
 Course.restore({version:1,completed:['start','farben']},'replace');
 Course.restore({version:1,completed:['karten']},'merge');
 assert.deepEqual(Course.exportData().completed,['start','farben','karten']);
 Course.restore(null,'replace');
 assert.equal(Course.stats().completed,3);
});
test('Fehlerhafte Sicherungen werden vor dem Einspielen abgelehnt',()=>{
 reset();
 assert.throws(()=>Course.validImport({version:5,completed:['start']}));
 assert.throws(()=>Course.validImport({version:1,completed:['falsche-lektion']}));
 assert.throws(()=>Course.validImport({version:1,completed:'start'}));
 assert.equal(Course.stats().completed,0);
});
test('Kursansicht zeigt echte Offline-Karten, interaktive Fragen und ein Lexikon',()=>{
 reset();Course.open('start');
 let html=Course.render();
 assert.match(html,/cards\/eichel-A.webp/);
 assert.match(html,/data-sk-action="answer"/);
 assert.match(html,/Aufgabe 1 \/ 2/);
 Course.handleAction('glossary');
 html=Course.render();
 assert.match(html,/Dein Schafkopf-Lexikon/);
 assert.match(html,/Davonlaufen/);
});
test('Kurs bekommt eigenen sechsten mobilen Menuepunkt und Backups',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/\['learn','Lernen','learn'\]/);
 assert.match(html,/tab==='learn'\?window\.SchafkopfKurs\?\.render/);
 assert.match(html,/schafkopf-kurs-inhalte\.js/);
 assert.match(html,/schafkopf-kurs\.css/);
 assert.match(html,/beginnerCourse:window\.SchafkopfKurs\?\.exportData/);
 assert.match(html,/beginnerCourse:window\.SchafkopfKurs\?\.validImport/);
 assert.match(html,/SchafkopfKurs\?\.restore\(importCandidate\.beginnerCourse,mode\)/);
 const css=fs.readFileSync(path.join(__dirname,'../schafkopf-kurs.css'),'utf8');
 assert.match(css,/\.nav\.sk-nav-six/);
 assert.match(css,/\.sk-options\.card-options/);
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 for(const asset of ['schafkopf-kurs.js','schafkopf-kurs-inhalte.js','schafkopf-kurs.css'])
  assert.ok(sw.includes('"./'+asset+'"'),asset+' fehlt im Offlinecache');
});


test('Trumpfreihenfolge zeigt alle 14 Rufspiel-, 14 Solo- und vier Wenz-Truempfe in korrekter Ordnung',()=>{
 const configs=[
  ['trumpf',{type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'},14],
  ['solo',{type:'solo',trumpSuit:'gras',declarerSeat:'vh'},14],
  ['wenz',{type:'wenz',declarerSeat:'vh'},4]
 ];
 for(const [id,game,count] of configs){
  const lesson=Content.lessons.find(l=>l.id===id);
  assert.ok(lesson?.trumpGroups?.length>=1,'Keine visuelle Reihe in '+id);
  const cards=lesson.trumpGroups.flatMap(group=>group.cards);
  assert.equal(cards.length,count,'Kartenanzahl in '+id);
  assert.equal(new Set(cards).size,count,'Doppelte Trumpfbilder in '+id);
  assert.deepEqual(new Set(cards),new Set(E.FULL.filter(card=>E.isTrump(card,game))),id);
  assert.ok(cards.every(c=>!!E.parse(c)&&E.isTrump(c,game)));
  for(let i=0;i<cards.length-1;i++){
   assert.ok(E.compare(cards[i],cards[i+1],cards[i],game)<0,
    'Falsche Trumpf-Reihenfolge: '+cards[i]+' vor '+cards[i+1]+' ('+id+')');
  }
  for(const group of lesson.trumpGroups){
   assert.ok(Number.isInteger(group.start)&&group.start>=1);
   assert.ok(group.cards.length>=4);
  }
 }
});
test('Fehlfarbe wird in Alltagssprache anhand normaler Karte und Trumpf erklaert',()=>{
 const l=Content.lessons.find(x=>x.id==='bedienen');
 assert.match(l.facts.join(' '),/keine falsche Karte/i);
 assert.match(l.facts.join(' '),/Eichel-Ober.*Trumpf/i);
 assert.equal(l.comparisons.length,2);
 assert.deepEqual(l.comparisons.map(x=>x.card),['eichel-7','eichel-O']);
 const game={type:'rufspiel',calledSuit:'eichel',declarerSeat:'vh'};
 assert.equal(E.isTrump('eichel-7',game),false);
 assert.equal(E.isTrump('eichel-O',game),true);
 assert.equal(l.steps.length,3);
 assert.ok(l.summary.includes('Fehlfarbe'));
});
test('Trumpfkarten erscheinen nummeriert mit echten Kartenbildern',()=>{
 reset();const before=Content.lessons.slice(0,Content.lessons.findIndex(l=>l.id==='trumpf')).map(l=>l.id);
 Course.restore({version:1,completed:before},'replace');
 assert.equal(Course.open('trumpf'),true);
 const html=Course.render();
 assert.match(html,/Trumpfreihenfolge als Kartenbilder/);
 assert.match(html,/Rang 1/);
 assert.match(html,/Rang 14/);
 assert.match(html,/cards\/eichel-O.webp/);
 assert.match(html,/cards\/herz-7.webp/);
 assert.equal((html.match(/class="sk-ranked-card"/g)||[]).length,14);
 assert.match(html,/Kurz gesagt/);
});
test('Stichgewinner zeigt zwei berechnete und richtig hervorgehobene Beispiele',()=>{
 reset();const before=Content.lessons.slice(0,Content.lessons.findIndex(l=>l.id==='stichgewinner')).map(l=>l.id);
 Course.restore({version:1,completed:before},'replace');
 assert.equal(Course.open('stichgewinner'),true);
 const l=Content.lessons.find(x=>x.id==='stichgewinner');
 assert.equal(l.scenes.length,2);
 for(const scene of l.scenes)assert.ok(E.winnerIndex(scene.cards,scene.game)>=0);
 const html=Course.render();
 assert.match(html,/Zwei echte Stichbeispiele/);
 assert.equal((html.match(/class="sk-scene-winner"/g)||[]).length,0); // Klasse steht zusammen mit sk-scene-card.
 assert.equal((html.match(/sk-scene-card sk-scene-winner/g)||[]).length,2);
 assert.match(html,/Gewinner: Eichel Zehn/);
 assert.match(html,/Gewinner: Herz Ober/);
 assert.match(html,/So gehst du Schritt für Schritt vor/);
});
test('Lernfortschritt und altes Sicherungsformat bleiben nach dem Update kompatibel',()=>{
 reset();const done=['start','farben','karten','ablauf','bedienen'];
 const old={version:1,completed:done};
 assert.equal(Course.restore(old,'replace').ok,true);
 assert.deepEqual(Course.exportData(),old);
 assert.equal(Course.stats().completed,5);
 assert.equal(Course.isUnlocked('trumpf'),true);
 assert.equal(Course.VERSION,'1.1.0');
 assert.equal(Content.VERSION,'1.1.0');
 assert.ok(Course.stats().questions>=46);
});

test('Start ist als dritter von sechs Menüpunkten möglichst mittig angeordnet',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const nav=html.match(/document\.getElementById\('nav'\)\.innerHTML=(\[\[[^\n]*?\]\])/);
 assert.ok(nav,'Navigation muss vorhanden sein');
 const ids=[...nav[1].matchAll(/\['(home|capture|bots|learn|stats|mentor)','/g)].map(m=>m[1]);
 assert.deepEqual(ids,['capture','bots','home','learn','stats','mentor']);
 assert.equal(ids.length,6);
 assert.equal(ids.indexOf('home'),2);
});
