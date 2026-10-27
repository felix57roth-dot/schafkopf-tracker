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
  return `<div class="mc-existing"><b>✅ Ganze Partie bereits simuliert</b><p>${success} Stiche mit Zugvergleich, ${forced} ohne Kartenauswahl · ${data.samples} Verteilungen pro Stich.</p><p>${grade.grade==null?esc(grade.reason):`Vorläufige Modellnote: <strong>${grade.grade}/10</strong> · ${esc(grade.reason)}`}</p><p>Wastls Stichkommentare und die Endansicht nutzen diese Ergebnisse bereits. Du kannst neu rechnen, falls du mehr Verteilungen möchtest.</p></div>`;
 }
 function benchmarkSummary(type){
  const b=cache()?.getBenchmark?.();
  if(!b)return '<p class="mc-bench-empty">Noch kein Prüflauf vorhanden. Eine validierte Spielnote kann Wastl deshalb noch nicht vergeben.</p>';
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
  activeSelection={game:JSON.parse(JSON.stringify(game))};
  const label=typeof stitchTypeName==='function'?stitchTypeName(game.type):game.type;
  const div=document.createElement('div');div.className='mc-overlay';div.dataset.monteDialog='';
  div.innerHTML=`<section class="mc-dialog" role="dialog" aria-modal="true" aria-label="Wastl Ganze Partie simulieren" tabindex="-1">
   <div class="mc-head"><div><small>WASTL-ENGINE 4.6 · OFFLINE · MODELLPRÜFUNG</small><h2>Ganze Partie simulieren</h2><p>${esc(label)} · alle acht Stiche in einem Durchlauf</p></div><button type="button" data-monte-close class="mc-close" aria-label="Schließen">×</button></div>
   ${existingSummary(game)}
   <p class="mc-intro">Wastl simuliert deine Entscheidung bei <strong>allen acht Stichen</strong> mit zum jeweiligen Zeitpunkt plausiblen unbekannten Händen. Die Ergebnisse fließen danach automatisch in seine Erklärungen ein. Bei Ramsch zählt eine möglichst geringe eigene Augenzahl, bei Kreuzrunde die Augen deines Zweierteams. Du musst nicht jeden Zug einzeln anstoßen.</p>
   <div class="mc-controls"><label>Verteilungen je Stich<select data-monte-count>
    <option value="80">Schnell · 80 × 8 · ohne Spielnote</option><option value="160" selected>Normal · 160 × 8 · Modellnote möglich</option><option value="350">Gründlicher · 350 × 8 · Modellnote möglich</option>
   </select></label><button type="button" data-monte-run class="mc-run">Gesamte Partie simulieren</button></div>
   <details class="mc-benchmark"><summary>🧪 Engine-Prüflabor <small>Optional: Modellqualität untersuchen</small></summary><div class="mc-bench-body">
    <p>Vergleiche Wastls Vorschläge mit getrennt ausgewerteten Fortsetzungen auf vollständig bekannten Referenzhänden. Erst wenn das Modell für eine Spielart ausreichend überzeugt, darf es eine vorläufige 1–10-Note anzeigen.</p>
    <div class="mc-bench-controls"><label>Prüfumfang<select data-bench-count><option value="24">24 Vergleichssituationen (schnell)</option><option value="48" selected>48 Vergleichssituationen (6 Spielarten)</option><option value="72">72 Vergleichssituationen (mind. 12 je Art)</option></select></label><button type="button" data-bench-run class="mc-bench-button">Modell prüfen</button></div>
    <div data-bench-output aria-live="polite">${benchmarkSummary(game.type)}</div>
   </div></details>
   <details class="mc-benchmark"><summary>⚖️ Neu: Strategie A/B-Test <small>Monte Carlo gegen bisherige Heuristik</small></summary><div class="mc-bench-body">
    <p>Gleiche Kartenverteilungen, zwei unterschiedliche Zugempfehlungen: Die alte Heuristik und Wastls Monte-Carlo-Auswahl werden auf getrennten Testfällen überprüft. Die Ergebnisse zeigen, ob sich unter diesen Testbedingungen ein Vorteil nachweisen lässt; keine Aussage über menschliche Spielstärke.</p>
    <div class="mc-bench-controls"><label>Testumfang<select data-validation-count><option value="24" selected>24 Situationen · 12 zurückgehaltene Tests</option><option value="48">48 Situationen · 24 Tests</option><option value="96">96 Situationen · 48 Tests (langsam)</option></select></label><button type="button" data-validation-run class="mc-bench-button">A/B-Test starten</button></div>
    <div data-validation-output aria-live="polite">${validationSummary()}</div>
   </div></details>
   <div class="mc-output" data-monte-output role="status" aria-live="polite"><p>${automatic?'Wähle einmal den Rechenumfang und starte anschließend die Analyse.':'Du kannst die Partie neu berechnen oder die bisherigen Ergebnisse verwenden.'}</p></div>
   <div class="mc-bottom"><button type="button" class="mc-skip" data-monte-close>${cache()?.get(game)?'Zur Analyse zurück':'Ohne Simulation fortfahren'}</button></div>
   <p class="mc-disclaimer">Die gesamte Berechnung erfolgt auf deinem Gerät. Während des Laufs bleibt die bereits gespeicherte Partie unverändert. Die später tatsächlich gespielten Karten der Gegner werden nicht als Wissen vorweggenommen. Auch eine freigegebene 1–10-Modellnote ist derzeit nicht gegen menschliche Spielstärke kalibriert; das A/B-Labor allein kann dies nicht ersetzen. Ein solcher Test ersetzt keine Bewertung durch erfahrene Spieler.</p>
  </section>`;
  document.body.appendChild(div);div.querySelector('.mc-dialog')?.focus();
 }
 function setRunning(isRunning){
  const modal=container();if(!modal)return;
  const run=modal.querySelector('[data-monte-run]'),select=modal.querySelector('[data-monte-count]'),bench=modal.querySelector('[data-bench-run]'),benchSelect=modal.querySelector('[data-bench-count]'),vButton=modal.querySelector('[data-validation-run]'),vSelect=modal.querySelector('[data-validation-count]');
  if(run){run.disabled=isRunning;run.textContent=isRunning?'Simulation läuft …':'Erneut simulieren';}
  if(select)select.disabled=isRunning;
  if(bench)bench.disabled=isRunning;
  if(benchSelect)benchSelect.disabled=isRunning;
  if(vButton)vButton.disabled=isRunning;
  if(vSelect)vSelect.disabled=isRunning;
 }
 function showProgress(completed,total){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  const progress=Math.round(completed/total*100);
  out.innerHTML=`<div class="mc-progress-heading"><b>Berechnung läuft: ${completed} von ${total} Stichen</b><span>${progress} %</span></div><progress class="mc-progress" value="${completed}" max="${total}"></progress><p>${completed===0?'Wastl verteilt unbekannte Karten und simuliert mögliche Fortsetzungen.':`Stich ${completed} abgeschlossen. Die restlichen Stiche folgen automatisch.`} Die Dauer hängt vom Handy und der Anzahl Verteilungen ab.</p><p class="mc-progress-note">Du kannst abbrechen, indem du den Dialog schließt. Eine unterbrochene Berechnung wird nicht als abgeschlossen gespeichert.</p>`;
 }
 function showDone(data){
  const out=container()?.querySelector('[data-monte-output]');if(!out)return;
  const grade=cache().grade(data,activeSelection?.game?.type);
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
 // Von der Ein-Klick-Importansicht: kein Simulationsdialog mit eigener Auswahl erforderlich.
 // Die maximal angebotenen 350 Verteilungen je Stich werden sofort gestartet.
 window.WastlAutoSimulation={startFor(id,n=350){
  const g=currentGame();if(!g||String(g.id)!==String(id)||!cache())return false;
  prompted.add(cache().fingerprint(g));overlay(g,true);
  const choice=container()?.querySelector('[data-monte-count]');if(choice)choice.value=String(n);
  const modal=container();
  // Ein-Klick-Modus: keine erneute Auswahl und keine Labor-Optionen im Weg.
  const top=modal?.querySelector('.mc-head h2');if(top)top.textContent='Wastl analysiert deine Partie';
  const intro=modal?.querySelector('.mc-intro');if(intro)intro.textContent='Alle acht Stiche werden mit 350 Verteilungen pro Stich verglichen. Wastl übernimmt die Ergebnisse direkt in die Stichkommentare.';
  const controls=modal?.querySelector('.mc-controls');if(controls)controls.hidden=true;
  modal?.querySelectorAll('.mc-benchmark').forEach(el=>el.hidden=true);
  simulate();return true;
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
