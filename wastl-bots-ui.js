/* Wastl Botspiel 5.0 – lokale Oberfläche, kein fremder Code/Server. */
(function(){
 'use strict';
 const B=window.WastlBots, E=window.WastlEngine;
 const KEY='schafkopf-botspiel-v1';
 const names={vh:'VH',mh:'MH',hh:'HH',g:'Geber'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const su={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schellen'};
 let game=null,showGameOptions=false,error='';
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(raw&&raw.version===6&&B.SEATS.includes(raw.mySeat)&&['bidding','chooseGame','playing','trickDone','done','noGame'].includes(raw.phase)&&raw.initialHands&&raw.hands&&Array.isArray(raw.tricks)&&raw.tricks.length<=8){game=raw;}
 }catch(e){console.warn('Bot-Partie konnte nicht geladen werden',e);}
 const save=()=>{try{if(game)localStorage.setItem(KEY,JSON.stringify(game));else localStorage.removeItem(KEY);return true;}catch(e){error='Das Spiel konnte nicht gespeichert werden. Bitte Speicherplatz freigeben.';return false;}};
 const fmtCard=id=>(typeof CARD_MAP==='object'&&CARD_MAP[id]?.name)||id.replace('-',' ');
 const face=(id,cls='')=>`<img draggable="false" class="bots-face ${cls}" src="./cards/${encodeURIComponent(id)}.webp" alt="${esc(fmtCard(id))}" loading="eager">`;
 function seatLabel(seat){return B.personAt(game,seat).name;}
 function gameLabel(g){if(!g?.type)return '';return g.type==='rufspiel'?'Rufspiel '+su[g.calledSuit]:g.type==='solo'?'Farbsolo '+su[g.trumpSuit]:'Wenz';}
 function teamScores(g){
  if(!g?.declarerSeat)return null;
  const partner=g.type==='rufspiel'?B.SEATS.find(s=>g.initialHands[s].includes(g.calledSuit+'-A')):null;
  const seen=g.tricks.some(t=>t.cards.includes(g.calledSuit+'-A'))||g.current.some(x=>x.card===g.calledSuit+'-A');
  if(g.type==='rufspiel'&&!seen)return null;
  const team=[g.declarerSeat,...(partner?[partner]:[])];
  const own=team.includes(g.mySeat);let us=0,them=0;
  for(const t of g.tricks){if(team.includes(t.winnerSeat)===own)us+=t.eyes;else them+=t.eyes;}
  return {us,them,team,own};
 }
 function automaticArchive(){
  if(!game||game.phase!=='done'||game.savedId)return;
  try{
   const rec=B.toRecord(game);stitch.archive.push(rec);
   if(!saveStitch()){stitch.archive.pop();throw Error('Speichern fehlgeschlagen.');}
   game.savedId=rec.id;save();
  }catch(e){error='Partie noch nicht archiviert: '+e.message;}
 }
 function seatSummary(g){
  return B.SEATS.map(seat=>{const n=seatLabel(seat);const count=g.hands[seat].length;
   const tag=g.phase==='bidding'?'':g.phase==='playing'&&g.turn===seat?' · am Zug':'';
   return `<span class="bots-players-chip ${g.turn===seat&&g.phase==='playing'?'active':''}">${esc(n)} <small>${esc(names[seat])} · ${count} Karten${tag}</small></span>`;
  }).join('');
 }
 function choice(){return '<div class="bots-start"><div class="bots-intro"><img src="./wastl.png" alt="Wastl"><div><h2>Am Stammtisch gegen Resi, Sepp und Xaver</h2><p>Vier Spieler, fortlaufende Runden, wechselnder Geber. Dein erster Platz wird ausgelost.</p></div></div><section class="card formcard bots-start-card"><button type="button" class="btn" data-bots-new>🃏 Einsteigen und Karten geben</button><p class="help">Offline-Training ohne Einfluss auf deine Geldbilanz.</p></section></div>';}
 function bidding(g){
  const you=g.mySeat,allowed=B.bidOptions(g.hands[you],g.best);
  const title=g.best?`Aktuell: ${esc(g.best.label)} (${esc(seatLabel(g.best.seat))})`:'Noch kein Spiel angesagt';
  const log=g.bids.map(x=>seatLabel(x.seat)+': '+(x.offer?x.offer.label:'Weiter')).join(' · ');
  if(g.phase==='chooseGame'){
   const grouped=[['rufspiel','Rufspiel'],['wenz','Wenz'],['solo','Solo']].map(([type,label])=>{
    const options=allowed.filter(x=>x.type===type);if(!options.length)return '';
    return `<div class="bots-bid-kind"><b>${label}</b><div class="bots-bid-options">${options.map(x=>`<button type="button" data-bots-bid="${esc(x.type+':'+(x.calledSuit||x.trumpSuit||''))}">${esc(x.label)}</button>`).join('')}</div></div>`;
   }).join('');
   return `<section class="bots-declare"><h3>Welches Spiel sagst du an?</h3><p>${title}</p>${grouped}<button type="button" class="btn secondary" data-bots-back>← Zurück</button></section>`;
  }
  return `<section class="bots-declare"><h3>Du bist dran: Spielen oder Weiter?</h3><p>${title}</p>${log?`<p>${esc(log)}</p>`:''}<div class="bots-bid-options"><button class="btn" type="button" data-bots-choose ${allowed.length?'':'disabled'}>Spielen</button><button class="btn secondary" type="button" data-bots-pass>Weiter</button></div></section>`;
 }
 function seatRelative(seat){const idx=B.SEATS.indexOf(seat),me=B.SEATS.indexOf(game.mySeat);return ['bottom','right','top','left'][(idx-me+4)%4];}
 function board(g){
  const cards=g.current.map(x=>({seat:x.seat,id:x.card}));
  if(g.phase==='trickDone'||g.phase==='done'){
   const last=g.lastTrick||g.tricks.at(-1);
   if(last)cards.splice(0,cards.length,...last.cards.map((id,i)=>({seat:E.nextSeat(last.leaderSeat,i),id})));
  }
  const slot=pos=>{
   const item=cards.find(x=>seatRelative(x.seat)===pos);
   return `<div class="bots-table-slot bots-${pos}">${item?face(item.id):'<span class="bots-empty-slot">♣</span>'}</div>`;
  };
  const tag=g.phase==='trickDone'||g.phase==='done'?`Stich gewonnen: ${esc(seatLabel(g.lastTrick?.winnerSeat))} · ${g.lastTrick?.eyes||0} Augen`:g.current.length?`Gespielt: ${g.current.length} von 4 Karten`:'Neue Runde · Ausspiel';
  return `<div class="bots-table"><div class="bots-table-center">${slot('top')}${slot('left')}${slot('right')}${slot('bottom')}<span class="bots-table-caption">${tag}</span></div></div>`;
 }
 function hand(g){
  const playable=g.phase==='playing'&&g.turn===g.mySeat?new Set(B.playable(g,g.mySeat)):new Set();
  const cards=B.sortHand(g.hands[g.mySeat],g.type?g:{type:'rufspiel'});
  return `<div class="bots-hand"><h3>Deine Hand <small>${cards.length} Karte${cards.length===1?'':'n'}</small></h3><div class="bots-hand-row">${cards.map(id=>`<button type="button" aria-label="${esc(fmtCard(id))}${playable.has(id)?', spielbar':', nicht spielbar'}" data-bots-play="${id}" class="bots-card-button ${playable.has(id)?'playable':'locked'}" ${playable.has(id)?'':'disabled'}>${face(id)}</button>`).join('')||'<div class="bots-hand-empty">Alle Karten ausgespielt.</div>'}</div></div>`;
 }
 function finish(g){
  const saved=!!g.savedId&&stitch.archive.some(x=>x.id===g.savedId);
  const scores=teamScores(g),result=scores?`${scores.us} : ${scores.them} Augen`:'Spiel abgeschlossen';
  const win=scores?scores.us>=(scores.own?61:60):null;
  return `<section class="bots-finish"><h2>${win===true?'🏆 Gewonnen!':win===false?'Partie verloren':'Partie beendet'}</h2><p>${esc(gameLabel(g))} · ${result}</p><p class="help">Alle acht Stiche sind dokumentiert${saved?' und bei Wastl gespeichert':''}. Diese Runde beeinflusst deine finanzielle Statistik nicht.</p><div class="bots-finish-actions"><button type="button" class="btn" data-bots-analyze ${saved?'':'disabled'}>Mit Wastl analysieren →</button><button type="button" class="btn secondary" data-bots-rematch>Gleiche Karten erneut</button><button type="button" class="btn ghost" data-bots-round>🃏 Nächste Runde</button></div></section>`;
 }
 function render(){
  if(!game)return `<div class="bots-page">${choice()}</div>`;
  if(game.phase==='done')automaticArchive();
  const g=game, score=teamScores(g);
  const notice=error?`<div class="bots-error" role="alert">${esc(error)}</div>`:'';
  const label=g.type?gameLabel(g):'Spielansage';
  const progress=g.phase==='noGame'?'Alle haben gepasst.':['bidding','chooseGame'].includes(g.phase)?`Ansage ${g.bidCursor+1} von 4`: `Stich ${Math.min(8,g.tricks.length+(g.phase==='playing'?1:0))} von 8`;
  return `<div class="bots-page"><div class="bots-game-heading"><div><p class="bots-kicker">🃏 Offline gegen Bots</p><h2>${esc(label)}</h2><p>${esc(progress)} · Runde ${g.round} · Du bist ${esc(names[g.mySeat])}</p></div><button type="button" class="bots-outline" data-bots-abandon>↻ Neu</button></div>${notice}
   ${g.phase==='noGame'?`<section class="card formcard"><h3>Alle vier haben gepasst</h3><p>Es kam kein Spiel zustande. In der nächsten Runde rückt der Geber weiter.</p><button class="btn" type="button" data-bots-round>🃏 Nächste Runde</button></section>`:''}
   ${['bidding','chooseGame'].includes(g.phase)?bidding(g):''}
   ${g.phase==='playing'||g.phase==='trickDone'||g.phase==='done'?`<div class="bots-scoreline">${score?`<strong>Dein Team: ${score.us} Augen</strong><span>Gegner: ${score.them} Augen</span>`:'<span>Rufspiel: Partner noch nicht aufgedeckt</span>'}</div>${board(g)}${g.phase==='trickDone'?`<div class="bots-next"><button class="btn" data-bots-next>Nächsten Stich spielen →</button></div>`:''}${g.phase==='playing'?`<p class="bots-turn-hint">${g.turn===g.mySeat?'Du bist dran – tippe auf eine markierte Karte.':esc(seatLabel(g.turn))+' überlegt …'}</p>`:''}${hand(g)}${g.phase==='done'?finish(g):''}`:''}
   <div class="bots-players">${seatSummary(g)}</div><p class="bots-disclaimer">Die Bots spielen mit einfachen Strategieregeln. Sie sehen weder deine Karten noch die anderen verdeckten Hände. Die Bots verwenden eine vereinfachte Reizordnung.</p></div>`;
 }
 function doClick(e){
  const el=e.target.closest('[data-bots-new],[data-bots-abandon],[data-bots-round],[data-bots-choose],[data-bots-back],[data-bots-bid],[data-bots-pass],[data-bots-play],[data-bots-next],[data-bots-rematch],[data-bots-analyze]');
  if(!el||typeof tab==='undefined'||tab!=='bots')return;
  e.preventDefault();
  try{
   error='';
   if(el.hasAttribute('data-bots-abandon')){if(game&&game.phase!=='done'&&!confirm('Laufende Trainingspartie wirklich verwerfen?'))return;game=null;save();renderApp();return;}
   if(el.hasAttribute('data-bots-new')){if(game&&game.phase==='playing'&&!confirm('Laufende Partie verwerfen und neu austeilen?'))return;game=B.create();}
   if(el.hasAttribute('data-bots-round'))game=B.nextRound(game);
   if(el.hasAttribute('data-bots-choose'))B.chooseToPlay(game);
   if(el.hasAttribute('data-bots-back'))B.cancelChoice(game);
   if(el.hasAttribute('data-bots-bid')){const raw=el.dataset.botsBid;const opt=B.bidOptions(game.hands[game.mySeat],game.best).find(o=>o.type+':'+(o.calledSuit||o.trumpSuit||'')===raw);B.submitBid(game,opt);}
   if(el.hasAttribute('data-bots-pass'))B.submitBid(game,null);
   if(el.hasAttribute('data-bots-play'))B.play(game,el.dataset.botsPlay);
   if(el.hasAttribute('data-bots-next'))B.nextTrick(game);
   if(el.hasAttribute('data-bots-rematch'))game=B.create({mySeat:game.mySeat,hands:game.initialHands});
   if(el.hasAttribute('data-bots-analyze')){
    if(!game?.savedId||!stitch.archive.some(x=>x.id===game.savedId))throw Error('Partie wurde noch nicht gespeichert oder inzwischen gelöscht.');
    const id=game.savedId;
    mentorGameId=id;mentorStep=0;switchTab('mentor');
    setTimeout(()=>window.WastlAutoSimulation?.startFor?.(id,350),40);return;
   }
   save();renderApp();
  }catch(ex){error=ex?.message||String(ex);renderApp();}
 }
 function renderApp(){if(typeof window.render==='function')window.render();}
 document.addEventListener('click',doClick);
 
 window.WastlBotsUI={render,version:'6.0.0'};
})();
