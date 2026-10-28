/* Wastl Stammtisch 6.5 – eigenständige Offline-Tischoberfläche.
 * Ein Bot = eine sichtbare Entscheidung. Keine Eingriffe ins Kassenbuch.
 */
(function(){
 'use strict';
 const B=window.WastlBots,E=window.WastlEngine;
 const KEY='schafkopf-botspiel-v1';
 const POSITIONS={vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'};
 const SUITS={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schellen'};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
 const face=(id,cls='')=>`<img draggable="false" class="bots-face ${cls}" src="./cards/${encodeURIComponent(id)}.webp" alt="${esc(id.replace('-',' '))}">`;
 let game=null,error='',timer=null;
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(old&&old.version===6&&B.SEATS.includes(old.mySeat)&&
    ['bidding','chooseGame','playing','trickDone','done','noGame'].includes(old.phase)&&
    old.initialHands&&old.hands&&Array.isArray(old.tricks)&&old.tricks.length<=8)game=old;
 }catch(e){console.warn('Stammtisch konnte nicht geladen werden:',e);}
 function save(){
  try{if(game)localStorage.setItem(KEY,JSON.stringify(game));else localStorage.removeItem(KEY);return true;}
  catch(e){error='Speicher ist voll. Bitte Speicherplatz freigeben.';return false;}
 }
 function cancelTimer(){if(timer!==null){clearTimeout(timer);timer=null;}}
 function seatLabel(g,seat){return B.personAt(g,seat).name;}
 function relative(g,seat){
  const offset=(B.SEATS.indexOf(seat)-B.SEATS.indexOf(g.mySeat)+4)%4;
  // Positionen im UHRZEIGERSINN: unten -> links -> oben -> rechts.
  return ['bottom','left','top','right'][offset];
 }
 function currentSpeaker(g){
  if(g.phase==='bidding'&&g.bidCursor<4)return B.SEATS[g.bidCursor];
  if(g.phase==='playing')return g.turn;
  return null;
 }
 function turnAnnouncement(g){
  if(g.phase==='bidding')return g.bidCursor<4?'Ansage: '+seatLabel(g,B.SEATS[g.bidCursor])+' ist dran':'Ansagerunde beendet';
  if(g.phase==='chooseGame')return 'Wähle deine Spielart';
  if(g.phase==='playing')return seatLabel(g,g.turn)+' legt als Nächstes';
  if(g.phase==='trickDone')return 'Stich beendet';
  if(g.phase==='done')return 'Runde beendet';
  return 'Neue Karten';
 }
 function schedule(){
  if(timer!==null||!game||typeof tab==='undefined'||tab!=='bots')return;
  const g=game;
  const botBid=g.phase==='bidding'&&g.bidCursor<4&&B.SEATS[g.bidCursor]!==g.mySeat;
  const botCard=g.phase==='playing'&&g.turn!==g.mySeat;
  const nextTrick=g.phase==='trickDone';
  if(!botBid&&!botCard&&!nextTrick)return;
  // Langsame, einzeln erkennbare Spielzüge. Ein kompletter Stich wird
  // zunächst gezeigt, bevor er automatisch eingesammelt wird.
  const duration=nextTrick?1900:botBid?1350:1150;
  timer=setTimeout(()=>{
   timer=null;if(game!==g||tab!=='bots')return;
   try{
    if(g.phase==='trickDone')B.nextTrick(g);
    else B.stepBot(g);
    save();renderApp();
   }catch(e){error=e?.message||String(e);renderApp();}
  },duration);
 }
 function archiveCompleted(){
  if(!game||game.phase!=='done'||game.savedId)return;
  try{
   const record=B.toRecord(game);
   if(stitch.archive.some(item=>item.id===record.id)){game.savedId=record.id;save();return;}
   stitch.archive.push(record);
   if(!saveStitch()){stitch.archive.pop();throw Error('Archiv konnte nicht gespeichert werden.');}
   game.savedId=record.id;save();
  }catch(e){error='Partie noch nicht archiviert: '+String(e.message||e);}
 }
 function title(g){
  if(!g.type)return 'Ansagerunde';
  if(g.type==='rufspiel')return 'Rufspiel '+SUITS[g.calledSuit];
  if(g.type==='solo')return 'Solo '+SUITS[g.trumpSuit];
  return 'Wenz';
 }
 function score(g){
  if(!g.declarerSeat)return null;
  const partner=g.type==='rufspiel'?B.SEATS.find(s=>g.initialHands[s].includes(g.calledSuit+'-A')):null;
  const aceVisible=g.type!=='rufspiel'||g.tricks.some(t=>t.cards.includes(g.calledSuit+'-A'))||g.current.some(x=>x.card===g.calledSuit+'-A');
  if(!aceVisible&&g.phase!=='done')return null;
  const team=[g.declarerSeat,...(partner?[partner]:[])],mine=team.includes(g.mySeat);
  const us=g.tricks.filter(t=>team.includes(t.winnerSeat)===mine).reduce((v,t)=>v+t.eyes,0);
  return {us,them:g.tricks.reduce((v,t)=>v+t.eyes,0)-us,mine};
 }
 function startUI(){
  return `<section class="bots-intro">
   <button class="bots-exit-start" type="button" data-bots-exit aria-label="Zur Startseite">← Zurück</button>
   <img src="./wastl.png" alt="Wastl">
   <h2>Servus am Stammtisch!</h2>
   <p>Resi, Sepp und Xaver sitzen schon bereit. Der erste Platz wird ausgelost, danach wechselt der Geber jede Runde.</p>
   <button class="bots-gold-btn" type="button" data-bots-new>🃏 Hinsetzen und Karten geben</button>
   <small>Offline-Training · keine Änderung deiner Geldbilanz</small>
  </section>`;
 }
 function cardMenu(g){
  const allowed=B.bidOptions(g.hands[g.mySeat],g.best);
  const group=(type,label,icon)=>{
   const offers=allowed.filter(o=>o.type===type);
   if(!offers.length)return '';
   return `<div class="bots-choice-row"><div class="bots-choice-name">${esc(label)}</div>
    <div class="bots-choice-cards">${offers.map(o=>{
     const id=o.type==='rufspiel'?o.calledSuit+'-A':o.type==='solo'?o.trumpSuit+'-O':'eichel-U';
     const value=o.type+':'+(o.calledSuit||o.trumpSuit||'');
     return `<button class="bots-game-card" type="button" data-bots-bid="${esc(value)}" title="${esc(o.label)}" aria-label="${esc(o.label)}">
       ${face(id)}<small>${esc(o.type==='wenz'?'Wenz':SUITS[o.calledSuit||o.trumpSuit])}</small>
      </button>`;
    }).join('')}</div></div>`;
  };
  return `<div class="bots-shade"><section class="bots-pick-panel" role="dialog" aria-label="Spielauswahl">
   <header><strong>Spielauswahl</strong><button type="button" data-bots-back aria-label="Zurück">✕</button></header>
   <p class="bots-pick-help">Wähle deine Spielart</p>
   ${group('rufspiel','Rufspiel')}
   ${group('solo','Solo')}
   ${group('wenz','Wenz')}
   <p class="bots-pick-foot">Geier, Bettel und Tout gehören noch nicht zu diesem Trainingsmodus.</p>
  </section></div>`;
 }
 function bidOverlay(g){
  if(g.phase==='chooseGame')return cardMenu(g);
  if(g.phase!=='bidding'||B.SEATS[g.bidCursor]!==g.mySeat)return '';
  const opts=B.bidOptions(g.hands[g.mySeat],g.best);
  return `<section class="bots-mid-action" aria-label="Deine Spielansage">
   <h3>Du bist dran!</h3>
   <div class="bots-main-actions"><button type="button" class="bots-gold-btn" data-bots-choose ${opts.length?'':'disabled'}>Spielen</button>
    <button type="button" class="bots-gold-btn" data-bots-pass>Weiter</button></div>
   ${g.best?`<small>Aktuell: ${esc(g.best.label)} von ${esc(seatLabel(g,g.best.seat))}</small>`:''}
  </section>`;
 }
 function speech(g,seat){
  const a=g.lastAction;
  if(a&&a.seat===seat){
   // Die längste Ansage sonst an Randplätzen abgeschnitten: kurzer Sprechtext.
   const spoken=a.kind==='bid'?a.text.replace(/^Spiele\s+/,''):a.text;
   return `<span class="bots-bubble bots-bubble-done" role="status">${esc(spoken)}</span>`;
  }
  if(!a&&currentSpeaker(g)===seat)return `<span class="bots-bubble">${seat===g.mySeat?'Du bist dran!':'Überlegt …'}</span>`;
  return '';
 }
 function portrait(g,pos){
  const seat=B.SEATS.find(s=>relative(g,s)===pos);
  const person=B.personAt(g,seat),acting=currentSpeaker(g)===seat;
  const bubble=speech(g,seat);
  const bid=g.bids?.find(b=>b.seat===seat);
  const announced=bid?(bid.offer?bid.offer.label:'Weiter'):'';
  return `<div class="bots-player bots-player-${pos} ${acting?'bots-player-active':''}">
   ${bubble}
   <img src="${esc(person.portrait)}" alt="${esc(person.name)}" draggable="false">
   <div class="bots-player-label"><b>${esc(person.name)}</b><small>${esc({vh:'VH',mh:'MH',hh:'HH',g:'G'}[seat])}${announced?' · '+esc(announced):''}</small></div>
   </div>`;
 }
 function playedCards(g){
  let cards=g.current.map(x=>({seat:x.seat,id:x.card}));
  if((g.phase==='trickDone'||g.phase==='done')&&g.lastTrick){
   cards=g.lastTrick.cards.map((id,i)=>({seat:E.nextSeat(g.lastTrick.leaderSeat,i),id}));
  }
  return cards.map(x=>`<div class="bots-played bots-played-${relative(g,x.seat)}" data-bots-card-key="${esc(x.seat+':'+x.id)}">${face(x.id)}</div>`).join('');
 }
 function board(g){
  const active=currentSpeaker(g),status=g.phase==='trickDone'||g.phase==='done'?
   `${seatLabel(g,g.lastTrick?.winnerSeat)} gewinnt · ${g.lastTrick?.eyes||0} Augen`:
   g.phase==='playing'?`Stich ${g.tricks.length+1} / 8`:`Runde ${g.round} · ${turnAnnouncement(g)}`;
  return `<div class="bots-scene">
   <div class="bots-wood" aria-label="Bayerischer Schafkopftisch">
    <svg class="bots-plank-lines" viewBox="0 0 700 560" preserveAspectRatio="none" aria-hidden="true">
     <path d="M175 0 L-160 560 M265 0 L65 560 M325 0 L255 560 M375 0 L445 560 M440 0 L645 560 M525 0 L860 560" fill="none" stroke="#4b2b13" stroke-opacity=".48" stroke-width="5"/>
     <path d="M178 0 L-157 560 M268 0 L68 560 M328 0 L258 560 M378 0 L448 560 M443 0 L648 560 M528 0 L863 560" fill="none" stroke="#f5d6a1" stroke-opacity=".42" stroke-width="3"/>
     <path d="M110 98 Q165 108 230 93 M450 180 Q505 174 565 183 M75 326 Q150 337 225 319 M375 420 Q455 413 560 438" fill="none" stroke="#74471f" stroke-opacity=".19" stroke-width="5"/>
    </svg>
    <img class="bots-reference-scene" src="./players/stammtisch-szene.webp" alt="" aria-hidden="true" draggable="false">
    ${portrait(g,'left')}${portrait(g,'top')}${portrait(g,'right')}
    <div class="bots-playing-area" aria-label="Ausgelegte Karten">
      ${playedCards(g)}
      <div class="bots-wood-center">${esc(status)}</div>
    </div>
    <div class="bots-self-spot ${active===g.mySeat?'bots-self-active':''}">
     ${speech(g,g.mySeat)}
    </div>
    ${bidOverlay(g)}
    ${g.phase==='noGame'?`<div class="bots-mid-action"><h3>Alle haben weiter gesagt.</h3><button type="button" class="bots-gold-btn" data-bots-round>Neue Karten geben</button></div>`:''}
    ${g.phase==='done'?finish(g):''}
   </div>
  </div>`;
 }
 function hand(g){
  const active=g.phase==='playing'&&g.turn===g.mySeat;
  const legal=active?new Set(B.playable(g,g.mySeat)):new Set();
  const sorted=B.sortHand(g.hands[g.mySeat],g.type?g:{type:'rufspiel'});
  return `<section class="bots-hand">
   <div class="bots-hand-heading"><b>Deine Karten</b><span>${sorted.length} Karten · ${esc(POSITIONS[g.mySeat])}${g.bids?.some(b=>b.seat===g.mySeat)?' · '+esc((g.bids.find(b=>b.seat===g.mySeat).offer?.label)||'Weiter'):''}</span></div>
   <div class="bots-hand-row" aria-label="Deine acht Handkarten">
    ${sorted.map((id,i)=>`<button type="button" class="bots-card-button ${legal.has(id)?'playable':'locked'}" aria-label="${esc(id.replace('-',' '))} ${legal.has(id)?'spielen':'nicht spielbar'}" data-bots-play="${esc(id)}" ${legal.has(id)?'':'disabled'}>${face(id)}</button>`).join('')}
   </div>
   ${active?'<p class="bots-play-prompt">Du bist dran – tippe auf eine Karte.</p>':''}
  </section>`;
 }
 function finish(g){
  const r=B.result(g),archived=!!g.savedId&&stitch.archive.some(x=>x.id===g.savedId);
  return `<section class="bots-finish"><h3>${r?.win?'🏆 Gewonnen!':'Runde beendet'}</h3>
   <p>${esc(title(g))} · ${r?.declarerEyes||0} Augen für die Ansagerpartei</p>
   <div class="bots-finish-actions"><button class="bots-gold-btn" data-bots-round type="button">Nochmal spielen</button>
   <button class="bots-analyze-btn" data-bots-analyze type="button" ${archived?'':'disabled'}>Mit Wastl analysieren</button></div>
   <small>Der Geber wechselt automatisch mit der nächsten Runde.</small>
  </section>`;
 }
 function render(){
  if(!game)return `<div class="bots-page bots-page-start">${startUI()}</div>`;
  if(game.phase==='done')archiveCompleted();
  schedule();
  const g=game,sc=score(g);
  return `<section class="bots-page">
   <header class="bots-hud"><button class="bots-exit" type="button" data-bots-exit aria-label="Zur Startseite">←</button><div><small>♠ SCHAFKOPF-STAMMTISCH</small>
    <strong>${esc(title(g))}</strong>
    <span>Runde ${g.round} · ${esc(turnAnnouncement(g))}</span></div>
    <button class="bots-reset" type="button" data-bots-abandon aria-label="Partie verlassen">↺ Neu</button></header>
   ${error?`<div class="bots-error" role="alert">${esc(error)}</div>`:''}
   ${board(g)}
   ${g.phase!=='noGame'?hand(g):''}
   <footer class="bots-tally">${sc?`Dein Team: ${sc.us} Augen <span>Gegner: ${sc.them}</span>`:'Die Karten bleiben für die anderen Spieler verdeckt.'}
   </footer>
  </section>`;
 }
 // Karten nicht erneut zeichnen: Das bisherige DOM bleibt erhalten, nur die
 // neue Stichkarte wird angefügt. Der sonst übliche App-Render ersetzt
 // #main.innerHTML vollständig und löste das sichtbare Flackern aus.
 function renderApp(){
  const root=document.querySelector('.bots-page');
  if(!root||!game||root.classList.contains('bots-page-start')||typeof document.createElement!=='function'){
   if(typeof window.render==='function')window.render();return;
  }
  const template=document.createElement('template');
  template.innerHTML=render().trim();
  const next=template.content.firstElementChild;
  if(!next||!next.querySelector('.bots-wood')||!root.querySelector('.bots-wood')){
   if(typeof window.render==='function')window.render();return;
  }
  const currentWood=root.querySelector('.bots-wood'),newWood=next.querySelector('.bots-wood');
  const swap=(selector,oldScope=root,newScope=next)=>{
   const existing=oldScope.querySelector(selector),incoming=newScope.querySelector(selector);
   if(existing&&incoming)existing.replaceWith(incoming);
   else if(existing)existing.remove();
   else if(incoming)oldScope.appendChild(incoming);
  };
  // Kopf, Punkte und Bedienelemente dürfen aktualisiert werden; die Tischszene
  // und ihre Kartenbilder dagegen bleiben dieselben DOM-Elemente.
  swap('.bots-hud');
  const oldError=root.querySelector('.bots-error'),freshError=next.querySelector('.bots-error');
  if(oldError)oldError.remove();
  if(freshError)root.querySelector('.bots-hud')?.after(freshError);
  for(const pos of ['left','top','right']){
   const current=currentWood.querySelector('.bots-player-'+pos);
   const fresh=newWood.querySelector('.bots-player-'+pos);
   if(!current||!fresh)continue;
   current.className=fresh.className;
   const img=current.querySelector('img'),newImg=fresh.querySelector('img');
   if(img&&newImg&&img.getAttribute('src')!==newImg.getAttribute('src'))img.setAttribute('src',newImg.getAttribute('src'));
   const label=current.querySelector('.bots-player-label'),newLabel=fresh.querySelector('.bots-player-label');
   if(label&&newLabel&&label.innerHTML!==newLabel.innerHTML)label.innerHTML=newLabel.innerHTML;
   const existingBubble=current.querySelector('.bots-bubble'),newBubble=fresh.querySelector('.bots-bubble');
   if(existingBubble&&!newBubble)existingBubble.remove();
   else if(existingBubble&&newBubble){
    if(existingBubble.textContent!==newBubble.textContent)existingBubble.textContent=newBubble.textContent;
    existingBubble.className=newBubble.className;
   }else if(newBubble)current.prepend(newBubble);
  }
  const field=currentWood.querySelector('.bots-playing-area'),freshField=newWood.querySelector('.bots-playing-area');
  if(field&&freshField){
   const anchor=field.querySelector('.bots-wood-center');
   const currentCards=new Map(Array.from(field.querySelectorAll('.bots-played')).map(node=>[node.dataset.botsCardKey,node]));
   const needed=new Set();
   for(const incoming of freshField.querySelectorAll('.bots-played')){
    const key=incoming.dataset.botsCardKey;needed.add(key);
    if(!currentCards.has(key))field.insertBefore(incoming,anchor);
   }
   for(const [key,node] of currentCards)if(!needed.has(key))node.remove();
   const nextStatus=freshField.querySelector('.bots-wood-center');
   if(anchor&&nextStatus&&anchor.textContent!==nextStatus.textContent)anchor.textContent=nextStatus.textContent;
  }
  swap('.bots-self-spot',currentWood,newWood);
  for(const selector of ['.bots-mid-action','.bots-shade','.bots-finish'])swap(selector,currentWood,newWood);
  const hand=root.querySelector('.bots-hand'),nextHand=next.querySelector('.bots-hand');
  if(hand&&nextHand){
   swap('.bots-hand-heading',hand,nextHand);
   const row=hand.querySelector('.bots-hand-row'),future=nextHand.querySelector('.bots-hand-row');
   if(row&&future){
    const existing=new Map(Array.from(row.querySelectorAll('[data-bots-play]')).map(node=>[node.dataset.botsPlay,node]));
    const target=[];
    for(const button of future.querySelectorAll('[data-bots-play]')){
     const own=existing.get(button.dataset.botsPlay)||button;
     own.className=button.className;
     own.disabled=button.disabled;
     own.setAttribute('aria-label',button.getAttribute('aria-label'));
     target.push(own);
    }
    const expected=new Set(target);
    for(const button of [...row.children])if(!expected.has(button))button.remove();
    target.forEach((button,i)=>{
     if(row.children[i]!==button)row.insertBefore(button,row.children[i]||null);
    });
   }
   swap('.bots-play-prompt',hand,nextHand);
  }else if(hand)hand.remove();
  else if(nextHand)root.querySelector('.bots-scene')?.after(nextHand);
  swap('.bots-tally');
 }
 function click(e){
  const b=e.target.closest('[data-bots-exit],[data-bots-new],[data-bots-abandon],[data-bots-round],[data-bots-choose],[data-bots-back],[data-bots-bid],[data-bots-pass],[data-bots-play],[data-bots-analyze]');
  if(!b||typeof tab==='undefined'||tab!=='bots')return;
  e.preventDefault();cancelTimer();
  try{
   error='';
   if(b.hasAttribute('data-bots-exit')){
    save();switchTab('home');return;
   }
   if(b.hasAttribute('data-bots-abandon')){
    if(game&&['playing','chooseGame','bidding'].includes(game.phase)&&!confirm('Laufende Runde wirklich beenden?')){schedule();return;}
    game=null;
   }else if(b.hasAttribute('data-bots-new')){
    game=B.create();
   }else if(b.hasAttribute('data-bots-round')){
    game=B.nextRound(game);
   }else if(b.hasAttribute('data-bots-choose')){
    B.chooseToPlay(game);
   }else if(b.hasAttribute('data-bots-back')){
    B.cancelChoice(game);
   }else if(b.hasAttribute('data-bots-bid')){
    const id=b.dataset.botsBid;
    const option=B.bidOptions(game.hands[game.mySeat],game.best).find(x=>x.type+':'+(x.calledSuit||x.trumpSuit||'')===id);
    if(!option)throw Error('Diese Spielart ist nicht zulässig.');
    B.submitBid(game,option);
   }else if(b.hasAttribute('data-bots-pass')){
    B.submitBid(game,null);
   }else if(b.hasAttribute('data-bots-play')){
    B.play(game,b.dataset.botsPlay);
   }else if(b.hasAttribute('data-bots-analyze')){
    if(!game?.savedId||!stitch.archive.some(x=>x.id===game.savedId))throw Error('Partie ist noch nicht archiviert.');
    const id=game.savedId;
    mentorGameId=id;mentorStep=0;switchTab('mentor');
    setTimeout(()=>window.WastlAutoSimulation?.startFor?.(id,350),40);
    return;
   }
   save();renderApp();
  }catch(ex){error=String(ex?.message||ex);renderApp();}
 }
 document.addEventListener('click',click);
 // Die perspektivische Szenengrafik ist optional: Solange sie nicht geladen
 // werden kann, bleiben die einzelnen Originalportraits über dem Holztisch sichtbar.
 document.addEventListener('load',event=>{
  const img=event.target;
  if(img?.classList?.contains('bots-reference-scene'))img.parentElement?.classList.add('bots-art-loaded');
 },true);
 window.WastlBotsUI={render,version:'6.5.0'};
})();
