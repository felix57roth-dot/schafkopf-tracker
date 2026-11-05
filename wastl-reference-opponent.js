/* Wastl Rufspiel-Referenzgegner 1.0.
 * Eigenstaendige heuristische Zugsuche; einziges Projekt-Dependency:
 * der gemeinsam verifizierte Schafkopf-Regelkern (WastlEngine).
 * NICHT WastlPolicy, WastlOpponents, WastlTactics oder Monte-Carlo.
 * Jeder Aufruf darf nur eigene Hand und oeffentlichen Verlauf erhalten.
 * Reproduzierbar, offline. Nicht gegen echte menschliche Spieler kalibriert.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const api=factory(E);
 if(node)module.exports=api;
 if(root)root.WastlReferenceOpponent=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
 'use strict';
 const VERSION='1.0.0',STYLES=['resource','tempo'];
 const eyes=c=>E.parse(c).eyes;
 function publicAceOwner(game,past,played,leader){
  if(game.type!=='rufspiel')return null;
  const called=game.calledSuit+'-A';
  for(const t of past||[]){
   const index=(t.cards||[]).indexOf(called);
   if(index>=0)return E.nextSeat(t.leaderSeat,index);
  }
  const index=(played||[]).indexOf(called);
  return index>=0?E.nextSeat(leader,index):null;
 }
 function side(seat,ownHand,game,partner){
  if(game.type!=='rufspiel')return seat===game.declarerSeat?'attack':'defense';
  if(seat===game.declarerSeat||seat===partner||
      ownHand?.includes(game.calledSuit+'-A'))return 'attack';
  return 'defense';
 }
 function otherSide(seat,viewerSeat,viewerHand,game,partner){
  if(seat===game.declarerSeat||seat===partner)return 'attack';
  if(seat===viewerSeat)return side(viewerSeat,viewerHand,game,partner);
  if(partner)return 'defense';
  return 'unknown';
 }
 function topCard(cards,leader,game){
  if(!cards.length)return null;
  let k=0;
  for(let i=1;i<cards.length;i++)
   if(E.compare(cards[i],cards[k],cards[0],game)<0)k=i;
  return {card:cards[k],seat:E.nextSeat(leader,k)};
 }
 function choose(hand,played,seat,leader,game,publicState={},style='resource',random=()=>0.5){
  if(!Array.isArray(hand)||!hand.length||hand.some(c=>!E.parse(c)))
   throw Error('Referenzspieler: eigene Hand fehlt.');
  const past=Array.isArray(publicState?.past)?publicState.past:[];
  const legal=E.legalMoves(hand,played[0]||null,game,{past,trickIndex:past.length});
  if(legal.length===1)return legal[0];
  const partner=publicAceOwner(game,past,played,leader);
  const own=side(seat,hand,game,partner),top=topCard(played,leader,game);
  const holder=top?otherSide(top.seat,seat,hand,game,partner):null;
  const allied=!!top&&holder!=='unknown'&&holder===own;
  const opponent=!!top&&holder!=='unknown'&&holder!==own;
  const onTable=played.reduce((n,c)=>n+eyes(c),0);
  const last=played.length===3,late=past.length>=5;
  const trumps=hand.filter(c=>E.isTrump(c,game)).length;
  const ranks=card=>{
   if(E.isTrump(card,game)){
    // 0 ist der staerkste Trumpf: der Abschlag vermeidet das
    // verschwenderische Ausspielen von Ober/Unter fuer kleine Stiche.
    return E.FULL.filter(x=>E.isTrump(x,game)
     &&E.compare(x,card,card,game)<0).length;
   }
   const p=E.parse(card);
   return ['A','10','K','O','U','9','8','7'].indexOf(p.rank);
  };
  const rows=legal.map(card=>{
   const trump=E.isTrump(card,game),point=eyes(card);
   const strength=ranks(card),canWin=!!top&&E.compare(card,top.card,played[0],game)<0;
   const strong=trump?Math.max(0,9-strength):Math.max(0,6-strength);
   let value;
   if(!played.length){
    // Tempo-Variante drueckt mit Assen und hohen Truempen,
    // Ressourcen-Variante nimmt zu Beginn eher sichere Fehlasse.
    value=trump?(style==='tempo'?1.4+strong*.32:-2.5-strong*.10)
      :(point===11?5.8:point===10?1.5:2.8-strong*.35);
    if(own==='defense'&&trump&&trumps===1&&!late)value-=2.2;
    if(game.type==='rufspiel'&&seat===game.declarerSeat
       &&E.colorClass(card,game)===game.calledSuit)value+=.7;
   }else if(allied){
    // Allein eindeutig bekanntes Team erhaelt die Augen.
    value=canWin?-5.7-strong*.28
     :(last?point*.72:point*.20)-(trump?2:0);
   }else if(canWin){
    // Eine Karte hat nur dann vollen Stichwert, wenn der
    // aktuelle Stich wenigstens Gewinnchancen + Augen bringt.
    const gain=style==='tempo'?1.8:1.15;
    value=(last?4.2:1.7)+onTable*.17+point*.16
     -(trump?strong*(style==='resource'?.34:.17):strong*.23)
     -(opponent?0:.85)+gain;
    if(!late&&trump&&onTable+point<7)value-=style==='resource'?3.6:1.7;
   }else{
    value=-point*(style==='resource'?.37:.24)
     -(trump?3.2+strong*.09:0);
    if(opponent&&last)value-=point*.15;
   }
   return {card,value:value+(random()-.5)*.00001};
  });
  rows.sort((a,b)=>b.value-a.value||a.card.localeCompare(b.card));
  return rows[0].card;
 }
 return Object.freeze({VERSION,STYLES,choose,publicAceOwner});
});
