/* Wastl 4.3: Einmaliger Simulationslauf über alle acht Stiche.
 * Berechnung und Speicherung nur lokal; kein externer Dienst. */
(function(){
 'use strict';
 let worker=null, sequence=0, activeSelection=null;
 const prompted=new Set();
 const $=selector=>document.querySelector(selector);
 const esc=str=>String(str??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
 const cache=()=>window.WastlMatchAnalysis;
 const currentGame=()=>{try{return typeof mentorSelected==='function'?mentorSelected():null;}catch{return null;}};
 const container=()=>document.querySelector('[data-monte-dialog]');
 const icon='🎲';
 function attach(){
  const top=$('.ws-fullscreen:not(.ws-result-screen) .ws-topbar .ws-nav');
  if(!top||top.querySelector('[data-monte-start]'))return;
  const button=document.createElement('button');button.type='button';button.className='ws-monte-trigger';button.dataset.monteStart='';
  button.title='Gesamte Partie simulieren / Modellresultate ansehen';button.setAttribute('aria-label','Ganze Partie simulieren');button.textContent=icon;top.insertBefore(button,top.firstChild);
  const game=currentGame();
  if(!game||!cache()||typeof mentorStep!=='number'||mentorStep!==0)return;
  const key=cache().fingerprint(game);
  if(!cache().get(game)&&!prompted.has(key)&&!container()){
   prompted.add(key);
   // First present the table; then offer a single all-tricks run.
   Promise.resolve().then(()=>{
    if(container()||currentGame()?.id!==game.id||typeof mentorStep!=='number'||mentorStep!==0)return;
    overlay(game,true);
   });
  }
 }
 const main=$('#main');
 if(main)new MutationObserver(attach).observe(main,{childList:true,subtree:false});
 attach();
 function cleanup(){
  sequence++;
  if(worker){worker.terminate();worker=null;}
  activeSelection=null;
  container()?.remove();
 }
 function existingSummary(game){
  const data=cache()?.get(game);if(!data)return '';
  const grade=cache().grade(data),success=data.reports.filter(x=>x.ok).length;
  const forced=data.reports.filter(x=>x.onlyLegal).length;
  return `<div class="mc-existing"><b>✅ Ganze Partie bereits simuliert</b><p>${success} Stiche mit Zugvergleich, ${forced} ohne Kartenauswahl · ${data.samples} Verteilungen pro Stich.</p><p>${grade.grade==null?esc(grade.reason):`Experimentelle Modellnote: <strong>${grade.grade}/10</strong> · ${esc(grade.reason)}`}</p><p>Wastls Stichkommentare und die Endansicht nutzen diese Ergebnisse bereits. Du kannst neu rechnen, falls du mehr Verteilungen möchtest.</p></div>`;
 }
 function overlay(game,automatic=false){
  cleanup();
  activeSelection={game:JSON.parse(JSON.stringify(game))};
  const label=typeof stitchTypeName==='function'?stitchTypeName(game.type):game.type;
  const div=document.createElement('div');div.className='mc-overlay';div.dataset.monteDialog='';
  div.innerHTML=`<section class="mc-dialog" role="dialog" aria-modal="true" aria-label="Wastl Ganze Partie simulieren" tabindex="-1">
   <div class="mc-head"><div><small>WASTL-ENGINE 4.3 · OFFLINE · EXPERIMENTELL</small><h2>Ganze Partie simulieren</h2><p>${esc(label)} · alle acht Stiche in einem Durchlauf</p></div><button type="button" data-monte-close class="mc-close" aria-label="Schließen">×</button></div>
   ${existingSummary(game)}
   <p class="mc-intro">Wastl simuliert deine Entscheidung bei <strong>allen acht Stichen</strong> mit zum jeweiligen Zeitpunkt plausiblen unbekannten Händen. Die Ergebnisse fließen danach automatisch in seine Erklärungen ein. Du musst nicht jeden Zug einzeln anstoßen.</p>
   <div class="mc-controls"><label>Verteilungen je Stich<select data-monte-count>
    <option value="80">Schnell · 80 × 8 · ohne Spielnote</option><option value="160" selected>Normal · 160 × 8 · Modellnote möglich</option><option value="350">Gründlicher · 350 × 8 · Modellnote möglich</option>
   </select></label><button type="button" data-monte-run class="mc-run">Gesamte Partie simulieren</button></div>
   <div class="mc-output" data-monte-output role="status" aria-live="polite"><p>${automatic?'Wähle einmal den Rechenumfang und starte anschließend die Analyse.':'Du kannst die Partie neu berechnen oder die bisherigen Ergebnisse verwenden.'}</p></div>
   <div class="mc-bottom"><button type="button" class="mc-skip" data-monte-close>${cache()?.get(game)?'Zur Analyse zurück':'Ohne Simulation fortfahren'}</button></div>
   <p class="mc-disclaimer">Die gesamte Berechnung erfolgt auf deinem Gerät. Während des Laufs bleibt die bereits gespeicherte Partie unverändert. Die später tatsächlich gespielten Karten der Gegner werden nicht als Wissen vorweggenommen. Eine 1–10-Modellnote ist nicht mit menschlicher Spielstärke gleichzusetzen.</p>
  </section>`;
  document.body.appendChild(div);div.querySelector('.mc-dialog')?.focus();
 }
 function setRunning(isRunning){
  const modal=container();if(!modal)return;
  const run=modal.querySelector('[data-monte-run]'),select=modal.querySelector('[data-monte-count]');
  if(run){run.disabled=isRunning;run.textContent=isRunning?'Simulation läuft …':'Erneut simulieren';}
  if(select)select.disabled=isRunning;
 }
 function showProgress(completed,total){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  const progress=Math.round(completed/total*100);
  out.innerHTML=`<div class="mc-progress-heading"><b>Berechnung läuft: ${completed} von ${total} Stichen</b><span>${progress} %</span></div><progress class="mc-progress" value="${completed}" max="${total}"></progress><p>${completed===0?'Wastl verteilt unbekannte Karten und simuliert mögliche Fortsetzungen.':`Stich ${completed} abgeschlossen. Die restlichen Stiche folgen automatisch.`} Die Dauer hängt vom Handy und der Anzahl Verteilungen ab.</p><p class="mc-progress-note">Du kannst abbrechen, indem du den Dialog schließt. Eine unterbrochene Berechnung wird nicht als abgeschlossen gespeichert.</p>`;
 }
 function showDone(data){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  const grade=cache().grade(data);
  const results=data.reports.map((r,i)=>{
   const desc=r.ok ? `${r.sampleCount} Verteilungen · ${r.clearAlternative?'Modellalternative erkennbar':'kein klar besserer Zug'}`
    :r.onlyLegal?'Bedienpflicht · keine Alternative':`Nicht bewertbar: ${r.reason||'Keine Daten'}`;
   return `<li><span>Stich ${i+1}</span><span>${esc(desc)}</span></li>`;
  }).join('');
  out.innerHTML=`<div class="mc-finished"><strong>✓ Alle acht Stiche verarbeitet</strong><p>${grade.grade==null?esc(grade.reason):`Wastls experimentelle Modellnote: <strong>${grade.grade}/10</strong>`}</p><p>${esc(grade.reason)}</p><ul class="mc-turn-list">${results}</ul><p>Die Ergebnisse erscheinen jetzt automatisch in Wastls Stichkommentaren und am Spielende.</p><button type="button" data-monte-close class="mc-run">Zur analysierten Partie</button></div>`;
 }
 function showError(reason){
  const out=container()?.querySelector('[data-monte-output]');if(out)out.innerHTML=`<div class="mc-warning">${esc(reason)}</div>`;
  setRunning(false);
 }
 function simulate(){
  const selection=activeSelection,modal=container();if(!selection||!modal)return;
  const n=Number(modal.querySelector('[data-monte-count]')?.value)||160;
  const g=selection.game;
  if(worker){worker.terminate();worker=null;}
  const job=++sequence;
  setRunning(true);showProgress(0,8);
  try{
   worker=new Worker('./wastl-montecarlo-worker.js');
   worker.onmessage=event=>{
    if(!container()||job!==sequence||event.data?.requestId!==job)return;
    const payload=event.data;
    if(payload.kind==='progress'){showProgress(payload.completed,payload.total);return;}
    worker?.terminate();worker=null;
    setRunning(false);
    if(payload.kind==='error'){showError(payload.reason);return;}
    if(payload.kind!=='complete'||payload.reports?.length!==8){showError('Unvollständige Simulation. Bitte erneut starten.');return;}
    try{
     const data=cache().save(g,payload.reports,n);
     if(typeof render==='function'&&currentGame()?.id===g.id)render();
     showDone(data);
    }catch(e){showError('Konnte die abgeschlossene Auswertung nicht übernehmen: '+String(e.message||e));}
   };
   worker.onerror=()=>{if(!container()||job!==sequence)return;worker?.terminate();worker=null;showError('Die lokale Berechnung konnte nicht gestartet werden. Bitte die PWA einmal mit Internetverbindung aktualisieren.');};
   worker.postMessage({requestId:job,game:g,wholeGame:true,options:{samples:n,seed:0x4302026}});
  }catch(e){showError('Dein Browser konnte den Hintergrundprozess nicht starten: '+String(e.message||e));}
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-monte-start]')){
   event.preventDefault();event.stopImmediatePropagation();
   const g=currentGame();if(!g)return;
   prompted.add(cache().fingerprint(g));overlay(g);return;
  }
  if(event.target.closest('[data-monte-run]')){event.preventDefault();event.stopImmediatePropagation();simulate();return;}
  if(event.target.closest('[data-monte-close]')||event.target.matches('[data-monte-dialog]')){
   event.preventDefault();event.stopImmediatePropagation();cleanup();return;
  }
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&container()){event.preventDefault();event.stopImmediatePropagation();cleanup();}},true);
})();
