/* Wastl 4.2: eigenständige Offline-Simulation; reparierter Modal- und Spielkontext. */
(function(){
 'use strict';
 let worker=null, sequence=0, activeSelection=null;
 const esc=str=>String(str??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
 const showCard=id=>{const c=id?.split('-');const suits={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'};const ranks={A:'Sau','10':'Zehn',K:'König',O:'Ober',U:'Unter','9':'Neun','8':'Acht','7':'Sieben'};return c?.length===2?(suits[c[0]]||c[0])+' '+(ranks[c[1]]||c[1]):String(id);};
 const number=n=>Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:1});
 const container=()=>document.querySelector('[data-monte-dialog]');
 const getCurrentGame=()=>{
  try{if(typeof mentorSelected==='function')return mentorSelected();}catch{}
  return null;
 };
 function attach(){
  const top=document.querySelector('.ws-fullscreen:not(.ws-result-screen) .ws-topbar .ws-nav');
  if(!top||top.querySelector('[data-monte-start]'))return;
  const button=document.createElement('button');button.type='button';button.className='ws-monte-trigger';button.dataset.monteStart='';button.title='Spielzüge mit Wastl simulieren';button.setAttribute('aria-label','Spielzüge simulieren');button.textContent='🎲';top.insertBefore(button,top.firstChild);
 }
 const target=document.getElementById('main');
 if(target)new MutationObserver(attach).observe(target,{childList:true,subtree:false});
 attach();
 function cleanup(){
  sequence++; // Invalidate delayed results when the dialog is closed or replaced.
  if(worker){worker.terminate();worker=null;}
  activeSelection=null;
  const el=container();if(el)el.remove();
 }
 function overlay(game,step){
  const form=`<div class="mc-head"><div><small>WASTL-ENGINE 4.2 · EXPERIMENTELL</small><h2>Spielzüge simulieren</h2><p>Stich ${step+1} · ${esc(game.type)} · deine damals verfügbaren Karten</p></div><button type="button" data-monte-close class="mc-close" aria-label="Schließen">×</button></div><p class="mc-intro">Wastl vergleicht legale Karten mit neu verteilten unbekannten Händen. Seine virtuellen Mitspieler berücksichtigen nun Teamspiel, Stichübernahme, Augen und Trumpfreserven. Die Ergebnisse bleiben <strong>experimentelle Modellwerte</strong>.</p><div class="mc-controls"><label>Rechenumfang<select data-monte-count><option value="80">Schnell · 80 Verteilungen</option><option selected value="160">Normal · 160 Verteilungen</option><option value="350">Gründlicher · 350 Verteilungen</option></select></label><button type="button" data-monte-run class="mc-run">Simulation starten</button></div><div class="mc-output" data-monte-output role="status" aria-live="polite">Für diesen Stich kannst du deine gespielte Karte mit weiteren legalen Möglichkeiten vergleichen.</div><p class="mc-disclaimer">Keine zusätzliche App-Berechtigung und keine Internetverbindung erforderlich. Die Engine liest keine fremden Online-Daten und ändert keine gespeicherte Partie oder Spielbewertung.</p>`;
  cleanup();
  // Bind game and trick immediately: never look up a possibly closed session later.
  activeSelection={game:JSON.parse(JSON.stringify(game)),step};
  const div=document.createElement('div');div.className='mc-overlay';div.dataset.monteDialog='';div.innerHTML=`<section class="mc-dialog" role="dialog" aria-modal="true" aria-label="Wastl Monte-Carlo-Vergleich" tabindex="-1">${form}</section>`;document.body.appendChild(div);div.querySelector('.mc-dialog').focus();
 }
 function renderResult(result){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  if(!result?.ok){out.innerHTML=`<div class="mc-warning">${esc(result?.reason||'Keine auswertbare Simulation möglich.')}</div>`;return;}
  const value=Number(result.sampleCount)||0;
  const rows=result.candidates.map(x=>{
   const isPlayed=x.card===result.actual;
   const playedBadge=isPlayed?'<span class="mc-played">Dein Zug</span>':'';
   return `<div class="mc-row ${isPlayed?'chosen':''}"><div class="mc-card-name"><b>${esc(showCard(x.card))}</b>${playedBadge}</div><div class="mc-numbers"><span>Ø ${number(x.meanEyes)} Teamaugen</span><span>Modell-Siege: ${Math.round(x.winRate*100)} %</span></div></div>`;
  }).join('');
  const detail=esc(result.comparison||'Der Vergleich ist nicht eindeutig.');
  const uncertainty=result.reference?.card!==result.actual?
   `<p class="mc-uncertainty">Unterschied im Modell: ${Math.round((result.pairedWinGap||0)*100)} Prozentpunkte; geschätzte statistische Schwankung ± ${Math.round((result.pairedUncertainty||0)*100)} Punkte. ${result.clearAlternative?'Erkennbarer Modellvorteil – noch kein sicherer Bestzug.':'Kein belastbarer Vorteil gegenüber deinem Zug.'}</p>`:'';
  out.innerHTML=`<div class="mc-status"><strong>${value} simulierte Kartenverteilungen</strong><span>${esc(result.confidence==='low'?'Geringe Stichprobenzahl':'Experimenteller Vergleich')}</span></div><p class="mc-summary">${detail}</p>${uncertainty}<div class="mc-results">${rows}</div><details class="mc-method"><summary>Wie kommt Wastl darauf?</summary><p>Für alle erlaubten Karten werden dieselben ${value} beispielhaften Kartenzuteilungen verwendet. Die simulierten Spieler berücksichtigen ihre eigene Hand, sichtbare Stiche, Teamrollen, Trumpfstärke, Schonung hoher Karten sowie Augen beim Übernehmen oder Schmieren. Sie sehen keine fremden verdeckten Hände.</p><p>Sortiert wird nach dem modellierten Anteil gewonnener Partien; die mittleren Teamaugen dienen als Zusatzvergleich. Wastl nennt eine erkennbar bessere Alternative nur bei mindestens 100 Auswertungen und einem deutlichen Unterschied gegenüber der statistischen Schwankung.</p><p><strong>Einschränkungen:</strong> Die Kartenverteilungen sind nur Näherungen, die Gegenspieler weiterhin untrainiert. Keine kalibrierten Gewinnwahrscheinlichkeiten, keine objektiven Spielnoten und kein vollständiger Solver.</p></details>`;
 }
 function simulate(){
  const modal=container();if(!modal)return;
  const selection=activeSelection;
  if(!selection){renderResult({ok:false,reason:'Die ausgewählte Partie ist nicht mehr verfügbar. Bitte den Dialog erneut öffnen.'});return;}
  const {game,step}=selection;
  const n=Number(modal.querySelector('[data-monte-count]')?.value)||160;
  const out=modal.querySelector('[data-monte-output]');out.textContent=`Berechnung läuft … ${n} Verteilungen mit allen legalen Karten. Die App bleibt bedienbar.`;
  const startButton=modal.querySelector('[data-monte-run]');startButton.disabled=true;
  if(worker){worker.terminate();worker=null;}
  let job=++sequence;
  try{
   worker=new Worker('./wastl-montecarlo-worker.js');
   worker.onmessage=event=>{
    if(!container()||job!==sequence||event.data?.requestId!==job)return;
    startButton.disabled=false;
    renderResult(event.data?.report||{ok:false,reason:'Die Simulation lieferte kein Ergebnis.'});
    worker?.terminate();worker=null;
   };
   worker.onerror=()=>{
    if(!container()||job!==sequence)return;
    startButton.disabled=false;renderResult({ok:false,reason:'Die lokale Simulation konnte nicht gestartet werden. Bitte die PWA online einmal neu öffnen, damit alle Engine-Dateien geladen werden.'});
    worker?.terminate();worker=null;
   };
   worker.postMessage({requestId:job,game,turn:step,options:{samples:n,seed:0x41e1+step}});
  }catch(error){startButton.disabled=false;renderResult({ok:false,reason:'Web Worker wird hier nicht unterstützt: '+error.message});}
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-monte-start]')){
   event.preventDefault();event.stopImmediatePropagation();
   const game=getCurrentGame();
   const step=typeof mentorStep==='number'?mentorStep:0;
   if(!game){
    // If a stale/fullscreen button is present, do not silently ignore the tap.
    console.warn('Wastl: Keine gespeicherte Partie für die Simulation gewählt.');
    return;
   }
   overlay(game,step);return;
  }
  if(event.target.closest('[data-monte-run]')){event.preventDefault();event.stopImmediatePropagation();simulate();return;}
  if(event.target.closest('[data-monte-close]')||event.target.matches('[data-monte-dialog]')){event.preventDefault();event.stopImmediatePropagation();cleanup();return;}
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&container()){event.preventDefault();event.stopImmediatePropagation();cleanup();}},true);
})();
