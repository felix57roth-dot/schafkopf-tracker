/* Wastl Stammtisch 7.2 – eigenständige Offline-Tischoberfläche.
 * Ein Bot = eine sichtbare Entscheidung. Keine Eingriffe ins Kassenbuch.
 */
(function(){
 'use strict';
 const B=window.WastlBots,E=window.WastlEngine,BANK=window.WastlBotBank;
 const KEY='schafkopf-botspiel-v1';
 const POSITIONS={vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'};
 const SUITS={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schellen'};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
 const face=(id,cls='')=>`<img draggable="false" class="bots-face ${cls}" src="./cards/${encodeURIComponent(id)}.webp" alt="${esc(id.replace('-',' '))}">`;
 let game=null,error='',timer=null,walletOpen=false;
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(old&&[6,7].includes(old.version)&&B.SEATS.includes(old.mySeat)&&
    ['bidding','chooseGame','biddingResult','playing','trickDone','done','noGame'].includes(old.phase)&&
    old.initialHands&&old.hands&&Array.isArray(old.tricks)&&old.tricks.length<=8){
     game=old;
     // Laufende Runden bleiben erhalten. Nur alte, noch unvollständige
     // Spielansagen beginnen mit denselben Karten erneut bei Vorhand.
     if(game.version===6&&['bidding','chooseGame'].includes(game.phase)){
      Object.assign(game,{phase:'bidding',auctionStage:'opening',bidCursor:0,
       bids:[],activeBidders:[],auctionQueue:[],best:null,lastAction:null});
     }
     game.version=7;
     if(game.phase!=='done')game.cashEligible=true;
    }
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
  if(['bidding','chooseGame'].includes(g.phase))return B.bidderSeat(g);
  if(g.phase==='playing')return g.turn;
  return null;
 }
 function turnAnnouncement(g){
  if(g.phase==='bidding'){
   const seat=B.bidderSeat(g);
   return seat?(g.auctionStage==='declaration'?'Spielart: ':'Ansage: ')+seatLabel(g,seat)+' ist dran':'Ansagerunde beendet';
  }
  if(g.phase==='chooseGame')return g.best?'Wähle ein höherwertiges Spiel':'Sage deine Spielart an';
  if(g.phase==='biddingResult')return seatLabel(g,g.best.seat)+' spielt '+g.best.label;
  if(g.phase==='playing')return seatLabel(g,g.turn)+' legt als Nächstes';
  if(g.phase==='trickDone')return 'Stich beendet';
  if(g.phase==='done')return 'Runde beendet';
  return 'Neue Karten';
 }
 function schedule(){
  if(timer!==null||!game||typeof tab==='undefined'||tab!=='bots')return;
  const g=game;
  const botBid=g.phase==='bidding'&&B.bidderSeat(g)!==null&&B.bidderSeat(g)!==g.mySeat;
  const botCard=g.phase==='playing'&&g.turn!==g.mySeat;
  const nextTrick=g.phase==='trickDone';
  const finalBid=g.phase==='biddingResult';
  if(!botBid&&!botCard&&!nextTrick&&!finalBid)return;
  // Langsame, einzeln erkennbare Spielzüge. Ein kompletter Stich wird
  // zunächst gezeigt, bevor er automatisch eingesammelt wird.
  const duration=nextTrick?1900:finalBid?1850:botBid?1350:1150;
  timer=setTimeout(()=>{
   timer=null;if(game!==g||tab!=='bots')return;
   try{
    if(g.phase==='trickDone')B.nextTrick(g);
    else if(g.phase==='biddingResult')B.startPlay(g);
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

 function money(c){return BANK.money(c);}
 function signed(c){return (c>0?'+':'')+money(c);}
 function walletPanel(){
  const w=BANK.load(),cfg=BANK.readSettings();
  const persons=[['you','Du'],['resi','Resi'],['sepp','Sepp'],['xaver','Xaver']];
  return `<div class="bots-wallet-overlay"><section class="bots-wallet-modal" role="dialog" aria-modal="true" aria-label="Stammtischkasse">
   <header><h3>🪙 Stammtischkasse</h3><button type="button" data-bots-wallet-close aria-label="Schließen">✕</button></header>
   <p>Virtuelles Guthaben · getrennt von deiner bisherigen Geldbilanz.</p>
   <div class="bots-wallet-grid">${persons.map(([id,name])=>`<div class="bots-wallet-person"><span>${name}</span><strong>${money(w.balances[id])}</strong></div>`).join('')}</div>
   <div class="bots-wallet-tariffs"><b>Tarife aus Einstellungen</b>
    <span>Rufspiel ${money(cfg.rates.rufspiel)} · Solo/Wenz ${money(cfg.rates.solo)}</span>
    <span>Schneider +${money(cfg.rates.schneider)} · Schwarz +${money(cfg.rates.schwarz)}</span>
    <span>Läufer +${money(cfg.rates.laeufer)} je Karte (Rufspiel ab ${cfg.rufMinRunners})</span>
    <small>Neue Spielpreise gelten bei der nächsten Abrechnung. Schuss/Kontra sind im Botspiel noch nicht verfügbar. Ein negatives Guthaben ist beim Training erlaubt.</small>
   </div>
   <div class="bots-wallet-actions"><button type="button" class="bots-wallet-reset" data-bots-wallet-reset>Alle Guthaben auf 10,00 € zurücksetzen</button><button type="button" class="bots-gold-btn" data-bots-wallet-close>Zurück zum Tisch</button></div>
  </section></div>`;
 }
 function startUI(){
  return `<section class="bots-intro">
   <button class="bots-exit-start" type="button" data-bots-exit aria-label="Zur Startseite">← Zurück</button>
   <img src="./wastl.png" alt="Wastl">
   <h2>Servus am Stammtisch!</h2>
   <p>Resi, Sepp und Xaver sitzen schon bereit. Der erste Platz wird ausgelost, danach wechselt der Geber jede Runde.</p>
   <button class="bots-gold-btn" type="button" data-bots-new>🃏 Hinsetzen und Karten geben</button>
   <small>Offline-Training · eigene virtuelle Spielkasse</small>
    <button type="button" class="bots-wallet-intro-btn" data-bots-wallet>🪙 Guthaben ansehen</button>
    ${walletOpen?walletPanel():''}
  </section>`;
 }
 function cardMenu(g){
  const allowed=B.bidOptions(g.hands[g.mySeat],g.best,g.mySeat);
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
   <p class="bots-pick-help">${g.best?'Du kannst ein höherwertiges Spiel ansagen.':'Du hast „Ich spiele“ gesagt. Welches Spiel sagst du an?'}</p>
   ${group('rufspiel','Rufspiel')}
   ${group('solo','Solo')}
   ${group('wenz','Wenz')}
   <p class="bots-pick-foot">Geier, Bettel und Tout gehören noch nicht zu diesem Trainingsmodus.</p>
  </section></div>`;
 }
 function bidOverlay(g){
  if(g.phase==='chooseGame')return cardMenu(g);
  if(g.phase==='biddingResult')return `<section class="bots-mid-action bots-final-announce" role="status"><h3>${esc(seatLabel(g,g.best.seat))} spielt ${esc(g.best.label)}!</h3><small>Die Spielverhandlung ist abgeschlossen. Gleich wird ausgespielt.</small></section>`;
  if(g.phase!=='bidding'||B.bidderSeat(g)!==g.mySeat)return '';
  const first=g.auctionStage==='opening',opts=first?null:B.bidOptions(g.hands[g.mySeat],g.best,g.mySeat);
  const canPass=first||!!g.best;
  return `<section class="bots-mid-action" aria-label="${first?'Deine Spielabsicht':'Deine Spielart'}">
   <h3>${first?'Möchtest du spielen?':g.best?'Überbieten oder Weiter?':'Welches Spiel sagst du an?'}</h3>
   <div class="bots-main-actions">
    <button type="button" class="bots-gold-btn" data-bots-choose ${!first&&!opts.length?'disabled':''}>${first?'Ich spiele':g.best?'Überbieten':'Spiel ansagen'}</button>
    ${canPass?'<button type="button" class="bots-gold-btn" data-bots-pass>Weiter</button>':''}
   </div>
   ${g.best?`<small>Aktuell: ${esc(g.best.label)} von ${esc(seatLabel(g,g.best.seat))}</small>`:first?'<small>Die Spielart wird erst nach der Runde festgelegt.</small>':''}
  </section>`;
 }
 // Die Ansagen stehen bereits im Titel und in den Namensschildern.
 // Keine Sprechblasen, auch nicht während der Bot-Denkpause.
 function speech(g,seat){return '';}
 function portrait(g,pos){
  const seat=B.SEATS.find(s=>relative(g,s)===pos);
  const person=B.personAt(g,seat),acting=currentSpeaker(g)===seat;
  const bubble=speech(g,seat);
  const bid=g.bids?.slice().reverse().find(b=>b.seat===seat);
  const announced=bid?(bid.offer?bid.offer.label:bid.intent?'Ich spiele':'Weiter'):'';
  // Figuren hinter der Tischkante, Namensschilder auf der Tischkante.
  return `<div class="bots-player bots-player-${pos} ${acting?'bots-player-active':''}">
   ${bubble}
   <img src="${esc(person.portrait)}" alt="${esc(person.name)}" draggable="false">
  </div>
  <div class="bots-seat-label bots-seat-label-${pos} ${acting?'bots-seat-label-active':''}">
   <div class="bots-player-label"><b>${esc(person.name)}</b><small>${esc({vh:'VH',mh:'MH',hh:'HH',g:'G'}[seat])}${announced?' · '+esc(announced):''}</small><span class="bots-seat-cash">${money(BANK.load().balances[person.id])}</span></div>
  </div>
  <div class="bots-portrait-front bots-portrait-front-${pos}" aria-hidden="true">
   <img src="${esc(person.portrait)}" alt="" draggable="false">
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
  const active=currentSpeaker(g);
  return `<div class="bots-scene">
   <div class="bots-wood" aria-label="Bayerischer Schafkopftisch">
    <svg class="bots-plank-lines" viewBox="0 0 700 560" preserveAspectRatio="none" aria-hidden="true">
     <path d="M175 0 L-160 560 M265 0 L65 560 M325 0 L255 560 M375 0 L445 560 M440 0 L645 560 M525 0 L860 560" fill="none" stroke="#4b2b13" stroke-opacity=".48" stroke-width="5"/>
     <path d="M178 0 L-157 560 M268 0 L68 560 M328 0 L258 560 M378 0 L448 560 M443 0 L648 560 M528 0 L863 560" fill="none" stroke="#f5d6a1" stroke-opacity=".42" stroke-width="3"/>
     <path d="M110 98 Q165 108 230 93 M450 180 Q505 174 565 183 M75 326 Q150 337 225 319 M375 420 Q455 413 560 438" fill="none" stroke="#74471f" stroke-opacity=".19" stroke-width="5"/>
    </svg>
    <img class="bots-reference-scene" src="./players/stammtisch-hintergrund-v1.webp" data-art-kind="modern" alt="" aria-hidden="true" draggable="false">
    ${portrait(g,'left')}${portrait(g,'top')}${portrait(g,'right')}
    <div class="bots-playing-area" aria-label="Ausgelegte Karten">
      ${playedCards(g)}
    </div>
    <div class="bots-self-spot ${active===g.mySeat?'bots-self-active':''}">
     ${speech(g,g.mySeat)}
    </div>
    ${bidOverlay(g)}
     ${walletOpen?walletPanel():''}
    ${g.phase==='noGame'?`<div class="bots-mid-action"><h3>Alle haben weiter gesagt.</h3><button type="button" class="bots-gold-btn" data-bots-round>Neue Karten geben</button></div>`:''}
    ${g.phase==='done'?finish(g):''}
   </div>
  </div>`;
 }
 function hand(g){
  const active=g.phase==='playing'&&g.turn===g.mySeat;
  const legal=active?new Set(B.playable(g,g.mySeat)):new Set();
  const sorted=B.sortHand(g.hands[g.mySeat],g.type?g:{type:'rufspiel'});
  return `<section class="bots-hand" style="--fan-count:${sorted.length}">
   <div class="bots-index-finger" aria-hidden="true">
    <img src="./players/zeigefinger.webp" alt="" draggable="false">
   </div>
   <div class="bots-hand-row" style="--fan-count:${sorted.length}" aria-label="Deine ${sorted.length} Handkarten">
    ${sorted.map((id,i)=>{
      const center=(sorted.length-1)/2;
      const tilt=(i-center)*3.4;
      const dip=Math.round(Math.abs(i-center)*3.5);
      return `<button type="button" class="bots-card-button ${legal.has(id)?'playable':'locked'}" style="--fan-angle:${tilt.toFixed(1)}deg;--fan-dip:${dip}px;--fan-layer:${i+1}" aria-label="${esc(id.replace('-',' '))} ${legal.has(id)?'spielen':'nicht spielbar'}" data-bots-play="${esc(id)}" ${legal.has(id)?'':'disabled'}>${face(id)}</button>`;
     }).join('')}
   </div>
   <div class="bots-grip" aria-hidden="true">
    <img src="./players/griffhand.webp" alt="" draggable="false">
   </div>
   ${active?'<p class="bots-play-prompt">Du bist dran – tippe auf eine Karte.</p>':''}
  </section>`;
 }
 function priceReceipt(g,paid){
  if(!paid||!paid.tariff)return '';
  // Berechnung ausschließlich aus dem im Zahlungsbeleg gespeicherten Tarif.
  // Niemals aktuelle Einstellungen verwenden: diese können sich geändert haben.
  const rates=paid.tariff,base=paid.type==='rufspiel'?rates.rufspiel:rates.solo;
  const schneider=paid.schneider?rates.schneider:0;
  const schwarz=paid.schwarz?rates.schwarz:0;
  const runners=(paid.runners||0)*(rates.laeufer||0);
  const perPerson=base+schneider+schwarz+runners;
  const you=paid.deltas?.you??0;
  const mineAsDeclarer=g.declarerSeat&&B.personAt(g,g.declarerSeat)?.id==='you';
  const factor=(paid.type==='solo'||paid.type==='wenz')&&mineAsDeclarer?3:1;
  const all=[['you','Du'],['resi','Resi'],['sepp','Sepp'],['xaver','Xaver']];
  const row=(name,cents,extra='')=>`<div class="bots-receipt-row ${extra}"><span>${esc(name)}</span><strong>${money(cents)}</strong></div>`;
  const eyes=Number.isFinite(paid.declarerEyes)?paid.declarerEyes:0;
  const getStatus=you>0?'Du gewinnst':you<0?'Du verlierst':'Dein Ergebnis';
  return `<div class="bots-receipt-content" aria-label="Genaue Preisauflistung">
   <div class="bots-receipt-highlight ${you<0?'bots-receipt-negative':''}">
    <span>${getStatus}</span><strong>${signed(you)}</strong>
   </div>
   <div class="bots-receipt-subtitle">Ansagerpartei: ${eyes} Augen · Gegner: ${120-eyes} Augen</div>
   <div class="bots-receipt-lines">
    ${row('Grundpreis '+(paid.type==='rufspiel'?'Rufspiel':paid.type==='solo'?'Solo':'Wenz'),base)}
    ${row('Schneider'+(paid.schneider?' ✓':' – nicht erreicht'),schneider)}
    ${row('Schwarz'+(paid.schwarz?' ✓':' – nicht erreicht'),schwarz)}
    ${row((paid.runners||0)+' Laufende'+(paid.runners?' ('+paid.runnersKind+')':''),runners)}
    ${row('Spielwert pro Mitspieler',perPerson,'bots-receipt-subtotal')}
    ${paid.type!=='rufspiel'? `<div class="bots-receipt-rule">${mineAsDeclarer?'Du spielst allein: 3 Gegner × '+money(perPerson):'Solo/Wenz: der Alleinspieler zahlt/erhält 3 × '+money(perPerson)+'; die anderen jeweils 1 ×'}</div>`:''}
    <div class="bots-receipt-row bots-receipt-total"><span>Dein Ergebnis${factor!==1?' (× '+factor+')':''}</span><strong>${signed(you)}</strong></div>
   </div>
   <div class="bots-receipt-table-title">Abrechnung am Stammtisch</div>
   <div class="bots-receipt-players">${all.map(([id,label])=>`<div class="bots-receipt-person ${id==='you'?'bots-receipt-self':''}">
    <span>${label}</span><strong class="${paid.deltas[id]<0?'bots-receipt-loss':''}">${signed(paid.deltas[id])}</strong></div>`).join('')}</div>
   <p class="bots-receipt-caption">Leger: keiner · Schuss: keiner. Diese Ansagen sind im Botspiel noch nicht verfügbar. Die Beträge stammen aus den Spielpreisen zum Zeitpunkt der Abrechnung.</p>
   <div class="bots-receipt-current">Dein aktuelles Guthaben: <strong>${money(BANK.load().balances.you)}</strong></div>
  </div>`;
 }
 function finish(g){
  const r=B.result(g),archived=!!g.savedId&&stitch.archive.some(x=>x.id===g.savedId);
  const paid=BANK.receipt(g);
  return `<section class="bots-finish bots-finish-detailed">
   <h3>${r?.win?'🏆 Gewonnen!':'Runde beendet'}</h3>
   <p>${esc(title(g))} · ${r?.declarerEyes||0} Augen für die Ansagerpartei</p>
   <div class="bots-receipt-scroll">${paid?priceReceipt(g,paid):'<p class="bots-financial-result">Für diese ältere Partie wurde kein virtuelles Guthaben verrechnet.</p>'}</div>
   <div class="bots-finish-actions"><button class="bots-gold-btn" data-bots-round type="button">Nochmal spielen</button>
   <button class="bots-analyze-btn" data-bots-analyze type="button" ${archived?'':'disabled'}>Mit Wastl analysieren</button></div>
   <small>Der Geber wechselt automatisch mit der nächsten Runde.</small>
  </section>`;
 }
 function render(){
  if(!game)return `<div class="bots-page bots-page-start">${startUI()}</div>`;
  if(game.phase==='done'){
   archiveCompleted();
   if(game.savedId){try{BANK.settle(game);}catch(ex){error='Guthaben nicht verbucht: '+String(ex?.message||ex);}}
  }
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
   <footer class="bots-tally bots-cash-tally"><span class="bots-your-cash">🪙 Du: <strong>${money(BANK.load().balances.you)}</strong></span>
    ${sc?`<span class="bots-eyes-tally">${sc.us}:${sc.them} Augen</span>`:''}
    <button type="button" class="bots-wallet-show" data-bots-wallet>Alle Guthaben</button></footer>
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
   const front=currentWood.querySelector('.bots-portrait-front-'+pos+' img');
   const freshFront=newWood.querySelector('.bots-portrait-front-'+pos+' img');
   if(front&&freshFront&&front.getAttribute('src')!==freshFront.getAttribute('src'))front.setAttribute('src',freshFront.getAttribute('src'));
   const label=currentWood.querySelector('.bots-seat-label-'+pos),newLabel=newWood.querySelector('.bots-seat-label-'+pos);
   if(label&&newLabel){
    if(label.innerHTML!==newLabel.innerHTML)label.innerHTML=newLabel.innerHTML;
    label.className=newLabel.className;
   }
   const existingBubble=current.querySelector('.bots-bubble'),newBubble=fresh.querySelector('.bots-bubble');
   if(existingBubble&&!newBubble)existingBubble.remove();
   else if(existingBubble&&newBubble){
    if(existingBubble.textContent!==newBubble.textContent)existingBubble.textContent=newBubble.textContent;
    existingBubble.className=newBubble.className;
   }else if(newBubble)current.prepend(newBubble);
  }
  const field=currentWood.querySelector('.bots-playing-area'),freshField=newWood.querySelector('.bots-playing-area');
  if(field&&freshField){
   const currentCards=new Map(Array.from(field.querySelectorAll('.bots-played')).map(node=>[node.dataset.botsCardKey,node]));
   const needed=new Set();
   for(const incoming of freshField.querySelectorAll('.bots-played')){
    const key=incoming.dataset.botsCardKey;needed.add(key);
    if(!currentCards.has(key))field.appendChild(incoming);
   }
   for(const [key,node] of currentCards)if(!needed.has(key))node.remove();
  }
  swap('.bots-self-spot',currentWood,newWood);
  for(const selector of ['.bots-mid-action','.bots-shade','.bots-finish','.bots-wallet-overlay'])swap(selector,currentWood,newWood);
  const hand=root.querySelector('.bots-hand'),nextHand=next.querySelector('.bots-hand');
  if(hand&&nextHand){
   hand.style.setProperty('--fan-count',nextHand.style.getPropertyValue('--fan-count')||'8');
   swap('.bots-hand-heading',hand,nextHand);
   const row=hand.querySelector('.bots-hand-row'),future=nextHand.querySelector('.bots-hand-row');
   if(row&&future){
    row.style.setProperty('--fan-count',String(future.querySelectorAll('[data-bots-play]').length));
    row.setAttribute('aria-label',future.getAttribute('aria-label')||'Deine Handkarten');
    const existing=new Map(Array.from(row.querySelectorAll('[data-bots-play]')).map(node=>[node.dataset.botsPlay,node]));
    const target=[];
    for(const button of future.querySelectorAll('[data-bots-play]')){
     const own=existing.get(button.dataset.botsPlay)||button;
     own.className=button.className;
     own.disabled=button.disabled;
     own.setAttribute('aria-label',button.getAttribute('aria-label'));
     own.setAttribute('style',button.getAttribute('style')||'');
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
  const b=e.target.closest('[data-bots-exit],[data-bots-new],[data-bots-abandon],[data-bots-round],[data-bots-choose],[data-bots-back],[data-bots-bid],[data-bots-pass],[data-bots-play],[data-bots-analyze],[data-bots-wallet],[data-bots-wallet-close],[data-bots-wallet-reset]');
  if(!b||typeof tab==='undefined'||tab!=='bots')return;
  e.preventDefault();cancelTimer();
  try{
   error='';
   if(b.hasAttribute('data-bots-wallet')){walletOpen=true;renderApp();return;}
   if(b.hasAttribute('data-bots-wallet-close')){walletOpen=false;renderApp();return;}
   if(b.hasAttribute('data-bots-wallet-reset')){
    if(confirm('Alle vier Spielguthaben auf jeweils 10,00 € zurücksetzen?')){BANK.reset();renderApp();}
    else schedule();
    return;
   }
   if(b.hasAttribute('data-bots-exit')){
    save();switchTab('home');return;
   }
   if(b.hasAttribute('data-bots-abandon')){
    if(game&&['playing','chooseGame','bidding','biddingResult'].includes(game.phase)&&!confirm('Laufende Runde wirklich beenden?')){schedule();return;}
    game=null;
   }else if(b.hasAttribute('data-bots-new')){
    game=B.create();game.cashEligible=true;walletOpen=false;
   }else if(b.hasAttribute('data-bots-round')){
    game=B.nextRound(game);game.cashEligible=true;walletOpen=false;
   }else if(b.hasAttribute('data-bots-choose')){
    if(game.auctionStage==='opening')B.declareInterest(game,true);
    else B.chooseToPlay(game);
   }else if(b.hasAttribute('data-bots-back')){
    B.cancelChoice(game);
   }else if(b.hasAttribute('data-bots-bid')){
    const id=b.dataset.botsBid;
    const option=B.bidOptions(game.hands[game.mySeat],game.best,game.mySeat).find(x=>x.type+':'+(x.calledSuit||x.trumpSuit||'')===id);
    if(!option)throw Error('Diese Spielart ist nicht zulässig.');
    B.submitBid(game,option);
   }else if(b.hasAttribute('data-bots-pass')){
    if(game.auctionStage==='opening')B.declareInterest(game,false);
    else B.submitBid(game,null);
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
  if(img?.classList?.contains('bots-reference-scene')){
   img.parentElement?.classList.add('bots-art-loaded');
   img.parentElement?.classList.toggle('bots-art-modern',img.dataset.artKind==='modern');
  }
 },true);
 // Neue Wirtshausillustration optional: bis zu ihrem Upload bleibt die
 // bisherige Szene sichtbar. Kein defektes Bild, keine Spielunterbrechung.
 document.addEventListener('error',event=>{
  const img=event.target;
  if(img?.classList?.contains('bots-reference-scene')&&img.dataset.artKind==='modern'){
   img.dataset.artKind='legacy';
   img.src='./players/stammtisch-szene.webp';
  }
 },true);
 window.WastlBotsUI={render,version:'7.8.0'};
})();
