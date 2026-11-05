/* Wastl 8.2: bewusst eigenstaendige Wenz-/Rufspiel-Taktik.
 * Nutzt NUR eigene Karten, oeffentliche Stiche, gesetzliche Spielregeln
 * und die vom Spieler selbst bekannte gerufene Sau. Keine versteckten Haende.
 * Die bisherige WastlPolicy bleibt unveraendert zum Rueckvergleich.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const P=node?require('./wastl-policy.js'):root.WastlPolicy;
 const O=node?require('./wastl-opponents.js'):root.WastlOpponents;
 const api=factory(E,P,O);
 if(node)module.exports=api;
 if(root)root.WastlTactics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P,O){
 'use strict';
 const VERSION='8.2.0',TYPES=new Set(['wenz','rufspiel']);
 function winner(cards,leader,game){
  if(!cards.length)return null;
  let index=0;
  for(let i=1;i<cards.length;i++)
   if(E.compare(cards[i],cards[index],cards[0],game)<0)index=i;
  return {seat:E.nextSeat(leader,index),card:cards[index]};
 }
 function publicPartner(game,past,played,leader,mode='legacy'){
  if(game.type!=='rufspiel')return null;
  const ace=game.calledSuit+'-A';
  for(const trick of past){
   const index=(trick.cards||[]).indexOf(ace);
   if(index>=0)return E.nextSeat(trick.leaderSeat,index);
  }
  const index=played.indexOf(ace);
  if(index>=0)return E.nextSeat(leader,index);
  if(mode==='legacy')return null;
  // Davonlaufen: nur ein vollstaendiger Stich in Ruffarbe ohne Ruf-Sau
  // beweist, dass der Anspieler die Sau selbst noch in der Hand hat.
  for(const trick of past){
   if(trick.cards?.length!==4)continue;
   if(E.colorClass(trick.cards[0],game)===game.calledSuit &&
      !trick.cards.includes(ace) && trick.leaderSeat!==game.declarerSeat)
    return trick.leaderSeat;
  }
  return null;
 }
 function situational(hand,played,seat,leader,game,publicState={},mode='legacy'){
  const past=publicState.past||[],partner=publicPartner(game,past,played,leader,mode);
  const ace=game.type==='rufspiel'?game.calledSuit+'-A':null;
  const hasAce=!!ace&&hand.includes(ace);
  const ownSide=game.type==='rufspiel'&&mode!=='legacy'
   ?(seat===game.declarerSeat||seat===partner||hasAce?'attack':'defense')
   :P.teamOf(seat,hand,game,partner);
  const leading=played.length===0,top=winner(played,leader,game);
  let ahead=top?P.teamOf(top.seat,null,game,partner):null;
  if(game.type==='rufspiel'&&mode!=='legacy'&&top){
   if(top.seat===game.declarerSeat||top.seat===partner||hasAce&&top.seat===seat)
    ahead='attack';
   else if(partner||hasAce||top.seat===seat)ahead='defense';
  }
  const teammateAhead=!!top&&ownSide!=='unknown'&&ownSide===ahead;
  const opponentAhead=!!top&&ownSide!=='unknown'&&ahead!=='unknown'&&ownSide!==ahead;
  const last=played.length===3,eyes=played.reduce((n,c)=>n+E.parse(c).eyes,0);
  return {ownSide,ahead,top,teammateAhead,opponentAhead,last,leading,eyes,
   revealedPartner:partner!==null,partner,hasAce,calledAce:ace};
 }
 function score(hand,played,seat,leader,game,publicState={},style='balanced',mode='legacy'){
  if(!TYPES.has(game?.type))return P.evaluate(hand,played,seat,leader,game,publicState,()=>.5);
  const inferred=game.type==='rufspiel'&&mode!=='legacy'
   ?publicPartner(game,publicState.past||[],played,leader,mode):null;
  const safeState=game.type==='rufspiel'&&mode!=='legacy'
   ?{...publicState,partner:inferred}:publicState;
  const options=P.evaluate(hand,played,seat,leader,game,safeState,()=>.5);
  const context=situational(hand,played,seat,leader,game,safeState,mode);
  const {top,teammateAhead,opponentAhead,last,leading,eyes,ownSide,calledAce}=context;
  const late=(publicState.past||[]).length>=5;
  const trumps=hand.filter(c=>E.isTrump(c,game));
  const highestTrump=c=>E.isTrump(c,game)&&E.FULL
   .filter(x=>E.isTrump(x,game)&&E.compare(x,c,c,game)<0).length<=1;
  return options.map(item=>{
   const card=item.card,p=E.parse(card),trump=E.isTrump(card,game);
   const beats=top&&E.compare(card,top.card,played[0],game)<0;
   let extra=0,why='';
   if(game.type==='wenz'){
    // Beim Wenz sind ALLEIN die vier Unter Trumpf. Eichel-/Gras-Unter
    // nicht fuer wenige Augen ausgeben, wenn andere Karten ausreichen.
    if(trump){
     const strong=highestTrump(card);
     if(!leading&&teammateAhead&&beats){
      extra-=strong?8:5;
      why='Wenz: starken Unter nicht auf den sicheren Partnerstich setzen';
     }else if(!leading&&opponentAhead&&beats){
      extra+=1.3+Math.min(2.2,eyes*.095);
      if(strong&&!last&&eyes<=6&&!late)extra-=2.9;
      why='Wenz: nur mit angemessenem Gegenwert stechen';
     }else if(leading){
      if(ownSide==='attack'&&trumps.length>=2)extra+=1.3;
      if(ownSide==='defense'&&trumps.length===1&&strong&&!late)extra-=1.8;
      why='Wenz: Unterreserve gegen die Anzahl verbliebener Trumpf abwaegen';
     }
    }else if(leading&&p.rank==='A'){
     extra+=1.4;
     why='Wenz: hohe Farbkarte ausspielen und Unter fuer spaeter aufheben';
    }else if(!leading&&teammateAhead&&!beats&&p.eyes>=10&&last){
     extra+=1.7;
     why='Wenz: dem sicher gewinnenden Mitspieler Augen geben';
    }
   }
   if(game.type==='rufspiel'){
    const hasAce=hand.includes(calledAce);
    const calledColor=E.colorClass(card,game)===game.calledSuit;
    if(leading&&seat===game.declarerSeat&&calledColor){
     // Eine Ruffarbe kann den Partner aufdecken, NICHT aber seine Position
     // verraten. Die Bewertung nutzt allein oeffentlich sichtbare Farben.
     extra+=1.25;
     why='Rufspiel: den Partner mit der Ruffarbe aufdecken';
    }
    if(leading&&ownSide==='defense'&&calledColor&&!context.revealedPartner){
     extra-=1.2;
     why='Rufspiel: vor Aufdeckung die gerufene Farbe nicht leichtfertig anspielen';
    }
    if(leading&&hasAce&&card===calledAce)extra+=1.0;
    if(!leading&&teammateAhead&&!beats&&last){
     extra+=p.eyes*.16;
     if(trump&&p.eyes<9)extra-=1.1;
     why='Rufspiel: erst bei gesichertem Partnerstich Augen schmieren';
    }
    if(!leading&&teammateAhead&&beats){
     extra-=trump?3.3:2;
     why='Rufspiel: den bekannten Partner nicht unnoetig ueberstechen';
    }
    if(!leading&&opponentAhead&&beats&&last&&eyes>=10)extra+=1.2;
    if(mode==='partnerAware'){
     if(!leading&&teammateAhead&&beats&&trump)extra-=2.4;
     if(!leading&&teammateAhead&&!beats&&last&&p.eyes>=10)extra+=1.5;
     if(!leading&&opponentAhead&&beats&&last&&eyes>=9)extra+=2.0;
     if(!leading&&!teammateAhead&&!opponentAhead&&ownSide==='attack'
      &&trump&&beats&&eyes<=5&&!late)extra-=1.2;
    }
   }
   if(style==='cautious'&&trump&&!late)extra-=0.6;
   if(style==='assertive'&&!leading&&beats&&!teammateAhead)extra+=0.7;
   return {...item,score:item.score+extra,reason:why||item.reason,adjustment:extra};
  }).sort((a,b)=>b.score-a.score||a.card.localeCompare(b.card));
 }
 function choose(hand,played,seat,leader,game,publicState={},style='balanced',random=()=>.5,mode='legacy'){
  if(!TYPES.has(game?.type))return O.choose(hand,played,seat,leader,game,publicState,style,random);
  const rows=score(hand,played,seat,leader,game,publicState,style,mode);
  // Winzige Zufallsvariation, gegenueber den taktischen Regeln gering.
  return rows.map(row=>({...row,tie:row.score+(random()-.5)*.12}))
   .sort((a,b)=>b.tie-a.tie||a.card.localeCompare(b.card))[0]?.card||null;
 }
 return Object.freeze({VERSION,publicPartner,situational,score,choose});
});
