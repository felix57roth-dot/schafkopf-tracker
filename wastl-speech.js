/* Wastl 5.3: rein lokale, kurze und situative Stichkommentare.
 * Keine Cloud, keine generative KI, keine versteckten gegnerischen Haende.
 * Pro Partie reproduzierbare Auswahl ohne doppelte Textschablonen.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const A=node?require('./wastl-match-analysis.js'):root.WastlMatchAnalysis;
 const api=factory(E,A);
 if(node)module.exports=api;
 if(root)root.WastlSpeech=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,A){
 'use strict';
 const VERSION='5.3.0';
 const BANK={"unanalysed":["I schau mir den Stich an. Für den Kartenvergleich fehlt noch die Analyse.","Ob des der beste Zug war, muss Wastl erst ausrechnen.","Erst die Simulation zeigt, was andere Karten gebracht hätten.","Da wart ma mit dem Urteil, bis die Alternativen geprüft sind.","Des kann gut sein. Ohne Vergleich will i nix behaupten.","Die Karten sind erfasst, doch die Spielqualität braucht noch eine Rechnung.","Bei dem Zug zählt auch die Fortsetzung. Erst analysieren!","Schau ma erst auf die Alternativen. Vorher ist’s nur geraten.","Da gibt’s vielleicht mehrere Wege. Die rechnen wir noch durch.","Zum Stich kann i erst nach der Simulation mehr sagen."],"invalid":["Da passen die Daten noch ned. Erst die Kartenfolge prüfen.","Mit der Aufzeichnung stimmt was ned. So wär jeder Tipp geraten.","Für den Stich fehlt eine verlässliche Grundlage.","Erst muss die Erfassung passen. Dann reden wir über gute Züge.","Da lass i die Bewertung weg, bis die Karten stimmen.","Mit diesen Daten wär eine Empfehlung unsicher.","Bei der Aufzeichnung müssen wir noch genauer hinschauen.","Lieber keine Note als eine falsche. Bitte den Stich prüfen.","Hier is erst die Regelprüfung dran.","Ohne verlässlichen Spielverlauf gibt’s keinen seriösen Vergleich."],"forced":["Du musstest so spielen. Des zählt natürlich ned als Fehler.","Keine Auswahl, kein Vorwurf. Die Karte war Pflicht.","Da gab’s nur eine legale Karte. Ganz einfach.","Bedienpflicht! Anders hättest gar ned spielen dürfen.","Des war vorgegeben. Dafür zieh i dir nix ab.","Hier hast keine Wahl gehabt. Also alles in Ordnung.","Nur eine Karte war erlaubt. Die nehm i aus der Wertung.","Pflichtzug. Da gibt’s nix zu kritisieren.","Die Regeln ham hier die Entscheidung getroffen.","Nur die Karte war möglich. Des passt."],"unavailable":["Für den Stich hat die Rechnung kein belastbares Ergebnis.","Da is mein Modell zu unsicher. I rate lieber ned.","Kein verlässlicher Vergleich möglich. Der Stich bleibt offen.","Die Simulation reicht hier für ein Urteil ned aus.","Hier kann i noch keine sinnvolle Alternative nennen.","Des lässt sich mit den Daten ned sauber bewerten.","Da halt i mich zurück, statt dir einen Fehler anzudichten.","Für diesen Stich gibt’s noch keine sichere Modellaussage.","Hier sind die Modellfortsetzungen nicht eindeutig genug.","Eine klare Empfehlung wäre bei dem Stich geraten."],"best":["„{a}“ liegt in meinen Rechnungen vorn. Des schaut ordentlich aus.","Nach meinem Modell war „{a}“ eine gute Wahl.","Guad überlegt: „{a}“ schneidet im Vergleich am besten ab.","Mit „{a}“ hast im Modell eine starke Möglichkeit erwischt.","I find im Modell derzeit keine bessere Karte als „{a}“.","Die Rechnung spricht für „{a}“. Sicher optimal is ned bewiesen.","„{a}“ liegt vorne. So kann ma den Stich angehen.","Des passt zur Simulation: „{a}“ war dort ganz vorn.","Bei den geprüften Varianten liegt „{a}“ vorn.","Meine Modellrunden geben „{a}“ den Vorzug."],"bestTrump":["„{a}“ war im Modell a guter Trumpfzug.","Mit „{a}“ liegst im Trumpfvergleich vorn.","Dein Trumpf „{a}“ hat sich in der Simulation bewährt.","Da spricht die Rechnung für deinen Trumpfeinsatz.","Gut möglich, dass der Trumpf hier richtig investiert war.","„{a}“ steht im Modell vor den anderen erlaubten Karten.","Der Trumpfeinsatz mit „{a}“ schneidet am besten ab.","Meine Fortsetzungen geben dem Trumpfzug den Vorzug.","Trumpf gespielt, im Modell vorn. Des kann sich sehen lassen.","Bei diesem Vergleich hat „{a}“ die Nase vorn."],"bestEyes":["„{a}“ bringt Augen mit und liegt im Modell vorne.","Deine Augenkarte „{a}“ schneidet in der Rechnung gut ab.","Mit „{a}“ hast im Modell eine günstige Möglichkeit gewählt.","Hier spricht die Simulation für den Einsatz von „{a}“.","Die Augenkarte „{a}“ hat sich in den Modellrunden bewährt.","„{a}“ lag in meinem Zugvergleich vorne. Guad!","Dein Einsatz von „{a}“ war im Modell nachvollziehbar.","Da war „{a}“ in meinen Rechnungen die erste Wahl.","Mit „{a}“ passt die Modellbilanz. Mehr kann i ned versprechen.","Die Simulation sieht „{a}“ vor den anderen Karten."],"bestRamsch":["Beim Ramsch liegt „{a}“ in meinem Modell vorn.","Mit „{a}“ fährst im simulierten Ramsch am besten.","Des schaut nach einer brauchbaren Ramsch-Entscheidung aus.","„{a}“ war bei den berechneten Ramsch-Fortsetzungen vorne.","Die Rechnung gibt deinem Ramsch-Zug den Vorzug.","Bei „{a}“ findet mein Modell keine bessere Wahl.","Im Ramsch zählt die ganze Partie. „{a}“ liegt vorn.","Deine „{a}“ hat im Ramsch-Vergleich gut abgeschnitten.","„{a}“ war in den Ramsch-Simulationen die erste Wahl.","Die Ramsch-Rechnung spricht für „{a}“."],"bestLate":["Im Endspiel lag „{a}“ bei meinen Rechnungen vorne.","Die letzten Stiche sind heikel. „{a}“ passt im Modell.","Für die Schlussphase empfiehlt meine Simulation „{a}“.","Spät im Spiel zählt jede Karte. „{a}“ schneidet gut ab.","Dein Zug mit „{a}“ lag im modellierten Endspiel vorne.","Da war „{a}“ gegen die erlaubten Alternativen vorn.","Zum Schluss spricht die Rechnung für „{a}“.","Endspurt: „{a}“ wirkt im Modell gut gewählt.","Die Endspiel-Simulation gibt „{a}“ den Vorzug.","Für die letzten Stiche war „{a}“ im Modell vorne."],"clearTrump":["Im Modell liegt „{b}“ klar vorn. Den Trumpf hätt i eher geschont.","„{b}“ schneidet besser ab und spart dir womöglich einen Trumpf.","Da spricht die Rechnung für „{b}“ statt für den Trumpfeinsatz.","Den starken Trumpf könntest später brauchen. „{b}“ liegt vorn.","I hätt „{b}“ erwogen. Die Simulation gibt der Karte den Vorzug.","„{a}“ kostet Trumpf. „{b}“ war im Modell günstiger.","Da hätt i den Trumpf eher aufgehoben: „{b}“ liegt vorn.","„{b}“ ist im Modell die stärkere Wahl, ohne Trumpf zu verbrauchen.","Bei „{b}“ bleibt die Trumpfreserve erhalten. Des Modell bevorzugt es.","Der Vergleich spricht für „{b}“ und gegen diesen Trumpfeinsatz."],"clearNonTrump":["„{b}“ liegt im Modell vorn. Vielleicht wär Trumpf hier besser.","Da hätt i eher „{b}“ genommen. Die Rechnung spricht dafür.","„{b}“ bringt im Vergleich die günstigere Gewinnchance.","Ein Trumpfeinsatz wär möglich: „{b}“ liegt klar vorn.","Mit „{b}“ rechnet mein Modell günstiger weiter.","„{b}“ ist in der Simulation vor deiner „{a}“.","Da könnte „{b}“ die bessere Stichkontrolle geben.","Meine Simulation bevorzugt „{b}“ als Trumpfalternative.","Der Zugvergleich spricht klarer für „{b}“.","„{b}“ wär im Modell der aussichtsreichere Weg."],"clearEyes":["Mit „{b}“ kommen im Modell mehr Augen zusammen.","„{b}“ bringt in meinen Fortsetzungen den besseren Augenwert.","Da hätt i „{b}“ erwogen. Die Modellbilanz ist besser.","„{b}“ liegt vorn, auch bei den erwarteten Augen.","Nach meiner Rechnung wär „{b}“ der günstigere Augen-Zug.","Bei „{b}“ bleibt im Modell mehr auf deiner Seite.","„{a}“ war möglich. „{b}“ bringt in der Simulation mehr.","Hier spricht der Augenvergleich für „{b}“.","„{b}“ liefert die bessere Modellbilanz bei den Augen.","Die berechneten Augen sprechen für „{b}“."],"clearRamsch":["Beim Ramsch schneidet „{b}“ im Modell klar besser ab.","I hätt im Ramsch eher „{b}“ gewählt. Die Rechnung spricht dafür.","„{b}“ verringert im Modell dein Verlustrisiko.","Im Ramsch war „{b}“ die klarere Simulationsempfehlung.","Da hätt „{b}“ nach meinen Rechnungen besser gepasst.","Der Ramsch-Vergleich spricht für „{b}“ statt „{a}“.","Mit „{b}“ sehen die modellierten Ramsch-Ausgänge günstiger aus.","Meine Ramsch-Rechnung bevorzugt „{b}“. Schau dir den Zug an.","„{b}“ hätte im Modell die günstigere Ramsch-Bilanz.","Für diesen Ramsch-Zug gibt’s einen klaren Modellvorteil für „{b}“."],"clearDefault":["I hätt eher „{b}“ gelegt. Im Modell liegt die Karte klar vorn.","„{b}“ war in den Rechnungen die deutlich günstigere Wahl.","Hier spricht die Simulation für „{b}“ statt „{a}“.","„{b}“ verbessert nach meinem Modell deine Partiechance.","Da seh i einen Lernpunkt: „{b}“ liegt vorn.","„{a}“ war erlaubt, aber „{b}“ schneidet besser ab.","Bei diesem Zug gibt mein Modell „{b}“ den Vorzug.","„{b}“ ist in der Rechnung klarer im Vorteil.","An der Stelle hätt i „{b}“ empfohlen.","Laut Simulation wär „{b}“ die günstigere Alternative."],"unclearTrump":["Trumpf oder sparen? Mein Modell sieht keinen klaren Sieger.","„{b}“ wär eine Alternative, aber ned sicher besser.","Bei der Trumpffrage bleibt meine Rechnung unentschieden.","„{a}“ is hier ned eindeutig schlechter als „{b}“.","Ob der Trumpf später wichtiger is, kann i ned sicher sagen.","Beide Wege mit der Trumpfreserve haben ihren Reiz.","Da is der Vergleich mit „{b}“ zu knapp für einen Vorwurf.","Für die Trumpfentscheidung fehlt ein klarer Modellvorteil.","I würd den Trumpfzug hier noch ned als Fehler sehen.","Hier gibt’s keinen belastbaren Trumpfvergleich mit Gewinner."],"unclearWenz":["Beim Wenz sind die Unter kostbar. Mein Vergleich bleibt knapp.","„{b}“ wär möglich, aber im Wenz ned sicher besser.","Da lässt mein Wenz-Modell mehrere Züge offen.","Ob du einen Unter sparen solltest, zeigt die Rechnung ned klar.","Die Wenz-Fortsetzungen unterscheiden sich hier kaum sicher.","„{a}“ is im Wenz kein nachgewiesener Fehlzug.","I seh im Wenz eine Alternative, aber keinen klaren Vorteil.","Beim Wenz wär i mit einem schnellen Urteil vorsichtig.","Des is beim Wenz eine knappe Modellentscheidung.","Der Wenz-Vergleich lässt „{a}“ und „{b}“ offen."],"unclearRuf":["Beim Rufspiel bleibt die Partnerfrage wichtig. Der Vergleich is knapp.","„{b}“ wär möglich. Sicher besser is die Karte ned.","Im Rufspiel will i da keinen Fehler behaupten.","Die Modellfortsetzungen lassen beim Rufspiel mehrere Wege zu.","Da kann die Partnersituation viel ausmachen. Kein klarer Vorteil.","„{a}“ is im Rufspiel ned eindeutig schlechter.","Für „{b}“ seh i beim Rufspiel keinen sicheren Vorsprung.","Die Entscheidung bleibt im Rufspiel modellbedingt offen.","Ohne klaren Abstand würd i den Rufspielzug gelten lassen.","Mein Rufspiel-Vergleich reicht hier ned für eine klare Empfehlung."],"unclearLate":["Im Endspiel liegt die Wahrheit oft knapp beieinander.","„{b}“ wär zum Schluss denkbar, aber ned sicher besser.","Da zeigt mein Endspielvergleich keinen eindeutigen Vorteil.","Ob „{a}“ oder „{b}“: Die Rechnung bleibt unsicher.","In den letzten Stichen is des keine klare Fehlentscheidung.","Fürs Endspiel geben die Simulationen noch kein festes Urteil.","Die Schlussphase ist knifflig. Beide Wege sind offen.","Der Vergleich im Endspiel reicht ned für einen Vorwurf.","Zum Schluss muss ma genau hinschauen. Hier bleibt’s knapp.","Des is im Endspiel ein offener Vergleich, kein klarer Fehler."],"unclearDefault":["„{a}“ oder „{b}“? Mein Modell kann des ned klar trennen.","Beide Karten bleiben in der Simulation mögliche Wege.","Da bin i vorsichtig: Für „{b}“ fehlt ein sicherer Vorteil.","„{a}“ is ned eindeutig schlechter als „{b}“.","Die Stichproben lassen hier keinen klaren Fehler erkennen.","Des is knapp. „{b}“ ist eine Option, aber ned sicher besser.","Bei dem Zug reicht die Rechnung für ein Urteil noch ned.","I seh eine Alternative, aber keinen belastbaren Nachteil.","Da entscheidet die Simulation ned eindeutig zwischen den Karten.","Beide Züge sind denkbar. I würd keinen davon verurteilen."]};
 function label(id){
  const p=String(id||'').split('-');
  const suit={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'};
  const rank={A:'Sau','10':'Zehn',K:'König',O:'Ober',U:'Unter','9':'Neun','8':'Acht','7':'Sieben'};
  return (suit[p[0]]||p[0]||'')+' '+(rank[p[1]]||p[1]||'');
 }
 function hash(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
 }
 function category(game,step,r,ready){
  if(ready===false)return 'invalid';
  if(!r)return 'unanalysed';
  if(r.onlyLegal||r.ok&&r.candidates?.length===1)return 'forced';
  if(!r.ok||!r.recorded||!r.reference||!E?.parse(r.actual)||!E.parse(r.reference.card))return 'unavailable';
  const played=r.actual,best=r.reference.card;
  const usedTrump=E.isTrump(played,game),bestTrump=E.isTrump(best,game);
  const highTrump=id=>E.isTrump(id,game)&&E.FULL.filter(c=>E.isTrump(c,game)&&E.compare(c,id,id,game)<0).length<5;
  if(played===best){
   if(game.type==='ramsch')return 'bestRamsch';
   if(step>=6)return 'bestLate';
   if(usedTrump)return 'bestTrump';
   if(E.parse(played).eyes>=10)return 'bestEyes';
   return 'best';
  }
  if(!r.clearAlternative){
   if(usedTrump!==bestTrump)return 'unclearTrump';
   if(['wenz','farbwenz'].includes(game.type))return 'unclearWenz';
   if(game.type==='rufspiel')return 'unclearRuf';
   if(step>=6)return 'unclearLate';
   return 'unclearDefault';
  }
  if(game.type==='ramsch')return 'clearRamsch';
  if(usedTrump&&(!bestTrump||highTrump(played)&&!highTrump(best)))return 'clearTrump';
  if(!usedTrump&&bestTrump)return 'clearNonTrump';
  if(Number.isFinite(r.recorded.meanEyes)&&Number.isFinite(r.reference.meanEyes)
    &&r.reference.meanEyes-r.recorded.meanEyes>=3)return 'clearEyes';
  return 'clearDefault';
 }
 function short(game,step,options={}){
  if(!game||!Number.isInteger(step)||step<0||step>=8)return null;
  const analysis=options.data===undefined?A?.get(game):options.data;
  const reports=analysis?.reports||[];
  const used=new Set(),seed=String(game.id||'')+'|'+String(game.type||'');
  for(let i=0;i<=step;i++){
   const report=reports[i],kind=category(game,i,report,options.ready);
   const list=BANK[kind];
   const initial=hash(seed+'|'+kind+'|'+i)%list.length;
   let index=initial;
   for(let j=0;j<list.length;j++){
    const candidate=(initial+j)%list.length;
    if(!used.has(kind+':'+candidate)){index=candidate;break;}
   }
   used.add(kind+':'+index);
   if(i===step)return list[index].replaceAll('{a}',label(report?.actual)).replaceAll('{b}',label(report?.reference?.card));
  }
  return null;
 }
 return Object.freeze({VERSION,short,category,phraseCount:Object.values(BANK).reduce((n,a)=>n+a.length,0),categoryCount:Object.keys(BANK).length});
});
