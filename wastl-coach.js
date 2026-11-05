/* Wastls betreutes Offline-Übungsspiel: ausschließlich eigene Hand und offene Stiche. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const P=node?require('./wastl-policy.js'):root.WastlPolicy;
 const api=factory(E,P);
 if(node)module.exports=api;
 if(root)root.WastlCoach=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P){
 'use strict';
 const VERSION='1.0.0',SUITS={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schellen'};
 const RANKS={A:'Sau','10':'Zehn',K:'König',O:'Ober',U:'Unter','9':'Neun','8':'Acht','7':'Sieben'};
 function name(card){const x=E.parse(card);return x?SUITS[x.suit]+'-'+RANKS[x.rank]:'unbekannte Karte';}
 function publicView(g){
  if(!g||!E.SEATS.includes(g.mySeat))return null;
  return {mySeat:g.mySeat,phase:g.phase,
   hand:[...(g.hands?.[g.mySeat]||[])],
   current:(g.current||[]).map(x=>({seat:x.seat,card:x.card})),
   past:(g.tricks||[]).map(t=>({leaderSeat:t.leaderSeat,cards:[...t.cards]})),
   leaderSeat:g.leaderSeat,turn:g.turn,type:g.type,calledSuit:g.calledSuit,
   trumpSuit:g.trumpSuit,declarerSeat:g.declarerSeat,auctionStage:g.auctionStage,
   best:g.best?{type:g.best.type,priority:g.best.priority,label:g.best.label}:null};
 }
 function legal(v){
  if(v?.phase!=='playing'||v.turn!==v.mySeat)return [];
  try{return E.legalMoves(v.hand,v.current[0]?.card||null,v,{past:v.past,trickIndex:v.past.length});}
  catch{return [];}
 }
 function rule(v){
  if(!v)return {title:'Wastl hilft',text:'Ich erkläre dir die Regeln am Spieltisch.'};
  if(v.phase==='knocking')return {title:'Legen oder Weiter?',text:'Legen erhöht den Spielwert. Als Anfänger darfst du einfach „Weiter“ wählen.'};
  if(v.phase==='shotOffer')return {title:'Schuss oder Weiter?',text:'Schuss und Retour erhöhen den Spielwert. Du musst beides nicht ansagen.'};
  if(['bidding','chooseGame'].includes(v.phase))return v.auctionStage==='opening'
   ?{title:'Ansagerunde',text:'„Ich spiele“ meldet Interesse an. „Weiter“ bedeutet, dass du diesmal nichts ansagst.'}
   :{title:'Spielart wählen',text:'Rufspiel heißt zwei gegen zwei; Solo und Wenz sind Alleinspiele. Ein bereits angesagtes Spiel darfst du nur mit einem höherwertigen Spiel überbieten.'};
  if(v.phase!=='playing'||v.turn!==v.mySeat)return {title:'Wastl erklärt',text:'Beobachte, welche Karten am Tisch liegen. Wer den Stich gewinnt, spielt danach aus.'};
  const moves=legal(v),lead=v.current[0]?.card;
  if(moves.length===1)return {title:'Nur eine Karte erlaubt',text:'Du musst '+name(moves[0])+' legen. Die Bedienpflicht und mögliche Ruf-Sau-Regeln lassen nur diese Karte zu.',forced:true,legal:moves};
  if(!lead)return {title:'Du spielst aus',text:'Du darfst eine erlaubte Karte wählen. Beim Rufspiel sind Ober, Unter und übrige Herzen Trumpf. Die Karte mit den meisten Augen gewinnt nicht immer.',legal:moves};
  const cls=E.colorClass(lead,v),matching=v.hand.filter(c=>E.colorClass(c,v)===cls);
  if(matching.length){
   if(cls==='TRUMPF')return {title:'Trumpf bedienen',text:name(lead)+' ist Trumpf. Du hast noch Trümpfe und musst einen davon legen – auch wenn sein Farbsymbol anders aussieht.',legal:moves};
   return {title:SUITS[cls]+' bedienen',text:'Eine normale '+SUITS[cls]+'karte wurde angespielt. Du hast diese Fehlfarbe noch und musst sie bedienen. Ein '+SUITS[cls]+'-Ober oder Unter kann dagegen Trumpf sein.',legal:moves};
  }
  return {title:'Keine passende Karte',text:'Du hast die angespielte Kartenart nicht mehr. Du darfst eine andere erlaubte Karte spielen, musst aber nicht stechen. Eine Ruf-Sau kann Sonderregeln haben.',legal:moves};
 }
 function ranks(v){
  const moves=legal(v);if(!moves.length)return [];
  try{return P.evaluate(v.hand,v.current.map(x=>x.card),v.mySeat,v.leaderSeat,v,{past:v.past},()=>.5).filter(r=>moves.includes(r.card));}
  catch{return moves.map(card=>({card,reason:'Mehrere Karten sind erlaubt.'}));}
 }
 function hint(v){
  const moves=legal(v);
  if(!moves.length)return {ok:false,text:'Du bist gerade nicht am Zug.'};
  if(moves.length===1)return {ok:true,forced:true,card:moves[0],title:'Diese Karte musst du spielen',
   text:'Nur '+name(moves[0])+' ist regelkonform. Hier gibt es keine taktische Entscheidung.'};
  const r=ranks(v),first=r[0],next=r[1];
  if(!first)return {ok:false,text:'Ein Kartentipp ist gerade nicht verfügbar.'};
  return {ok:true,forced:false,card:first.card,alternative:next?.card||null,
   title:'Wastls Kartentipp',text:'Ich würde '+name(first.card)+' in Betracht ziehen. '+(first.reason||'')+
    (next?' Eine mögliche Alternative ist '+name(next.card)+'.':'')+
    ' Das ist eine heuristische Einschätzung, keine garantiert beste Karte.'};
 }
 function feedback(v,card){
  if(!legal(v).includes(card))return {ok:false,text:'Das ist keine legale Karte für diesen Zug.'};
  const h=hint(v),n=name(card);
  if(h.forced)return {ok:true,forced:true,title:'Bedienpflicht erfüllt',text:n+' war die einzige erlaubte Karte. Gut, dass du sie richtig bedient hast.'};
  if(!h.ok)return {ok:true,title:'Karte gelegt',text:n+' war regelkonform.'};
  if(h.card===card)return {ok:true,title:'Gut überlegt',text:n+' war regelkonform und entspricht meinem vorsichtigen Tipp. Ob sie wirklich optimal ist, kann ich nicht sicher wissen.'};
  return {ok:true,title:'Eine andere Möglichkeit',text:n+' war regelkonform. Auch '+name(h.card)+' wäre denkbar gewesen. Das ist kein sicherer Fehler: Die Hände der anderen Spieler sind unbekannt.',alternative:h.card};
 }
 return Object.freeze({VERSION,publicView,legal,rule,hint,feedback,name});
});