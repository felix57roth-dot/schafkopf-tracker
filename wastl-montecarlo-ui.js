/* Wastl 4.4: Vollspielanalyse mit unabhaengigem Offline-Prueflabor, Einmaliger Simulationslauf über alle acht Stiche.
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
  const grade=cache().grade(data,game.type),success=data.reports.filter(x=>x.ok).length;
  const forced=data.reports.filter(x=>x.onlyLegal).length;
  return `<div class="mc-existing"><b>✅ Ganze Partie bereits simuliert</b><p>${success} Stiche mit Zugvergleich, ${forced} ohne Kartenauswahl · ${data.samples} Verteilungen pro Stich.</p><p>${grade.grade==null?esc(grade.reason):`Vorläufiger Entscheidungsindex: <strong>${grade.grade}/10</strong> · ${esc(grade.reason)}`}</p><p>Wastls Stichkommentare und die Endansicht nutzen diese Ergebnisse bereits. Du kannst neu rechnen, falls du mehr Verteilungen möchtest.</p></div>`;
 }
 function benchmarkSummary(type){
  const b=cache()?.getBenchmark?.();
  if(!b)return '<p class="mc-bench-empty">Noch kein Prüflauf vorhanden. Eine menschliche Spielstärkenote lässt sich damit weiterhin nicht validieren.</p>';
  const pct=n=>(n*100).toFixed(1).replace('.',',')+' Prozentpunkte';
  const eyes=n=>n.toFixed(1).replace('.',',');
  const types=[['solo','Solo (inkl. Kreuz)'],['wenz','Wenz'],['rufspiel','Rufspiel'],['geier','Geier'],['ramsch','Ramsch'],['kreuzrunde','Kreuzrunde']];
  const rows=types.map(([id,name])=>{
   const x=b.types?.[id];if(!x||!x.count)return '';
   const delta=x.lift;
   return `<tr><td>${name}</td><td>${x.count}</td><td class="${delta<0?'mc-bench-bad':''}">${delta>0?'+':''}${pct(delta)} ± ${pct(x.margin)}</td></tr>`;
  }).join('');
  const assessment=cache().benchmarkAssessment(type);
  const status=assessment.status==='passed'?'Für diese Spielart: Modellprüfung bestanden.':assessment.status==='too-few'?'Für diese Spielart: noch zu wenige Tests.':'Für diese Spielart: keine ausreichend klare Überlegenheit nachgewiesen.';
  return `<div class="mc-bench-report"><p><strong>${b.usable} von ${b.requested} Testfällen ausgewertet.</strong> Modellvorteil gegen zufällig legale Karten: ${b.lift>0?'+':''}${pct(b.lift)} (Schwankungsbereich ± ${pct(b.margin)}). Ø ${b.eyeLift>=0?'+':''}${eyes(b.eyeLift)} Zielwert-Punkte gegenüber einer zufällig legalen Karte (Ramsch: 120 minus eigene Augen; sonst Teamaugen).</p><table><thead><tr><th>Spielart</th><th>Fälle</th><th>Modellvorteil</th></tr></thead><tbody>${rows}</tbody></table><p><strong>${esc(status)}</strong> ${esc(assessment.reason)}</p><p class="mc-bench-caution">Ramsch: Ziel ist, nicht Ramschverlierer zu werden und wenig eigene Augen zu sammeln. Kreuzrunde: Gegenübersitzende spielen zusammen. Prüfung nur gegen künstliche Spielverläufe desselben Modellumfelds – kein menschlicher Schafkopf-Spielstärkenachweis. Ein Minuswert ist ein Warnsignal.</p></div>`;
 }
 function benchProgress(completed,total){
  const el=container()?.querySelector('[data-bench-output]');if(!el)return;
  const p=Math.min(100,Math.round(completed/Math.max(1,total)*100));
  el.innerHTML=`<b>Test läuft: ${completed} / ${total} Vergleichssituationen · ${p}%</b><progress class="mc-progress" value="${completed}" max="${total}"></progress><p class="mc-progress-note">Unbekannte Karten werden geschätzt, anschließend mit zurückgehaltenen Referenzhänden überprüft. Die persönlichen Partien werden nicht benutzt.</p>`;
 }
 function runBenchmark(){
  const modal=container(),selection=activeSelection;
  if(!modal||!selection)return;
  const count=Number(modal.querySelector('[data-bench-count]')?.value)||48;
  if(worker){worker.terminate();worker=null;}
  const job=++sequence;
  setRunning(true);benchProgress(0,count);
  try{
   worker=new Worker('./wastl-benchmark-worker.js');
   worker.onmessage=event=>{
    if(!container()||job!==sequence||event.data?.requestId!==job)return;
    const payload=event.data;
    if(payload.kind==='progress'){benchProgress(payload.completed,payload.total);return;}
    worker?.terminate();worker=null;setRunning(false);
    const el=container()?.querySelector('[data-bench-output]');
    if(payload.kind==='error'||!payload.report?.ok){
     if(el)el.innerHTML=`<div class="mc-warning">${esc(payload.reason||payload.report?.reason||'Prüfberechnung nicht möglich.')}</div>`;
     return;
    }
    try{
     const stored=cache().saveBenchmark(payload.report);
     if(el)el.innerHTML=benchmarkSummary(selection.game.type);
     if(typeof render==='function'&&currentGame()?.id===selection.game.id)render();
    }catch(e){if(el)el.innerHTML=`<div class="mc-warning">${esc(e.message||e)}</div>`;}
   };
   worker.onerror=()=>{
    if(job!==sequence||!container())return;
    worker?.terminate();worker=null;setRunning(false);
    const el=container()?.querySelector('[data-bench-output]');
    if(el)el.innerHTML='<div class="mc-warning">Prüflabor konnte nicht gestartet werden. Bitte die App einmal online aktualisieren.</div>';
   };
   worker.postMessage({requestId:job,options:{cases:count,samples:100,evalRuns:24,seed:0x441022}});
  }catch(e){setRunning(false);const el=container()?.querySelector('[data-bench-output]');if(el)el.innerHTML=`<div class="mc-warning">${esc(e.message||e)}</div>`;}
 }
 function validationSummary(){
  let result=null;
  try{result=JSON.parse(localStorage.getItem('wastl-ab-validation-v46')||'null');}catch{}
  if(!result||result.version!=='4.6.0')return '<p class="mc-bench-empty">Noch kein A/B-Vergleich durchgeführt. Eine Spielstärkenote ist daraus noch nicht ableitbar.</p>';
  const pct=n=>(n*100).toFixed(1).replace('.',',')+' Prozentpunkte';
  const delta=result.test.lift;
  const groups=[['solo','Solo'],['wenz','Wenz'],['rufspiel','Rufspiel'],['geier','Geier'],['ramsch','Ramsch'],['kreuzrunde','Kreuzrunde']];
  const rows=groups.map(([key,name])=>{
   const g=result.groups[key];return `<tr><td>${name}</td><td>${g.count}</td><td>${g.changed}</td><td>${g.count<12?'Zu wenig Daten':`${g.lift>0?'+':''}${pct(g.lift)} ± ${pct(g.margin)}`}</td></tr>`;
  }).join('');
  const verdict=result.evidence==='internal-advantage'?'Interner Vorteil gegenüber der alten Heuristik im Test erkennbar.':'Kein ausreichend klarer Vorteil gegenüber der alten Heuristik nachgewiesen.';
  return `<div class="mc-bench-report"><p><strong>Gepaarter A/B-Test:</strong> ${result.test.count} unbekannte Testentscheidungen, ${result.diagnostic.count} separate Diagnosefälle. Die Monte-Carlo-Wahl wich bei ${result.test.changed} Testentscheidungen von der alten Heuristik ab.</p><p><strong>Änderung der Gewinnquote:</strong> ${delta>0?'+':''}${pct(delta)} ± ${pct(result.test.margin)} (Unsicherheitsbereich zwischen Testfällen).</p><table><thead><tr><th>Spielart</th><th>Tests</th><th>Andere Wahl</th><th>Unterschied</th></tr></thead><tbody>${rows}</tbody></table><p><strong>${esc(verdict)}</strong></p><p class="mc-bench-caution">Dieser Vergleich benutzt zur Fortsetzung noch Wastls heuristische Gegenspieler und künstliche Referenzpartien. Er ist daher KEINE unabhängige menschliche Spielstärkenprüfung und kalibriert keine 1–10-Note.</p></div>`;
 }
 function validationProgress(done,total){
  const el=container()?.querySelector('[data-validation-output]');if(!el)return;
  el.innerHTML=`<b>A/B-Test läuft: ${done} von ${total} Vergleichssituationen</b><progress class="mc-progress" value="${done}" max="${total}"></progress><p class="mc-progress-note">Dieselben unbekannten Kartenverteilungen werden mit beiden Empfehlungen ausgewertet. Die Daten bleiben auf deinem Gerät.</p>`;
 }
 function runValidation(){
  const modal=container();if(!modal)return;
  const count=Number(modal.querySelector('[data-validation-count]')?.value)||24;
  if(worker){worker.terminate();worker=null;}
  const job=++sequence;
  setRunning(true);validationProgress(0,count);
  try{
   worker=new Worker('./wastl-validation-worker.js');
   worker.onmessage=event=>{
    if(!container()||job!==sequence||event.data?.requestId!==job)return;
    const response=event.data;
    if(response.kind==='progress'){validationProgress(response.completed,response.total);return;}
    worker?.terminate();worker=null;setRunning(false);
    const el=container()?.querySelector('[data-validation-output]');
    if(response.kind!=='complete'||!response.report?.ok){if(el)el.innerHTML=`<div class="mc-warning">${esc(response.reason||response.report?.reason||'Vergleich fehlgeschlagen')}</div>`;return;}
    const {cases,errors,...summary}=response.report;
    try{localStorage.setItem('wastl-ab-validation-v46',JSON.stringify(summary));}catch{}
    if(el)el.innerHTML=validationSummary();
   };
   worker.onerror=()=>{if(job!==sequence||!container())return;worker?.terminate();worker=null;setRunning(false);const el=container()?.querySelector('[data-validation-output]');if(el)el.innerHTML='<div class="mc-warning">A/B-Hintergrundtest konnte nicht geladen werden. Bitte App online aktualisieren.</div>';};
   worker.postMessage({requestId:job,options:{cases:count,samples:60,evalRuns:12,seed:0x46660801}});
  }catch(error){setRunning(false);const el=container()?.querySelector('[data-validation-output]');if(el)el.textContent=String(error.message||error);}
 }
 function overlay(game,automatic=false){
  cleanup();
  activeSelection={game:JSON.parse(JSON.stringify(game)),samples:160};
  const div=document.createElement('div');div.className='mc-overlay';div.dataset.monteDialog='';
  div.innerHTML=`<section class="mc-dialog mc-dialog-simple" role="dialog" aria-modal="true" aria-label="Wastl: Gesamte Partie analysieren" tabindex="-1">
   <div class="mc-head"><button type="button" data-monte-close class="mc-close" aria-label="Schließen">×</button></div>
   <button type="button" data-monte-run class="mc-run">Gesamte Partie analysieren</button>
   <div class="mc-output" data-monte-output role="status" aria-live="polite"></div>
  </section>`;
  document.body.appendChild(div);div.querySelector('[data-monte-run]')?.focus();
 }
 function setRunning(isRunning){
  const run=container()?.querySelector('[data-monte-run]');
  if(run){run.disabled=isRunning;run.textContent=isRunning?'Analyse läuft …':'Gesamte Partie analysieren';}
 }
 function showProgress(completed,total){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  const done=Math.max(0,Math.min(total,completed));
  out.innerHTML=`<div class="mc-progress-heading"><b>Stich ${done} von ${total}</b><span>${Math.round(done/Math.max(1,total)*100)} %</span></div><progress class="mc-progress" value="${done}" max="${total}" aria-label="Analysefortschritt"></progress>`;
 }
 function showDone(data){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  const grade=cache().quality(data,activeSelection?.game?.type);
  const results=data.reports.map((r,i)=>{
   const desc=r.ok ? `${r.sampleCount} Verteilungen · ${r.clearAlternative?'Modellalternative erkennbar':'kein klar besserer Zug'}`
    :r.onlyLegal?'Bedienpflicht · keine Alternative':`Nicht bewertbar: ${r.reason||'Keine Daten'}`;
   return `<li><span>Stich ${i+1}</span><span>${esc(desc)}</span></li>`;
  }).join('');
  out.innerHTML=`<div class="mc-finished"><strong>✓ Alle acht Stiche verarbeitet</strong><p>${grade.score==null?esc(grade.reason):`Wastls Spielqualität: <strong>${grade.score}/100</strong>`}</p><p>${esc(grade.reason)}</p><ul class="mc-turn-list">${results}</ul><p>Die Ergebnisse erscheinen jetzt automatisch in Wastls Stichkommentaren und am Spielende.</p><button type="button" data-monte-close class="mc-run">Zur analysierten Partie</button></div>`;
 }
 function showError(reason){
  const out=container()?.querySelector('[data-monte-output]');if(out)out.innerHTML=`<div class="mc-warning">${esc(reason)}</div>`;
  setRunning(false);
 }
 function simulate(){
  const selection=activeSelection,modal=container();if(!selection||!modal)return;
  const n=Number(activeSelection?.samples)||160;
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
     const completed=cache().save(g,payload.reports,n);
     const profileSave=window.WastlPlayerProfile?.record(g,completed);
     cleanup();
     if(typeof render==='function'&&currentGame()?.id===g.id)render();
     if(profileSave&&!profileSave.ok&&typeof flash==='function')flash('Wastl-Spielerprofil konnte nicht gespeichert werden.');
    }catch(e){showError('Konnte die abgeschlossene Auswertung nicht übernehmen: '+String(e.message||e));}
   };
   worker.onerror=()=>{if(!container()||job!==sequence)return;worker?.terminate();worker=null;showError('Die lokale Berechnung konnte nicht gestartet werden. Bitte die PWA einmal mit Internetverbindung aktualisieren.');};
   worker.postMessage({requestId:job,game:g,wholeGame:true,options:{samples:n,seed:0x4302026}});
  }catch(e){showError('Dein Browser konnte den Hintergrundprozess nicht starten: '+String(e.message||e));}
 }
 // Von der Ein-Klick-Importansicht: kein Simulationsdialog mit eigener Auswahl erforderlich.
 // Die maximal angebotenen 350 Verteilungen je Stich werden sofort gestartet.
 window.WastlAutoSimulation={startFor(id,n=350){
  const g=currentGame();if(!g||String(g.id)!==String(id)||!cache())return false;
  prompted.add(cache().fingerprint(g));
  overlay(g,true);
  if(activeSelection)activeSelection.samples=Math.max(1,Number(n)||350);
  simulate();
  return true;
 }};
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-monte-start]')){
   event.preventDefault();event.stopImmediatePropagation();
   const g=currentGame();if(!g)return;
   prompted.add(cache().fingerprint(g));overlay(g);return;
  }
  if(event.target.closest('[data-validation-run]')){event.preventDefault();event.stopImmediatePropagation();runValidation();return;}
  if(event.target.closest('[data-bench-run]')){event.preventDefault();event.stopImmediatePropagation();runBenchmark();return;}
  if(event.target.closest('[data-monte-run]')){event.preventDefault();event.stopImmediatePropagation();simulate();return;}
  if(event.target.closest('[data-monte-close]')||event.target.matches('[data-monte-dialog]')){
   event.preventDefault();event.stopImmediatePropagation();cleanup();return;
  }
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&container()){event.preventDefault();event.stopImmediatePropagation();cleanup();}},true);
})();
