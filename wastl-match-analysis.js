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
 const VERSION='4.5.0', STORAGE='wastl-match-model-v45', BENCH_STORAGE='wastl-benchmark-v45', BENCH_VERSION='4.5.0';
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
  const key=fingerprint(game),data={version:VERSION,model:'wastl-policy-4.5',samples,finished:Date.now(),reports};
  memory.set(key,data);
  try{let values=cacheRead().filter(x=>x.key!==key);values.unshift({key,data});root.localStorage?.setItem(STORAGE,JSON.stringify(values.slice(0,5)));}catch{/* In-memory cache works without available storage. */}
  return data;
 }
 // Ein REPRODUZIERBARER Entscheidungsindex – kein kalibrierter Nachweis menschlicher Spielstaerke.
 // 5/10 ist die ausdruecklich neutrale Basis. Nur von der Simulation unterscheidbare
 // Alternativen koennen den Index bewegen; wenig Evidenz wird zur 5 hin geschrumpft.
 // Der Sieg oder die Niederlage ist KEIN Eingangsparameter der Note.
 function modelGrade(data){
  if(!data?.reports||data.reports.length!==8)return {grade:null,reason:'Bitte zuerst die komplette Partie simulieren.'};
  const reported=data.reports;
  const eligible=reported.filter(r=>r?.ok&&Array.isArray(r.candidates)&&r.candidates.length>1&&Number.isFinite(r.recorded?.winRate)&&Number.isFinite(r.reference?.winRate));
  const forced=reported.filter(r=>r?.onlyLegal||r?.ok&&r.candidates?.length===1).length;
  const missing=reported.filter(r=>!r?.ok&&!r?.onlyLegal).length;
  let meaningful=0,regret=0,roomSum=0,penalties=0,meanSamples=0;
  for(const r of eligible){
   const best=r.reference.winRate,played=r.recorded.winRate;
   const baseline=r.candidates.reduce((sum,c)=>sum+c.winRate,0)/r.candidates.length;
   const room=Math.max(0,best-baseline);
   if(room<.035)continue;
   meaningful++;meanSamples+=r.sampleCount||0;
   roomSum+=room;
   // Paired uncertainty protects against promoting a noisy alternative to a certain error.
   const excess=Math.max(0,best-played-Math.max(0,r.pairedUncertainty||0)*.5);
   regret+=Math.min(2.25*room,excess);
   if(r.clearAlternative)penalties++;
  }
  const relative=roomSum>0?regret/roomSum:0;
  const raw=roomSum?Math.max(1,Math.min(10,10-5*relative)):5;
  const coverage=meaningful/(meaningful+2.5); // conservative partial pooling
  const sampleFactor=meaningful?Math.min(1,meanSamples/meaningful/200):0;
  const qualityWeight=coverage*sampleFactor;
  const score=5+(raw-5)*qualityWeight;
  const grade=Math.max(1,Math.min(10,Math.round(score)));
  const evidence=meaningful>=4&&sampleFactor>=.8&&missing===0?'mittel':'gering';
  const msg=meaningful===0?'Keine Entscheidung zeigte im Modell klar unterscheidbare Alternativen. 5/10 ist hier ausdrücklich ein neutraler Platzhalter und keine Aussage über deine Spielstärke.'
   :`${meaningful} von 8 Stichen mit unterscheidbaren Alternativen, ${penalties} deutliche Modellabweichungen. Der Entscheidungsindex wird wegen begrenzter Evidenz zur neutralen 5/10 gedämpft.`;
  return {grade,modelIndex:true,informative:meaningful,considered:eligible.length,forced,missing,clear:penalties,
   averageN:meaningful?Math.round(meanSamples/meaningful):0,quality:evidence,relative,rawIndex:Math.round(raw*10)/10,
   reason:`${msg} Datengrundlage: ${eligible.length} vergleichbare Züge, ${forced} erzwungene Züge${missing?`, ${missing} nicht berechenbare Stiche`:''}. Modellzuverlässigkeit: ${evidence}. Keine an Schafkopf-Experten kalibrierte Leistungsnote; selbst bei 10/10 ist kein fehlerfreies Spiel bewiesen.`};
 }
 // Ergebnisse des getrennten Prueflabors; kein Nachweis menschlicher Spielstaerke.
 function saveBenchmark(report){
  if(!report||report.version!==BENCH_VERSION||report.model!=='wastl-policy-4.5'||!report.ok)throw Error('Pruefprotokoll ungueltig');
  const {cases,errors,...summary}=report; // Only small, non-personal aggregate data.
  const b={...summary,saved:Date.now()};
  try{root.localStorage?.setItem(BENCH_STORAGE,JSON.stringify(b));}catch{};
  benchmarkMemory=b;return b;
 }
 let benchmarkMemory=null;
 function getBenchmark(){
  if(benchmarkMemory)return benchmarkMemory;
  try{
   const b=JSON.parse(root.localStorage?.getItem(BENCH_STORAGE)||'null');
   if(b?.version===BENCH_VERSION&&b.model==='wastl-policy-4.5'&&b.ok){benchmarkMemory=b;return b;}
  }catch{}
  return null;
 }
 function benchmarkAssessment(type){
  const b=getBenchmark();
  if(!b)return {status:'missing',reason:'Noch kein unabhaengiger Testlauf durchgefuehrt.'};
  const segment=b.types?.[type];
  if(!segment||segment.count<12)return {status:'too-few',reason:`Nur ${segment?.count||0} Testentscheidungen fuer diese Spielart (mindestens 12 erforderlich).`};
  if(segment.lift-(segment.margin||1)<=.015)return {status:'inconclusive',reason:'Kein ausreichend klarer Vorteil gegen die Zufallsreferenz nachgewiesen.'};
  if(segment.modelError>=.10)return {status:'inconclusive',reason:'Modellprognosen weichen zu stark von den zurueckgehaltenen Ergebnissen ab.'};
  return {status:'passed',reason:'Im kuenstlichen Vergleichslabor bestanden; noch nicht durch menschliche Experten kalibriert.'};
 }
 function grade(data,type){
  const raw=modelGrade(data);
  if(raw.grade==null)return raw;
  // Die Benchmarks bewerten das SIMULATIONSMODELL, nicht den jeweiligen Spieler.
  // Daher niemals die Partienote hinter einem globalen Benchmark-Gate verstecken.
  // Transparenz ueber die Modellguete bleibt Pflicht.
  const b=benchmarkAssessment(type);
  return {...raw,assessment:b.status,
   reason:raw.reason+' '+(b.status==='passed'
    ?'Der kuenstliche Modellvergleich fuer diese Spielart bestand die internen Mindestkriterien.'
    :'Fuer diese Spielart ist ein Vorteil der Engine gegenueber der Testreferenz weiterhin nicht sicher nachgewiesen.')};
 }
 function cardLabel(id){
  const parts=String(id||'').split('-');
  const suit={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'}[parts[0]]||parts[0];
  const rank={A:'Sau','10':'Zehn',K:'König',O:'Ober',U:'Unter','9':'Neun','8':'Acht','7':'Sieben'}[parts[1]]||parts[1];
  return `${suit} ${rank}`;
 }
 function item(game,step){return get(game)?.reports?.[step]||null;}
 function eyes(id){return ({A:11,'10':10,K:4,O:3,U:2,'9':0,'8':0,'7':0})[String(id).split('-')[1]]??0;}
 function isTrump(id,game){
  const [suit,rank]=String(id).split('-');
  if(game.type==='wenz'||game.type==='farbwenz')return rank==='U'||(game.type==='farbwenz'&&suit===game.trumpSuit);
  if(rank==='O'||rank==='U')return true;
  if(game.type==='solo'||game.type==='tout'||game.type==='farbgeier')return suit===game.trumpSuit;
  return suit==='herz';
 }
 function tacticalHint(game,step,actual,best){
  const mine=eyes(actual),choice=eyes(best);
  if(mine>=10)return `${cardLabel(actual)} bringt ${mine} eigene Augen mit. Ein niedrigerer Trumpf ist nicht allein deshalb besser, weil er denselben Stich gewonnen hätte: Ein hoher Trumpf kann eigene Augen sichern, aber später fehlen.`;
  if(choice>=10&&choice>mine)return `${cardLabel(best)} bringt ${choice} eigene Augen mit. Das hilft nur dann, wenn der Stich auf deiner Seite bleibt; andernfalls droht ein Augenverlust.`;
  if(isTrump(actual,game)&&!isTrump(best,game))return `Du hast einen Trumpf eingesetzt, während ${cardLabel(best)} keinen Trumpf kostet. Überlege beim nächsten Mal, wie wichtig deine Trumpfreserve für die letzten Stiche ist.`;
  if(!isTrump(actual,game)&&isTrump(best,game))return `Ein Trumpfeinsatz hätte hier eine andere Stichkontrolle ermöglicht. Wäge den möglichen Gewinn gegen die fehlende Trumpfreserve in späteren Stichen ab.`;
  if(game.type==='rufspiel')return 'Im Rufspiel ist der Partner vor dem Fallen des gerufenen Asses nicht immer bekannt. Beachte, welche Karten du bei deiner Entscheidung bereits gesehen hast.';
  if(game.type==='wenz')return 'Beim Wenz sind nur die vier Unter dauerhafte Trümpfe. Die Kontrolle der Fehlfarben und der spätere Einsatz der Unter sind deshalb besonders wichtig.';
  return step<3?'Gerade am Anfang ist der Erhalt hoher Trümpfe eine mögliche Alternative. Entscheidend ist ihr erwarteter Nutzen über die restlichen Stiche.':'In der Schlussphase wird wichtig, welche Augen und Trümpfe für die letzten Stiche noch offen sein können.';
 }
 function explanation(game,step){
  const r=item(game,step);if(!r)return null;
  if(r.onlyLegal)return `Stich ${step+1}: Du hattest nur eine legale Karte. Das ist keine freie Entscheidung und beeinflusst Wastls Spielnote nicht.`;
  if(!r.ok)return `Stich ${step+1}: Hier ist kein verlässlicher Kartenvergleich gelungen (${r.reason||'unzureichende Daten'}). Bitte prüfe die Aufzeichnung; die Note wird entsprechend vorsichtiger.`;
  const chosen=r.recorded,best=r.reference;
  if(!chosen||!best)return null;
  const winPlayed=Math.round(chosen.winRate*100),winBest=Math.round(best.winRate*100);
  const delta=Math.max(0,winBest-winPlayed);
  const uncertainty=Math.round(Math.max(0,r.pairedUncertainty||0)*100);
  const eyesDifference=Math.round((best.meanEyes-chosen.meanEyes)*10)/10;
  let comparison='';
  if(best.card===r.actual){
   comparison=`Deine ${cardLabel(r.actual)} liegt unter ${r.sampleCount} getesteten Verteilungen im Modell vorn (${winPlayed}% modellierte Siege). Ein sicher optimaler Zug ist damit noch nicht belegt.`;
  }else if(r.clearAlternative){
   comparison=`Wastl empfiehlt hier eher ${cardLabel(best.card)} statt deiner ${cardLabel(r.actual)}: ${winBest}% gegenüber ${winPlayed}% simulierte Siege (Abstand ${delta} Prozentpunkte; Stichprobenunsicherheit ±${uncertainty} Punkte).`;
  }else{
   comparison=`Deine ${cardLabel(r.actual)} ist nicht eindeutig schlechter als ${cardLabel(best.card)}: ${winPlayed}% gegenüber ${winBest}% modellierte Siege. Der Unterschied von ${delta} Punkten ist mit ±${uncertainty} Punkten unsicher. Das ist kein nachgewiesener Fehler.`;
  }
  const pointContext=Math.abs(eyesDifference)>=2&&best.card!==r.actual
   ?` In diesen Fortsetzungen erzielte dein Team mit ${cardLabel(best.card)} im Mittel ${Math.abs(eyesDifference).toFixed(1).replace('.',',')} Augen ${eyesDifference>0?'mehr':'weniger'}; Gewinnquote und Augen können also unterschiedlich ausfallen.`:'';
  const why=tacticalHint(game,step,r.actual,best.card);
  return `${comparison}${pointContext} ${why}`;
 }
 function learningPoints(game){
  const data=get(game);if(!data?.reports)return [];
  const candidates=data.reports.map((r,i)=>({r,i})).filter(x=>x.r?.ok&&x.r?.candidates?.length>1);
  const clear=candidates.filter(x=>x.r.clearAlternative&&x.r.reference?.card!==x.r.actual)
   .sort((a,b)=>(b.r.pairedWinGap||0)-(a.r.pairedWinGap||0));
  if(clear.length)return clear.slice(0,2).map(({r,i})=>({title:`Stich ${i+1}: ${cardLabel(r.actual)} oder ${cardLabel(r.reference.card)}?`,
    body:`${Math.round(r.recorded.winRate*100)}% gegen ${Math.round(r.reference.winRate*100)}% modellierte Siege, bei ${r.sampleCount} Verteilungen. ${tacticalHint(game,i,r.actual,r.reference.card)}`}));
  if(!candidates.length)return [{title:'Wenig Wahlmöglichkeiten',body:'Die aufgezeichnete Partie enthält zu wenige berechnete Alternativen für konkretes Zugfeedback. Das ist keine Aussage über deine Spielstärke.'}];
  const relevant=candidates.sort((a,b)=>(b.r.reference.winRate-b.r.recorded.winRate)-(a.r.reference.winRate-a.r.recorded.winRate))[0];
  const r=relevant.r;
  if(r.reference.card===r.actual){
   return [{title:`Stich ${relevant.i+1}: ${cardLabel(r.actual)} war vorne`,
    body:`Unter ${r.sampleCount} möglichen Kartenverteilungen lag dein Zug im Modell vorn (${Math.round(r.recorded.winRate*100)}% simulierte Siege). ${tacticalHint(game,relevant.i,r.actual,r.reference.card)} Das belegt jedoch noch keinen fehlerfreien Zug.`}];
  }
  return [{title:`Stich ${relevant.i+1}: ${cardLabel(r.actual)} oder ${cardLabel(r.reference.card)}?`,
   body:`Beide Züge liegen im Bereich der Stichprobenunsicherheit. ${tacticalHint(game,relevant.i,r.actual,r.reference.card)} Deshalb wertet Wastl deine Karte hier nicht als nachgewiesenen Fehler.`}];
 }
 function detail(game,step){
  const r=item(game,step);if(!r)return '';
  if(!r.ok)return `<div class="wm43-detail"><strong>Monte-Carlo-Analyse</strong><p>${escape(r.reason||'Kein belastbares Ergebnis.')}</p></div>`;
  const ramsch=game.type==='ramsch';
  const row=r.candidates.slice(0,8).map(c=>`<tr><td>${escape(cardLabel(c.card))}${c.card===r.actual?' (dein Zug)':''}</td><td>${Math.round(c.winRate*100)} %</td><td>${asNumber(c.meanEyes).toFixed(1)}</td></tr>`).join('');
  return `<section class="wm43-detail"><h4>🎲 Berechneter Zugvergleich</h4><p>${escape(explanation(game,step))}</p><table><thead><tr><th>Spielzug</th><th>${ramsch?'Nicht Ramschverlierer':'Modell-Siege'}</th><th>${ramsch?'Ø eigene Augen':'Ø Teamaugen'}</th></tr></thead><tbody>${row}</tbody></table><p class="wm43-caution">${r.sampleCount} Verteilungen · ${escape(r.method||'Monte-Carlo-Verteilung mit heuristischen Mitspielern')}. Werte sind keine kalibrierten Wahrscheinlichkeiten. Die Unsicherheit bezieht sich nur auf die Stichprobe, nicht auf Modellfehler.</p></section>`;
 }
 return Object.freeze({VERSION,fingerprint,get,save,grade,modelGrade,saveBenchmark,getBenchmark,benchmarkAssessment,item,explanation,learningPoints,detail});
});
