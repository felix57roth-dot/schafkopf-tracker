/* Tests fuer die experimentelle 0–100-Spielqualitaet.
 * node --test tests/wastl-quality.test.js
 * Keine gespeicherten Spieler-/Partiedaten erforderlich.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../wastl-match-analysis.js');
const forced=()=>({ok:false,onlyLegal:true});
function report({win=0.65,eyes=75,actualWin=win,actualEyes=eyes,samples=160,uncertainty=0.04}={}){
 const reference={card:'herz-A',winRate:win,meanEyes:eyes};
 const recorded={card:'eichel-7',winRate:actualWin,meanEyes:actualEyes};
 const alternatives=[reference,recorded,{card:'gras-9',winRate:0.3,meanEyes:30}];
 return {ok:true,reference,recorded,candidates:alternatives,sampleCount:samples,
  pairedUncertainty:uncertainty,clearAlternative:win-actualWin>uncertainty};
}
const match=rows=>({reports:[...rows,...Array.from({length:8-rows.length},forced)]});
test('Ohne vollstaendige Simulation keine erfundene Spielnote',()=>{
 assert.equal(A.quality(null,'solo').score,null);
 assert.equal(A.quality({reports:[]},'solo').score,null);
 assert.equal(A.quality(match([]),'solo').score,null);
});
test('Sichere Pflichtzuege werden nie als Fehler bewertet',()=>{
 const same=A.quality(match([report(),report()]),'solo');
 const many=A.quality(match([report(),report(),forced(),forced()]),'solo');
 assert.equal(same.score,many.score);
 assert.equal(many.forced,6);
 assert.equal(many.informative,2);
});
test('Nach Modell bessere Entscheidungen ergeben mehr Punkte als deutlich schlechtere',()=>{
 const strong=A.quality(match([report(),report()]),'solo');
 const weak=A.quality(match([
  report({actualWin:0.2,actualEyes:20,uncertainty:0.01}),
  report({actualWin:0.2,actualEyes:20,uncertainty:0.01})
 ]),'solo');
 assert.ok(strong.score!==null);
 assert.ok(weak.score!==null);
 assert.ok(strong.score>weak.score,JSON.stringify([strong,weak]));
 assert.ok(strong.score>=0&&strong.score<=100);
 assert.ok(weak.score>=0&&weak.score<=100);
});
test('Spielgewinn oder Niederlage beeinflusst die Entscheidungsnote nicht',()=>{
 const data=match([report(),report()]);
 assert.equal(A.quality({...data,won:true},'solo').score,A.quality({...data,won:false},'solo').score);
});
test('Statistisch kaum unterscheidbare Karten ergeben keine erzwungene Zahl',()=>{
 const tiny=report({win:0.5,actualWin:0.5,eyes:60,actualEyes:60});
 tiny.candidates=[tiny.reference,tiny.recorded];
 assert.equal(A.quality(match([tiny,tiny]),'solo').score,null);
});
test('Bei zu wenigen Simulationen keine Scheingenauigkeit',()=>{
 assert.equal(A.quality(match([report({samples:50}),report({samples:50})]),'solo').score,null);
});
test('Mehr als ein fehlender Stich verhindert eine angeblich vollstaendige Partienote',()=>{
 const data=match([report(),report(),{ok:false,reason:'Fehlende Daten'},{ok:false,reason:'Fehlende Daten'}]);
 const q=A.quality(data,'solo');
 assert.equal(q.score,null);
 assert.equal(q.missing,2);
});
test('Ramsch belohnt bei gleicher Gewinnquote weniger eigene Augen',()=>{
 const fewer=A.quality(match([report({win:.7,actualWin:.7,eyes:20,actualEyes:20}),
  report({win:.7,actualWin:.7,eyes:20,actualEyes:20})]),'ramsch');
 const more=A.quality(match([report({win:.7,actualWin:.7,eyes:20,actualEyes:80}),
  report({win:.7,actualWin:.7,eyes:20,actualEyes:80})]),'ramsch');
 assert.ok(fewer.score!==null&&more.score!==null);
 assert.ok(fewer.score>more.score,JSON.stringify([fewer,more]));
});
test('Evidenz- und Methodenhinweis bleiben in der Ausgabe erhalten',()=>{
 const q=A.quality(match([report(),report()]),'solo');
 assert.match(q.reason,/experimentell/i);
 assert.match(q.reason,/Pflichtzuege/i);
 assert.equal(q.modelScore,true);
 assert.equal(q.version,'5.2.0');
});
