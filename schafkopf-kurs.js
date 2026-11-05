/* Schafkopftracker: Einsteigerkurs. Vollstaendig offline, ohne Tracking.
 * Die Kartenlogik wird fuer alle Stich- und Bedienuebungen vom Regelkern
 * berechnet, nicht aus einer geratenen Antwortliste abgeschrieben.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const C=node?require('./schafkopf-kurs-inhalte.js'):root.SchafkopfKursInhalte;
 const api=factory(root,E,C);
 if(node)module.exports=api;
 if(root)root.SchafkopfKurs=api;
 if(root?.document?.addEventListener){
  root.document.addEventListener('click',event=>{
   const element=event.target?.closest?.('[data-sk-action]');
   if(!element||!event.target?.closest?.('.sk-course'))return;
   const action=element.dataset.skAction;
   if(!api.handleAction(action,element.dataset))return;
   event.preventDefault();
   const main=root.document.getElementById('main');
   if(main&&main.querySelector('.sk-course'))main.innerHTML=api.render();
   if(['open','home','glossary','continue','finish'].includes(action)){
    if(typeof root.scrollTo==='function')root.scrollTo({top:0,behavior:'instant'});
   }else if(action==='answer'){
    main?.querySelector('.sk-feedback')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
   }
  });
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(root,E,C){
 'use strict';
 const VERSION='1.0.0',STORAGE='schafkopf-einsteiger-v1',FORMAT=1;
 const lessons=C.lessons,groups=C.groups,ids=lessons.map(x=>x.id);
 let screen='overview',active=null,step=0,response=null;
 function esc(value){
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&#39;':undefined,"'":'&#39;'}[c]));
 }
 function normalize(data){
  if(!data||data.version!==FORMAT||!Array.isArray(data.completed)||
     data.completed.length>lessons.length)return null;
  if(data.completed.some(id=>typeof id!=='string'||!ids.includes(id)))return null;
  return {version:FORMAT,completed:ids.filter(id=>data.completed.includes(id))};
 }
 function read(){
  try{
   const data=JSON.parse(root.localStorage?.getItem(STORAGE)||'null');
   return normalize(data)||{version:FORMAT,completed:[]};
  }catch{return {version:FORMAT,completed:[]};}
 }
 function write(data){
  try{
   if(!root.localStorage)return false;
   const valid=normalize(data);
   if(!valid)return false;
   root.localStorage.setItem(STORAGE,JSON.stringify(valid));
   return true;
  }catch{return false;}
 }
 function validImport(data){
  if(data==null)return null; // Alte Sicherungen duerfen bestehende Kurse nie loeschen.
  const normalized=normalize(data);
  if(!normalized)throw Error('Ungültiger Einsteigerkurs in der Sicherung.');
  return normalized;
 }
 function exportData(){return read();}
 function restore(data,mode='merge'){
  if(data==null)return {ok:true,changed:false,reason:'Sicherung ohne Einsteigerkurs – vorhandener Fortschritt bleibt erhalten.'};
  const incoming=validImport(data),old=read();
  const merged=mode==='replace'?incoming:
   {version:FORMAT,completed:ids.filter(id=>incoming.completed.includes(id)||old.completed.includes(id))};
  const changed=JSON.stringify(old)!==JSON.stringify(merged);
  if(!changed)return {ok:true,changed:false,completed:old.completed.length};
  if(!write(merged))return {ok:false,reason:'Lernfortschritt konnte nicht gespeichert werden.'};
  return {ok:true,changed:true,completed:merged.completed.length};
 }
 function stats(){
  const completed=read().completed,done=new Set(completed);
  const next=lessons.find(l=>!done.has(l.id));
  return {completed:completed.length,total:lessons.length,
   questions:lessons.reduce((n,l)=>n+l.exercises.length,0),
   percent:Math.round(completed.length/lessons.length*100),
   nextId:next?.id||null,finished:completed.length===lessons.length};
 }
 function isUnlocked(id){
  const n=ids.indexOf(id);
  if(n<0)return false;
  return n===0||read().completed.includes(ids[n-1])||read().completed.includes(id);
 }
 function open(id){
  if(!isUnlocked(id))return false;
  active=id;step=0;response=null;screen='lesson';
  return true;
 }
 function current(){
  if(screen!=='lesson'||!active)return null;
  const l=lessons.find(x=>x.id===active);
  return l?.exercises[step]||null;
 }
 function choices(q){
  if(!q)return [];
  if(q.kind==='quiz')return q.opts.map((label,index)=>({index,label}));
  if(q.kind==='winner')return q.cards.map((card,index)=>({index,card}));
  if(q.kind==='legal')return q.hand.map((card,index)=>({index,card}));
  return [];
 }
 function expected(q){
  if(!q)return -1;
  if(q.kind==='quiz')return q.answer;
  if(q.kind==='winner')return E.winnerIndex(q.cards,q.game);
  if(q.kind==='legal'){
   const allowed=E.legalMoves(q.hand,q.lead,q.game,{past:[],trickIndex:0});
   return allowed.length===1?q.hand.indexOf(allowed[0]):-1;
  }
  return -1;
 }
 function answer(index){
  const q=current(),number=Number(index);
  if(!q||response?.correct||!Number.isInteger(number)||number<0||number>=choices(q).length)return null;
  const correct=expected(q);
  if(correct<0)return null;
  response={selected:number,correct:number===correct};
  return {...response,expected:correct};
 }
 function next(){
  const q=current();
  if(!q||!response?.correct)return false;
  const l=lessons.find(x=>x.id===active);
  if(step<l.exercises.length-1){step++;response=null;return true;}
  const state=read();
  if(!state.completed.includes(l.id)){
   if(!write({version:FORMAT,completed:[...state.completed,l.id]})){
    response=null;return false;
   }
  }
  response=null;screen='done';return true;
 }
 function reset(){
  const result=write({version:FORMAT,completed:[]});
  if(result){screen='overview';active=null;step=0;response=null;}
  return result;
 }
 function cardName(id){
  const p=E.parse(id);if(!p)return 'Unbekannte Karte';
  const suits={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schellen'};
  const ranks={A:'Sau','10':'Zehn',K:'König',O:'Ober',U:'Unter','9':'Neun','8':'Acht','7':'Sieben'};
  return suits[p.suit]+' '+ranks[p.rank];
 }
 function cardImage(card,extra=''){
  if(!E.parse(card))return '';
  return '<span class="sk-card '+extra+'"><img src="./cards/'+card+'.webp" alt="'+esc(cardName(card))+'" loading="lazy"><span>'+esc(cardName(card))+'</span></span>';
 }
 function cardRow(cards,caption=''){
  return '<div class="sk-cards" aria-label="Schafkopfkarten">'+cards.map(card=>cardImage(card)).join('')+'</div>'
   +(caption?'<p class="sk-caption">'+esc(caption)+'</p>':'');
 }
 function renderQuestion(q){
  const opts=choices(q),winner=expected(q),answered=!!response;
  const questionTitle=q.kind==='legal'?'Bedienübung':q.kind==='winner'?'Stichübung':'Wissensfrage';
  const lead=q.kind==='legal'?
   '<div class="sk-lead-card"><b>Angespielt:</b> '+cardImage(q.lead)+'</div>':'';
  const cards=opts.map(({label,card,index})=>{
   const isSelected=answered&&response.selected===index;
   const state=isSelected?(response.correct?' correct':' incorrect'):'';
   const body=card?cardImage(card):'<span>'+esc(label)+'</span>';
   return '<button type="button" class="sk-answer'+state+'" data-sk-action="answer" data-sk-index="'+index+'"'
    +(response?.correct?' disabled':'')+' aria-pressed="'+String(isSelected)+'">'+body+'</button>';
  }).join('');
  const feedback=answered?'<div class="sk-feedback '+(response.correct?'good':'retry')+'" role="status"><b>'
   +(response.correct?'Richtig! Sehr gut.':'Noch nicht ganz. Versuch es noch einmal.')+'</b><p>'+esc(response.correct?q.why:'Tipp: '+(q.kind==='winner'?'Überlege zuerst, welche Farbe angespielt wurde und ob Trumpf liegt.':q.kind==='legal'?'Prüfe die angespielte Farbe und deine eigenen Trümpfe.':'Lies dir die Erklärung über der Frage noch einmal durch.'))+'</p></div>':'';
  return '<div class="sk-question"><div class="sk-eyebrow">'+questionTitle+'</div>'
   +'<h3>'+esc(q.q)+'</h3>'+lead
   +'<div class="sk-options '+(q.kind==='quiz'?'text-options':'card-options')+'">'+cards+'</div>'
   +feedback+(response?.correct?'<button class="sk-primary" type="button" data-sk-action="finish">'
    +(step===lessons.find(l=>l.id===active).exercises.length-1?'Lektion abschließen':'Nächste Frage')+' →</button>':'')
   +'</div>';
 }
 function renderLesson(){
  const l=lessons.find(x=>x.id===active);
  if(!l)return renderOverview();
  const group=groups.find(g=>g.id===l.group),i=ids.indexOf(l.id);
  return '<div class="sk-top-actions"><button type="button" data-sk-action="home">← Lernübersicht</button>'
   +'<span>Lektion '+(i+1)+' von '+lessons.length+'</span></div>'
   +'<section class="sk-lesson"><div class="sk-eyebrow">'+esc(group?.title||'Grundkurs')+' · ca. '+l.minutes+' Min.</div>'
   +'<h2>'+esc(l.title)+'</h2><p class="sk-lead">'+esc(l.lead)+'</p>'
   +'<ul class="sk-facts">'+l.facts.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>'
   +(l.example?'<div class="sk-example"><div class="sk-eyebrow">So sieht das am Kartentisch aus</div><h3>'+esc(l.example.title)+'</h3>'
     +cardRow(l.example.cards,l.example.text)+'</div>':'')
   +'<div class="sk-tip"><span aria-hidden="true">💡</span><p>'+esc(l.tip)+'</p></div>'
   +'<div class="sk-quiz-head"><span>Üben statt nur lesen</span><span>Aufgabe '+(step+1)+' / '+l.exercises.length+'</span></div>'
   +'<div class="sk-quiz-progress"><span style="width:'+Math.round(step/l.exercises.length*100)+'%"></span></div>'
   +renderQuestion(l.exercises[step])
   +'<p class="sk-learn-note">Du kannst bei einem Fehler noch einmal antworten. Erst wenn alle Aufgaben richtig gelöst sind, wird die Lektion gespeichert.</p>'
   +'</section>';
 }
 function renderDone(){
  const l=lessons.find(x=>x.id===active),i=ids.indexOf(active),nextLesson=lessons[i+1];
  return '<section class="sk-finished"><div class="sk-finish-icon" aria-hidden="true">✓</div>'
   +'<div class="sk-eyebrow">Lektion geschafft!</div><h2>'+esc(l?.title||'Geschafft')+'</h2>'
   +'<p>Du hast alle Aufgaben richtig beantwortet. Dein Fortschritt ist auf diesem Gerät gespeichert.</p>'
   +'<div class="sk-done-actions"><button type="button" class="sk-secondary" data-sk-action="home">Zur Lernübersicht</button>'
   +(nextLesson?'<button type="button" class="sk-primary" data-sk-action="continue" data-sk-id="'+esc(nextLesson.id)+'">Weiter: '+esc(nextLesson.title)+' →</button>'
      :'<button type="button" class="sk-primary" data-tab="bots">Jetzt gegen Bots üben →</button>')+'</div>'
   +'</section>';
 }
 function renderOverview(){
  const state=stats(),done=new Set(read().completed);
  const next=lessons.find(l=>l.id===state.nextId);
  return '<div class="sk-overview"><section class="sk-hero"><div class="sk-hero-tag">GRATIS · OFFLINE · SCHRITT FÜR SCHRITT</div>'
   +'<h2>Von der ersten Karte zum ersten Schafkopfspiel.</h2>'
   +'<p>Du brauchst keine Vorkenntnisse. Lerne mit echten Karten, kurzen Erklärungen und kleinen Aufgaben.</p>'
   +'<div class="sk-progress-label"><strong>'+state.completed+' von '+state.total+' Lektionen</strong><span>'+state.percent+' %</span></div>'
   +'<div class="sk-progress-track"><span style="width:'+state.percent+'%"></span></div>'
   +'<button class="sk-primary sk-hero-button" type="button" data-sk-action="'+(state.finished?'glossary':'open')+'"'
    +(state.finished?'':' data-sk-id="'+esc(state.nextId)+'"')+'>'
    +(state.finished?'Begriffe wiederholen':'Jetzt '+(state.completed?'weiterlernen':'loslegen')+' →')+'</button>'
   +'</section>'
   +'<div class="sk-overview-actions"><button data-sk-action="glossary" type="button">📖 Begriffe-Lexikon</button>'
   +'<span>'+state.questions+' kleine Übungsfragen</span></div>'
   +groups.map((group,index)=>{
    const members=lessons.filter(l=>l.group===group.id);
    const completed=members.filter(l=>done.has(l.id)).length;
    const first=lessons.find(l=>l.id===state.nextId);
    const opened=members.some(l=>l.id===first?.id)||(!first&&index===groups.length-1);
    return '<details class="sk-chapter" '+(opened?'open':'')+'><summary><span class="sk-chapter-icon">'+group.emoji+'</span>'
     +'<span class="sk-chapter-heading"><b>'+esc(group.title)+'</b><small>'+esc(group.subtitle)+'</small></span>'
     +'<span class="sk-chapter-count">'+completed+'/'+members.length+'</span><span class="sk-chevron">⌄</span></summary>'
     +'<div class="sk-lesson-list">'+members.map(lesson=>{
      const ready=isUnlocked(lesson.id),complete=done.has(lesson.id);
      return '<button type="button" data-sk-action="open" data-sk-id="'+esc(lesson.id)+'" '+(!ready?'disabled aria-disabled="true"':'')+' class="sk-lesson-link'+(ready?'':' locked')+'">'
        +'<span class="sk-lesson-number">'+(complete?'✓':ready?ids.indexOf(lesson.id)+1:'🔒')+'</span>'
        +'<span><b>'+esc(lesson.title)+'</b><small>'+lesson.minutes+' Minuten · '+lesson.exercises.length+' Aufgaben</small></span>'
        +'<span class="sk-link-arrow">'+(complete?'Wiederholen':ready?'Starten':'Gesperrt')+'</span></button>';
     }).join('')+'</div></details>';
   }).join('')
   +(state.finished?'<section class="sk-ready"><h3>Du bist bereit für deine erste Runde!</h3><p>Jetzt kannst du das Gelernte gegen Resi, Sepp und Xaver ausprobieren.</p><button type="button" class="sk-primary" data-tab="bots">Zum Botspiel →</button></section>':'')
   +'<p class="sk-footnote">Die Lektionen bauen aufeinander auf. Dein Lernstand wird nur auf deinem Gerät gespeichert und ist in der Datensicherung enthalten. Regionale Sonderregeln können abweichen.</p>'
   +(state.completed?'<button type="button" class="sk-reset" data-sk-action="reset">Lernfortschritt zurücksetzen</button>':'')
   +'</div>';
 }
 const glossary=[
 ['Augen','Punkte einer Karte: Sau 11, Zehner 10, König 4, Ober 3, Unter 2, sonst 0.'],
 ['Bedienen','Eine Karte der angespielten Fehlfarbe oder einen geforderten Trumpf spielen, sofern vorhanden.'],
 ['Davonlaufen','Der Ruf-Sau-Besitzer spielt bei mindestens vier Ruffarbenkarten eine kleinere Ruffarbe an.'],
 ['Fehlfarbe','Eine Farbe, deren Karte im jeweiligen Spiel kein Trumpf ist.'],
 ['Geber','Person, die in dieser Runde die Karten gibt. Der nächste Spieler ist Vorhand.'],
 ['Ober','Eine der vier Bildkarten. Beim Rufspiel und Solo Teil der höchsten Trümpfe.'],
 ['Rufspiel','Partnerspiel: Ansager und Besitzer der gerufenen Sau gegen die zwei anderen.'],
 ['Ruf-Sau','Das gerufene Ass in Eichel, Gras oder Schellen; es bestimmt den Partner.'],
 ['Schmieren','Augenreiche Karten in einen vermutlich vom Partner gewonnenen Stich geben.'],
 ['Schneider','Besonders deutlicher Sieg nach den vereinbarten Augen-Grenzen.'],
 ['Schwarz','Eine Partei hat keinen einzigen Stich gemacht.'],
 ['Solo','Ein Spieler allein gegen drei, mit gewählter Trumpffarbe sowie Obern und Untern.'],
 ['Spatzen','Siebener, Achter und Neuner ohne Augen.'],
 ['Stich','Vier Karten, eine von jedem Spieler. Der Gewinner erhält alle Augen darin.'],
 ['Trumpf','Besonders starke Karten, die eine Fehlfarbe stechen können.'],
 ['Unter','Eine der vier Bildkarten. Beim Wenz sind ausschließlich die Unter Trumpf.'],
 ['Wenz','Alleinspiel mit genau vier Trümpfen: Eichel-, Gras-, Herz-, Schellen-Unter.']
 ];
 function renderGlossary(){
  return '<div class="sk-glossary"><button type="button" class="sk-back" data-sk-action="home">← Lernübersicht</button>'
   +'<h2>Dein Schafkopf-Lexikon</h2><p>Alle wichtigen Begriffe auf einen Blick. Du kannst jederzeit hierher zurückkehren.</p>'
   +glossary.map(([term,definition])=>'<div class="sk-glossary-entry"><b>'+esc(term)+'</b><p>'+esc(definition)+'</p></div>').join('')+'</div>';
 }
 function render(){
  return '<div class="content-page sk-course" aria-label="Einsteigerlehrgang Schafkopf">'
   +(screen==='lesson'?renderLesson():screen==='done'?renderDone():screen==='glossary'?renderGlossary():renderOverview())
   +'</div>';
 }
 function handleAction(action,data={}){
  switch(action){
   case 'home':screen='overview';active=null;response=null;return true;
   case 'glossary':screen='glossary';return true;
   case 'open':return open(data.skId);
   case 'answer':return !!answer(data.skIndex);
   case 'finish':return next();
   case 'continue':return open(data.skId);
   case 'reset':
    if(root?.confirm&&!root.confirm('Wirklich den gesamten Lernfortschritt dieses Kurses zurücksetzen?'))return false;
    return reset();
   default:return false;
  }
 }
 return Object.freeze({VERSION,STORAGE,render,stats,read,write,validImport,exportData,
  restore,reset,open,current,choices,expected,answer,next,isUnlocked,handleAction});
});
