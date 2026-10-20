/* Wastl Engine 4.2 – selbstentwickeltes, offlinefähiges Mitspieler-Modell.
 * Bewusst keine fremden Trainingsdaten, Quellbibliotheken oder Netzwerkzugriffe.
 * Entscheidungen berücksichtigen AUSSCHLIESSLICH eigene Hand und öffentlich
 * sichtbare Stiche, nie die Hände anderer Spieler im simulierten Kartengeben.
 * Heuristik, kein optimal spielender Schafkopf-Solver.
 */
(function(root,factory){
 const E=(typeof module==='object'&&module.exports)?require('./wastl-engine.js'):root.WastlEngine;
 const api=factory(E);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WastlPolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
 'use strict';
 const VERSION='4.2.0';
 const TRUMP_CACHE=new Map();
 function trumpsOrdered(game){
  const key=game.type+':'+(game.trumpSuit||'');
  if(!TRUMP_CACHE.has(key)){
   const trumps=E.FULL.filter(x=>E.isTrump(x,game)).sort((a,b)=>E.compare(a,b,a,game));
   TRUMP_CACHE.set(key,trumps);
  }
  return TRUMP_CACHE.get(key);
 }
 function rankStrength(card,g){
  if(E.isTrump(card,g)){
   const trumps=trumpsOrdered(g);
   return 1-trumps.indexOf(card)/Math.max(1,trumps.length-1);
  }
  const r=E.parse(card).rank;
  return ({A:1,'10':.83,K:.57,O:.7,U:.62,'9':.3,'8':.16,'7':0})[r]??0;
 }
 function teamOf(seat,hand,game,publicPartner){
  if(game.type!=='rufspiel')return seat===game.declarerSeat?'attack':'defense';
  if(seat===game.declarerSeat||seat===publicPartner)return 'attack';
  if(publicPartner)return 'defense';
  if(Array.isArray(hand)&&hand.includes(game.calledSuit+'-A'))return 'attack';
  // Unbekannter Rufspielpartner: Nicht behaupten, dass der andere ein Gegner ist.
  return 'unknown';
 }
 function currentWinner(played,leader,game){
  if(!played.length)return null;
  let best=0;
  for(let i=1;i<played.length;i++)if(E.compare(played[i],played[best],played[0],game)<0)best=i;
  return E.nextSeat(leader,best);
 }
 function publicKnowledge(game,past,visibleCards){
  const partnerCard=game.type==='rufspiel'?game.calledSuit+'-A':null;
  let partner=null;
  const seen=new Set();
  for(const trick of past||[]){
   (trick.cards||[]).forEach((c,i)=>{
    seen.add(c);
    if(c===partnerCard)partner=E.nextSeat(trick.leaderSeat,i);
   });
  }
  if(visibleCards?.length){visibleCards.forEach((c,i)=>{
   seen.add(c);if(c===partnerCard)partner=E.nextSeat(game.__simLeader,i);
  });}
  return {seen,partner};
 }
 function evaluate(hand,played,seat,leader,game,publicState,random=()=>.5){
  const options=E.legalMoves(hand,played[0]||null,game);
  const past=publicState?.past||[];
  const knowledge=publicKnowledge({...game,__simLeader:leader},past,played);
  const publiclyRevealed=publicState?.partner??knowledge.partner;
  const ownSide=teamOf(seat,hand,game,publiclyRevealed);
  const winningSeat=currentWinner(played,leader,game);
  const otherSide=winningSeat?teamOf(winningSeat,null,game,publiclyRevealed):null;
  const surelyAlly=ownSide!=='unknown'&&otherSide===ownSide;
  const surelyEnemy=ownSide!=='unknown'&&otherSide!=='unknown'&&otherSide!==ownSide;
  const pending=played.length;
  const remain=3-pending;
  const prefixEyes=played.reduce((sum,c)=>sum+E.parse(c).eyes,0);
  const myTrumps=hand.filter(c=>E.isTrump(c,game));
  const trumpPublic=trumpsOrdered(game).filter(c=>knowledge.seen.has(c)).length;
  const aceStillUnknown=game.type==='rufspiel'&&!publiclyRevealed;
  const scored=options.map(card=>{
   const pc=E.parse(card),trump=E.isTrump(card,game),strength=rankStrength(card,game);
   const leads=played.length===0;
   const outranks=!leads&&E.compare(card,played.reduce((best,c)=>E.compare(c,best,played[0],game)<0?c:best,played[0]),played[0],game)<0;
   // Trumpf-Reserve und Stellung: hohen Trumpf nicht gedankenlos verschwenden.
   const keepStrength=trump?(1.4+3.8*strength):(.3+1.8*strength);
   const scarcity=trump&&myTrumps.length<=2?1.4:0;
   let score=0,reason='';
   if(leads){
    const nontrump=hand.filter(c=>!E.isTrump(c,game)&&E.colorClass(c,game)===E.colorClass(card,game));
    const topUnseen=!knowledge.seen.has(card)&&strength>.85;
    if(trump){
     const holdingTrumpControl=myTrumps.some(c=>rankStrength(c,game)>.82);
     score=(ownSide==='attack'?4.5:1)+(myTrumps.length>=4?4:0)+(holdingTrumpControl?2:0)
       +strength*1.8-(pc.eyes*.17)-(myTrumps.length===1?5:0);
     if(trumpPublic>7)score-=3;
     reason='Trumpf anspielen und mögliche Trumpfkontrolle behalten';
    }else{
     score=4.8+(topUnseen?4:0)+(nontrump.length===1?1.4:0)-pc.eyes*.16;
     if(pc.rank==='10')score-=2.5;
     if(ownSide==='defense'&&game.type==='rufspiel'&&card===game.calledSuit+'-A')score-=6;
     if(aceStillUnknown&&E.colorClass(card,game)===game.calledSuit&&pc.rank!=='A')score+=1;
     reason='Eine Fehlfarbe entwickeln, statt starke Trümpfe zu verbrauchen';
    }
   }else if(surelyAlly&&!outranks){
    score=7.5+pc.eyes*.68-keepStrength*.28-scarcity;
    if(remain>0)score-=pc.eyes*.21;
    reason='Beim Partner Augen schmieren, ohne dessen Stich unnötig zu übernehmen';
   }else if(surelyAlly&&outranks){
    score=3.5+pc.eyes*.30-keepStrength*1.4-scarcity;
    if(remain===0)score-=3;
    reason='Partnerstich nach Möglichkeit nicht unnötig überstechen';
   }else if(outranks){
    score=9+prefixEyes*.42+pc.eyes*.58-keepStrength*.8-scarcity;
    // Vierter Spieler weiß: Ist die Karte jetzt vorn, gewinnt sie den Stich sicher.
    if(remain===0)score+=5;
    // frühe hohe Trümpfe sind wertvoll; nicht aus jedem Preis übernehmen.
    if(remain>0&&trump&&strength>.80)score-=1.5;
    reason='Stich übernehmen, dabei Augen und spätere Trumpfreserve abwägen';
   }else{
    score=4.2-pc.eyes*.92-keepStrength*.43-scarcity;
    if(remain>0)score+=pc.eyes*.09;
    if(surelyEnemy)score-=pc.eyes*.12;
    reason='Stich nicht zu gewinnen: möglichst wenige Augen preisgeben';
   }
   // Bei unbekanntem Partner vorsichtiger als bei einem eindeutig bekannten Gegner.
   if(aceStillUnknown&&ownSide==='unknown'&&!leads&&outranks)score-=2;
   // Nicht jeden Zug deterministisch als Profi spielen; Modell bleibt fehlbar.
   const noise=(random()-.5)*2.2;
   return {card,score:score+noise,reason,eyes:pc.eyes,trump};
  });
  scored.sort((a,b)=>b.score-a.score || a.card.localeCompare(b.card));
  return scored;
 }
 function choose(hand,played,seat,leader,game,publicState,random){
  if(!hand.length)throw new Error('Simulierte Hand ist leer.');
  return evaluate(hand,played,seat,leader,game,publicState,random)[0].card;
 }
 return Object.freeze({VERSION,choose,evaluate,teamOf,publicKnowledge,rankStrength});
});
