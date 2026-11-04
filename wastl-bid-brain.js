/* Wastl 8.1: simulationsbasierte Spielansagen mit unbekannten Gegenhaenden.
 * Eingang: ausschliesslich eigene acht Karten, Sitzplatz und die hoechste Ansage.
 * Durchgehend offline. Gewinnwahrscheinlichkeiten sind Modellwerte, unkalibriert.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const B=node?require('./wastl-bots.js'):root.WastlBots;
 const O=node?require('./wastl-opponents.js'):root.WastlOpponents;
 const MC=node?require('./wastl-montecarlo.js'):root.WastlMonteCarlo;
 const api=factory(E,B,O,MC);
 if(node)module.exports=api;
 if(root)root.WastlBidBrain=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,B,O,MC){
 'use strict';
 const VERSION='8.1.0',SEATS=E.SEATS;
 function seeded(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function randomDeals(hand,seat){
  const known=new Set(hand),unknown=E.FULL.filter(c=>!known.has(c));
  const capacities=Object.fromEntries(SEATS.map(s=>[s,s===seat?0:8]));
  const pos={seat,unknown,capacities,voids:Object.fromEntries(SEATS.map(s=>[s,new Set()])),
   game:{type:'solo',trumpSuit:'herz',declarerSeat:seat},knownCalledAce:null};
  return MC.prepareDealSampler(pos);
 }
 function publicPartner(game,past,cards,leader){
  if(game.type!=='rufspiel')return null;
  const ace=game.calledSuit+'-A';
  for(const trick of past){const index=trick.cards.indexOf(ace);if(index>=0)return E.nextSeat(trick.leaderSeat,index);}
  const index=cards.indexOf(ace);
  return index>=0?E.nextSeat(leader,index):null;
 }
 function simulate(hand,seat,world,offer,seed,mode='mixed'){
  const game={type:offer.type,trumpSuit:offer.trumpSuit||'herz',
   calledSuit:offer.calledSuit||'eichel',declarerSeat:seat};
  const hands=Object.fromEntries(SEATS.map(s=>[s,s===seat?[...hand]:[...world[s]]]));
  const partner=game.type==='rufspiel'?SEATS.find(s=>hands[s].includes(game.calledSuit+'-A')):null;
  if(game.type==='rufspiel'&&(!partner||partner===seat))return null;
  const team=new Set(game.type==='rufspiel'?[seat,partner]:[seat]);
  const random=seeded(seed),styles=O.assignStyles(random);
  const past=[];let leader='vh',attackEyes=0;
  for(let round=0;round<8;round++){
   const cards=[];
   for(let i=0;i<4;i++){
    const player=E.nextSeat(leader,i);
    const info={past,partner:publicPartner(game,past,cards,leader)};
    const card=mode==='independent'?O.chooseIndependent(hands[player],cards,player,leader,game,info,random)
      :O.choose(hands[player],cards,player,leader,game,info,styles[player],random);
    if(!card||!hands[player].includes(card))return null;
    const legal=E.legalMoves(hands[player],cards[0]||null,game,{past,trickIndex:round});
    if(!legal.includes(card))return null;
    hands[player].splice(hands[player].indexOf(card),1);
    cards.push(card);
   }
   const winner=E.nextSeat(leader,E.winnerIndex(cards,game));
   if(team.has(winner))attackEyes+=E.trickEyes(cards);
   past.push({leaderSeat:leader,cards});
   leader=winner;
  }
  return {win:attackEyes>=61?1:0,eyes:attackEyes};
 }
 function analyze({seat,hand,top=null},options={}){
  if(!SEATS.includes(seat)||!Array.isArray(hand)||hand.length!==8||
    new Set(hand).size!==8||hand.some(c=>!E.parse(c)))
   return {ok:false,version:VERSION,reason:'Keine gueltige eigene Achtkartenhand.'};
  const offers=B.bidOptions(hand,top,seat);
  if(!offers.length)return {ok:true,version:VERSION,offer:null,estimates:[],samples:0,calibrated:false};
  const sampler=randomDeals(hand,seat);
  if(!sampler.count)return {ok:false,version:VERSION,reason:'Keine moeglichen Kartenverteilungen.'};
  const samples=Math.max(10,Math.min(80,Number.isFinite(options.samples)?Math.trunc(options.samples):20));
  const seed=Number.isFinite(options.seed)?options.seed>>>0:0x8150126;
  const rng=seeded(seed),counter=offers.map(o=>({...o,wins:0,eyes:0,n:0}));
  const worlds=Array.from({length:samples},()=>({hands:sampler.sample(rng),seed:(rng()*4294967296)>>>0}));
  for(const {hands,seed:worldSeed} of worlds){
   for(const row of counter){
    const outcome=simulate(hand,seat,hands,row,worldSeed);
    if(!outcome)continue;
    row.n++;row.wins+=outcome.win;row.eyes+=outcome.eyes;
   }
  }
  const thresholds={rufspiel:.52,wenz:.58,solo:.62};
  const stakes={rufspiel:1,wenz:2,solo:3};
  const estimates=counter.map(row=>{
   const p=(row.wins+2)/(row.n+4); // vier neutrale Pseudo-Partien stabilisieren kleine Stichproben
   const error=Math.sqrt(p*(1-p)/Math.max(1,row.n));
   const conservative=p-0.45*error;
   const stake=stakes[row.type];
   const expected=(2*conservative-1)*stake;
   return {type:row.type,calledSuit:row.calledSuit||null,trumpSuit:row.trumpSuit||null,
    priority:row.priority,label:row.label,winRate:row.n?row.wins/row.n:null,
    meanEyes:row.n?row.eyes/row.n:null,samples:row.n,
    conservative,expected,
    eligible:row.n>=Math.ceil(samples*.8)&&conservative>=thresholds[row.type]&&expected>0};
  }).sort((a,b)=>b.expected-a.expected||b.conservative-a.conservative||a.label.localeCompare(b.label));
  const best=estimates.find(x=>x.eligible)||null;
  return {ok:true,version:VERSION,samples,possibleDeals:sampler.count,
   offer:best?offers.find(x=>x.type===best.type&&x.calledSuit===(best.calledSuit||undefined)
    &&x.trumpSuit===(best.trumpSuit||undefined)):null,
   estimates,calibrated:false,
   method:'Simulierte Achtstichpartien mit unbekannten Haenden und konservativem Wahrscheinlichkeitsabschlag.'};
 }
 return Object.freeze({VERSION,analyze,simulate,randomDeals});
});
