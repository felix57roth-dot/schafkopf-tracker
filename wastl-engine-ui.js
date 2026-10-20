/* Optionaler auditierbarer Regelcheck für gespeicherte Wastl-Partien. */
(function () {
  'use strict';
  const engine = globalThis.WastlEngine;
  if (!engine) return;
  const esc = str => String(str ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const seatLabel = seat => ({vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'})[seat] || 'Unbekannt';
  function renderAudit(game) {
    const result = engine.review(game);
    const ok = result.ok;
    const issues = [...result.errors, ...result.warnings].slice(0,16);
    const numbers = result.teamEyes && result.result.status === 'known' ? `<div class="wastl-engine-stats"><div class="wastl-engine-stat"><small>Ansagerteam</small><b>${result.teamEyes.declarer} Augen</b></div><div class="wastl-engine-stat"><small>Gegenpartei</small><b>${result.teamEyes.opponents} Augen</b></div></div>` : '';
    const summary = !result.supported ? 'Diese Spielvariante ist noch nicht vollständig durch den neuen Regelkern abgedeckt.' : !ok ? 'Aufzeichnung prüfen: Wastl gibt für fehlerhafte Daten keine gesicherten Ergebnisse aus.' : 'Stichregeln, Kartenzählung und Bedienpflicht sind konsistent.';
    return `<div class="wastl-engine-overlay" data-engine-overlay role="presentation"><section class="wastl-engine-dialog" role="dialog" aria-modal="true" aria-labelledby="engineTitle" tabindex="-1"><div class="wastl-engine-title"><h2 id="engineTitle">Wastl-Engine 4.1 · Regel-Check</h2><button type="button" class="wastl-engine-exit" data-engine-close aria-label="Schließen">×</button></div><div class="wastl-engine-status ${ok?'good':''}"><b>${ok?'✓ Regelprüfung bestanden':'! Prüfergebnis mit Vorbehalt'}</b><div>${summary}</div></div>${numbers}${result.result?.status==='known'?`<p><b>Ergebnis:</b> ${esc(result.result.reason)}</p>`:''}<div class="wastl-engine-stats"><div class="wastl-engine-stat"><small>Erfasste Stiche</small><b>${result.tricks.length}/8</b></div><div class="wastl-engine-stat"><small>Augen</small><b>${result.eyesTotal ?? 0}/120</b></div></div>${issues.length?`<h3>Prüfhinweise</h3><ul class="wastl-engine-errors">${issues.map(x=>`<li>${esc(x.message)}</li>`).join('')}</ul>`:'<p>Keine Regelverletzung erkannt.</p>'}<h3>Stichübersicht</h3><table class="wastl-engine-tricks"><thead><tr><th>Stich</th><th>Ausspieler</th><th>Gewinner</th><th>Augen</th></tr></thead><tbody>${result.tricks.map(t=>`<tr><td>${t.index}</td><td>${seatLabel(t.leaderSeat)}</td><td>${seatLabel(t.winnerSeat)}</td><td>${t.eyes}</td></tr>`).join('')}</tbody></table><p class="wastl-engine-fine">Dieser Prüfer arbeitet vollständig offline und verändert keine gespeicherten Daten. Er bewertet keine Spielstrategie oder individuellen Entscheidungen; eine experimentelle Monte-Carlo-Analyse ist über das Würfelsymbol in Wastls Stichansicht verfügbar. Für Sonderformen gelten derzeit noch Einschränkungen.</p></section></div>`;
  }
  function enableButtons() {
    if (typeof stitch === 'undefined' || !Array.isArray(stitch.archive)) return;
    document.querySelectorAll('.mentor-game-row[data-mentor-open]').forEach(btn => {
      if (btn.parentElement?.classList.contains('wastl-engine-row')) return;
      const id=btn.getAttribute('data-mentor-open');
      const wrapper=document.createElement('div');wrapper.className='wastl-engine-row';
      btn.parentElement.insertBefore(wrapper,btn);wrapper.appendChild(btn);
      const audit=document.createElement('button');audit.type='button';audit.className='wastl-engine-audit';audit.textContent='Regeln prüfen';audit.dataset.engineAudit=id;wrapper.appendChild(audit);
    });
  }
  const target = document.getElementById('main');
  if(target) new MutationObserver(enableButtons).observe(target,{childList:true,subtree:false});
  enableButtons();
  document.addEventListener('click', event => {
    const trigger=event.target.closest('[data-engine-audit]');
    if(trigger){event.preventDefault();event.stopImmediatePropagation(); const g=(typeof stitch !== 'undefined'?stitch.archive:[]).find(x=>String(x.id)===trigger.dataset.engineAudit);if(!g)return;document.body.insertAdjacentHTML('beforeend',renderAudit(g));document.querySelector('.wastl-engine-dialog')?.focus();return;}
    if(event.target.closest('[data-engine-close]')||event.target.matches('[data-engine-overlay]')){event.preventDefault();event.stopImmediatePropagation();document.querySelector('[data-engine-overlay]')?.remove();}
  },true);
  document.addEventListener('keydown', event=>{if(event.key==='Escape'&&document.querySelector('[data-engine-overlay]')){event.stopImmediatePropagation();document.querySelector('[data-engine-overlay]').remove();}},true);
})();
