/* Wastl 5.1: unterschiedliche rein lokale Gegenspieler und unabhaengiger Pruefgegner.
 * Keine gegnerischen Haende, wahren Rufspielpartner oder zukuenftigen Stiche
 * als Eingaben einer einzelnen Spielentscheidung. Keine Fremdbibliotheken.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const P=node?require('./wastl-policy.js'):root.WastlPolicy;
 const api=factory(E,P);
 if(node)module.exports=api;
 if(root)root.WastlOpponents=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P){
 'use strict';
 const VERSION='5.1.0';
 const STYLES=Object.freeze(['balanced','cautious','assertive']);
 function assignStyles(random){
  return Object.fromEntries(E.SEATS.map(seat=>{
   const x=random();
   return [seat,x<.45?'balanced':x<.75?'cautious':'assertive'];
  }));
 }
 function winner(played,leader,game){
  if(!played.length)return null;
  let best=0;
  for(let i=1;i<played.length;i++){
   if(E.compare(played[i],played[best],played[0],game)<0)best=i;
  }
  return {seat:E.nextSeat(leader,best),card:played[best]};
 }
 function publicPartner(game,leader,played,history){
  if(game.type!=='rufspiel')return null;
  const ace=game.calledSuit+'-A';
  for(const t of history||[]){
   const index=(t.cards||[]).indexOf(ace);
   if(index>=0)return E.nextSeat(t.leaderSeat,index);
  }
  const index=played.indexOf(ace);
  return index>=0?E.nextSeat(leader,index):null;
 }
 function choose(hand,played,seat,leader,game,publicState,style='balanced',random=()=>.5){
  if(!hand.length)throw Error('Simulierter Spieler ohne Handkarten.');
  if(style==='balanced'||!STYLES.includes(style)){
   return P.choose(hand,played,seat,leader,game,publicState,random);
  }
  const base=P.evaluate(hand,played,seat,leader,game,publicState,()=>.5);
  const last=winner(played,leader,game);
  const partner=publicState?.partner??publicPartner(game,leader,played,publicState?.past);
  const team=P.teamOf(seat,hand,game,partner);
  const other=last?P.teamOf(last.seat,null,game,partner):null;
  const ally=!!last&&team!=='unknown'&&other===team&&game.type!=='ramsch';
  const runningEyes=played.reduce((sum,card)=>sum+E.parse(card).eyes,0);
  const late=(publicState?.past?.length||0)>=6;
  const scores=base.map(row=>{
   const card=row.card,eyes=E.parse(card).eyes;
   const trump=E.isTrump(card,game),power=P.rankStrength(card,game);
   const wins=!!last&&E.compare(card,last.card,played[0],game)<0;
   let adjustment=0;
   if(game.type==='ramsch'){
    if(style==='cautious')adjustment=-(trump?1.5+power:0)-eyes*.13-(wins?1.2+runningEyes*.05:0);
    else adjustment=(wins?-.45:0)+(played.length&&!wins?eyes*.20:0);
   }else if(style==='cautious'){
    // Starke Truempe lieber fuer spaetere wichtige Stiche behalten.
    adjustment=trump&& !late?-(1.2+2.1*power):0;
    if(wins&&!ally)adjustment+=Math.min(1.5,runningEyes*.08);
    if(ally&&!wins)adjustment+=eyes*.10;
    if(last&&!wins&&!ally)adjustment-=eyes*.08;
   }else if(style==='assertive'){
    // Hoherer Stichkontroll-Wille, aber keinen Partnerstich zerstoeren.
    if(wins&&!ally)adjustment+=1.4+Math.min(2.5,runningEyes*.09);
    if(!played.length&&trump)adjustment+=1.1+(power*.8);
    if(ally&&wins)adjustment-=2.4;
    if(ally&&!wins)adjustment+=eyes*.11;
   }
   return {card,score:row.score+adjustment+(random()-.5)*.15};
  });
  scores.sort((a,b)=>b.score-a.score||a.card.localeCompare(b.card));
  return scores[0].card;
 }
 // Explizit anderer, einfacherer Regel-Entscheider fuer zurueckgehaltene
 // Testfortsetzungen. Wird NICHT zur Analyseempfehlung verwendet.
 function chooseIndependent(hand,played,seat,leader,game,publicState,random=()=>.5){
  const legal=E.legalMoves(hand,played[0]||null,game,
   {past:publicState?.past||[],trickIndex:publicState?.past?.length||0});
  if(legal.length===1)return legal[0];
  const last=winner(played,leader,game);
  const partner=publicState?.partner??publicPartner(game,leader,played,publicState?.past);
  const side=P.teamOf(seat,hand,game,partner);
  const lastSide=last?P.teamOf(last.seat,null,game,partner):null;
  const ally=!!last&&side!=='unknown'&&side===lastSide&&game.type!=='ramsch';
  const eyesOnTable=played.reduce((sum,card)=>sum+E.parse(card).eyes,0);
  const sorted=legal.map(card=>{
   const eyes=E.parse(card).eyes;
   const trump=E.isTrump(card,game);
   const high=trump?E.FULL.filter(c=>E.isTrump(c,game)&&E.compare(c,card,c,game)<0).length:0;
   const strength=trump?20-high:eyes/2;
   const wins=!!last&&E.compare(card,last.card,played[0],game)<0;
   let score=0;
   if(game.type==='ramsch'){
    score=played.length?(wins?-8-eyes-eyesOnTable*.4:eyes*.75-strength*.04):-eyes*.5-strength*.08;
   }else if(!played.length){
    score=trump?-1.2-strength*.05:(eyes===11?5:2-eyes*.14);
   }else if(ally){
    score=wins?-3-eyes*.1:eyes*.45-(trump?1.4:0);
   }else if(wins){
    score=3+eyesOnTable*.14-strength*.06;
   }else{
    score=-eyes*.32-(trump?2:0);
   }
   return {card,score:score+(random()-.5)*.08};
  }).sort((a,b)=>b.score-a.score||a.card.localeCompare(b.card));
  return sorted[0].card;
 }
 return Object.freeze({VERSION,STYLES,assignStyles,choose,chooseIndependent,publicPartner});
});
