/* Wastl 4.3: vollständige, nachvollziehbare Offline-Partieauswertung.
 * Die Modellnote ist relativ zu zufällig gewählten legalen Karten kalibriert,
 * NICHT als menschliche Spielstärke / objektive 1-10-Skala validiert.
 * Kein Fremdcode, keine Netzverbindung, keine Veränderung bestehender Partien.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WastlMatchAnalysis=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION='4.3.0', STORAGE='wastl-match-model-v43';
 const asNumber=n=>Number.isFinite(Number(n))?Number(n):0;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function fingerprint(game){
  return JSON.stringify({id:game?.id,type:game?.type,trumpSuit:game?.trumpSuit,calledSuit:game?.calledSuit,
   mySeat:game?.mySeat,declarerSeat:game?.declarerSeat,
   tricks:game?.tricks?.map(t=>({leaderSeat:t.leaderSeat,winnerSeat:t.winnerSeat,cards:t.cards}))});
 }
 function cacheRead(){try{const x=JSON.parse(root.localStorage?.getItem(STORAGE)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
 const memory=new Map();
 function get(game){
  if(!game)return null;
  const key=fingerprint(game);const value=memory.get(key);
  if(value&&value.version===VERSION&&value.reports?.length===8)return value;
  const found=cacheRead().find(item=>item?.key===key&&item.data?.version===VERSION&&item.data.reports?.length===8);
  if(found){memory.set(key,found.data);return found.data;}
  return null;
 }
 function save(game,reports,samples){
  if(!Array.isArray(reports)||reports.length!==8)throw Error('Es fehlen Stichauswertungen.');
  const key=fingerprint(game),data={version:VERSION,model:'wastl-policy-4.2',samples,finished:Date.now(),reports};
  memory.set(key,data);
  try{let values=cacheRead().filter(x=>x.key!==key);values.unshift({key,data});root.localStorage?.setItem(STORAGE,JSON.stringify(values.slice(0,5)));}catch{/* In-memory cache works without available storage. */}
  return data;
 }
 // Interpretable relative anchor: a random LEGAL decision corresponds to 5/10,
 // highest modeled win rate to 10/10. This is not validated human calibration.
 // Ignore apparent regret when it does not exceed paired-sample uncertainty.
 function grade(data){
  if(!data?.reports||data.reports.length!==8)return {grade:null,reason:'Bitte zuerst die ganze Partie simulieren.'};
  const considered=data.reports.filter(x=>x?.ok&&x.candidates?.length>1&&x.sampleCount>=160);
  if(considered.length<3)return {grade:null,reason:`Nur ${considered.length} auswertbare eigene Entscheidungen mit mindestens 160 Verteilungen. Keine belastbare 1–10-Note möglich.`};
  let randomRegret=0,observedRegret=0,informed=0,clear=0,meanSample=0;
  for(const r of considered){
   const best=r.reference?.winRate??r.candidates[0]?.winRate;
   const played=r.recorded?.winRate;
   if(!Number.isFinite(best)||!Number.isFinite(played))continue;
   const baseline=r.candidates.reduce((n,c)=>n+c.winRate,0)/r.candidates.length;
   const room=Math.max(0,best-baseline);
   if(room<.035)continue; // Nothing informative to rank this turn by.
   informed++;meanSample+=r.sampleCount;
   randomRegret+=room;
   // Winner's curse and sampling noise: require uncertainty-separated gap.
   const measured=Math.max(0,(best-played)-Math.max(0,r.pairedUncertainty||0));
   observedRegret+=Math.min(room*2.5,measured);
   if(r.clearAlternative)clear++;
  }
  if(informed<3||randomRegret<.18)return {grade:null,reason:`Nur ${informed} ausreichend trennscharfe Entscheidungen. Die Modellunterschiede sind für eine Spielnote zu klein.`};
  const relative=observedRegret/randomRegret;
  const value=Math.max(1,Math.min(10,Math.round(10-5*relative)));
  const averageN=Math.round(meanSample/informed);
  return {grade:value,informative:informed,considered:considered.length,clear,averageN,relative,
   reason:`Vorläufige Modellnote: ${informed} unterscheidbare Entscheidungen (Ø ${averageN} Verteilungen), ${clear} erkennbar schlechtere Züge. Skala: 10 = beste Modellalternativen; 5 ≈ zufällig gewählte legale Karten. Gemessene Nachteile werden um die Stichprobenunsicherheit reduziert. Keine validierte menschliche Spielstärkenote.`};
 }
 function cardLabel(id){
  const parts=String(id||'').split('-');
  const suit={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'}[parts[0]]||parts[0];
  const rank={A:'Sau','10':'Zehn',K:'König',O:'Ober',U:'Unter','9':'Neun','8':'Acht','7':'Sieben'}[parts[1]]||parts[1];
  return `${suit} ${rank}`;
 }
 function item(game,step){return get(game)?.reports?.[step]||null;}
 function explanation(game,step){
  const r=item(game,step);if(!r)return null;
  if(r.onlyLegal)return 'Da gab’s koa Auswahl: Du musstest die Farbe beziehungsweise Trumpf bedienen. Für diesen Stich gibt es deshalb keine bessere legale Alternative.';
  if(!r.ok)return `Hier kann i noch keinen seriösen Zugvergleich machen: ${r.reason||'zu wenige Daten'}`;
  const actual=r.recorded, best=r.reference, n=r.sampleCount;
  if(!actual||!best)return null;
  const diff=Math.max(0,(best.winRate-actual.winRate)*100);
  if(r.clearAlternative){
   return `I hab ${n} mögliche Kartenverteilungen gerechnet. ${cardLabel(best.card)} lag im Modell um rund ${diff.toFixed(0)} Prozentpunkte vor deiner ${cardLabel(r.actual)} (statistische Schwankung ± ${Math.round(r.pairedUncertainty*100)} Punkte). Das ist a Hinweis, kein Beweis für den besten Zug.`;
  }
  if(best.card===r.actual)return `In ${n} simulierten Verteilungen liegt deine ${cardLabel(r.actual)} im Modell vorn. Die anderen Möglichkeiten und die Unsicherheit kannst du bei ⓘ nachlesen. Ein sicherer Bestzug is des no ned.`;
  return `${n} Verteilungen gerechnet: Für deine ${cardLabel(r.actual)} lässt sich kein klarer Nachteil nachweisen. ${cardLabel(best.card)} lag zwar im Modell vorn, aber der Abstand ist statistisch noch unsicher.`;
 }
 function detail(game,step){
  const r=item(game,step);if(!r)return '';
  if(!r.ok)return `<div class="wm43-detail"><strong>Monte-Carlo-Analyse</strong><p>${escape(r.reason||'Kein belastbares Ergebnis.')}</p></div>`;
  const row=r.candidates.slice(0,8).map(c=>`<tr><td>${escape(cardLabel(c.card))}${c.card===r.actual?' (dein Zug)':''}</td><td>${Math.round(c.winRate*100)} %</td><td>${asNumber(c.meanEyes).toFixed(1)}</td></tr>`).join('');
  return `<section class="wm43-detail"><h4>🎲 Berechneter Zugvergleich</h4><p>${escape(explanation(game,step))}</p><table><thead><tr><th>Spielzug</th><th>Modell-Siege</th><th>Ø Teamaugen</th></tr></thead><tbody>${row}</tbody></table><p class="wm43-caution">${r.sampleCount} Verteilungen · ${escape(r.method||'Monte-Carlo-Verteilung mit heuristischen Mitspielern')}. Werte sind keine kalibrierten Wahrscheinlichkeiten. Die Unsicherheit bezieht sich nur auf die Stichprobe, nicht auf Modellfehler.</p></section>`;
 }
 return Object.freeze({VERSION,fingerprint,get,save,grade,item,explanation,detail});
});
