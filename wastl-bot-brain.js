/* Wastl Bot Brain 8.0 – probabilistischer Live-Lookahead, komplett offline.
 * Eingabe: allein eigene Hand, abgeschlossene Stiche, aktuelle Tischkarten,
 * Spielart und Ansager. Keine Karten der anderen Spieler, keine Zukunftsdaten.
 * Die Ziehung benutzt den bereits unabhaengig getesteten Wastl-Sampler.
 * Experimentell: Gegenstaerke muss separat in fairen Testpartien geprueft werden.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const P=node?require('./wastl-policy.js'):root.WastlPolicy;
 const O=node?require('./wastl-opponents.js'):root.WastlOpponents;
 const MC=node?require('./wastl-montecarlo.js'):root.WastlMonteCarlo;
 const T=node?require('./wastl-tactics.js'):root.WastlTactics;
 const api=factory(E,P,O,MC,T);
 if(node)module.exports=api;
 if(root)root.WastlBotBrain=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P,O,MC,T){
 'use strict';
 const VERSION='8.2.0';
 const SEATS=E.SEATS;
 function seeded(seed){
  let a=seed>>>0;
  return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;
   t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
   return ((t^(t>>>14))>>>0)/4294967296;};
 }
 function publicView(game,seat){
  if(!game||!SEATS.includes(seat)||!Array.isArray(game.hands?.[seat]))return null;
  const past=(game.tricks||[]).map(t=>({leaderSeat:t.leaderSeat,cards:[...t.cards]}));
  const current=(game.current||[]).map(x=>({seat:x.seat,card:x.card}));
  // Whitelist, keine heimlichen initialHands/hands der Mitspieler uebertragen.
  return {
   seat,hand:[...game.hands[seat]],past,current,leaderSeat:game.leaderSeat,
   game:{type:game.type,trumpSuit:game.trumpSuit,calledSuit:game.calledSuit,declarerSeat:game.declarerSeat}
  };
 }
 function build(view){
  if(!view||!SEATS.includes(view.seat)||!SEATS.includes(view.leaderSeat))return {ok:false,reason:'Sitzplatz fehlt'};
  const game=view.game;
  if(!['rufspiel','wenz','solo'].includes(game?.type))return {ok:false,reason:'Noch keine Live-Simulation fuer diese Spielart'};
  if(game.type==='rufspiel'&&!['eichel','gras','schell'].includes(game.calledSuit))return {ok:false,reason:'Ruffarbe fehlt'};
  if(!Array.isArray(view.hand)||!view.hand.length||view.hand.some(c=>!E.parse(c)))return {ok:false,reason:'Eigene Hand ungueltig'};
  const past=Array.isArray(view.past)?view.past:[],current=Array.isArray(view.current)?view.current:[];
  const trickIndex=past.length;
  if(trickIndex>7||current.length>3)return {ok:false,reason:'Ungueltiger Stichindex'};
  const counts=Object.fromEntries(SEATS.map(s=>[s,0]));
  const voids=Object.fromEntries(SEATS.map(s=>[s,new Set()]));
  const seen=new Set();
  const follow=(cards,leader)=>{
   if(!SEATS.includes(leader)||!cards.length)return false;
   const lead=E.colorClass(cards[0],game);
   for(let j=0;j<cards.length;j++){
    const c=cards[j],player=E.nextSeat(leader,j);
    if(!E.parse(c)||seen.has(c))return false;
    seen.add(c);counts[player]++;
    if(j&&E.colorClass(c,game)!==lead)voids[player].add(lead);
   }
   return true;
  };
  for(const trick of past){
   if(!Array.isArray(trick.cards)||trick.cards.length!==4||!follow(trick.cards,trick.leaderSeat))
    return {ok:false,reason:'Oeffentliche Stichfolge ungueltig'};
  }
  const prefix=current.map(x=>x.card);
  for(let j=0;j<current.length;j++)if(current[j].seat!==E.nextSeat(view.leaderSeat,j))
   return {ok:false,reason:'Tischreihenfolge ungueltig'};
  if(prefix.length&&!follow(prefix,view.leaderSeat))return {ok:false,reason:'Tischkarten ungueltig'};
  if(E.nextSeat(view.leaderSeat,current.length)!==view.seat)
   return {ok:false,reason:'Bot ist nicht am Zug'};
  if(new Set(view.hand).size!==view.hand.length||view.hand.some(c=>seen.has(c)))
   return {ok:false,reason:'Eigene Hand enthaelt mehrfach bekannte Karten'};
  if(view.hand.length!==8-counts[view.seat])return {ok:false,reason:'Handgroesse passt nicht zum Spielstand'};
  const legal=E.legalMoves(view.hand,prefix[0]||null,game,{past,trickIndex});
  if(!legal.length)return {ok:false,reason:'Keine legale Karte'};
  const known=new Set([...seen,...view.hand]);
  const unknown=E.FULL.filter(c=>!known.has(c));
  const capacities=Object.fromEntries(SEATS.map(s=>[s,s===view.seat?0:8-counts[s]]));
  if(unknown.length!==SEATS.reduce((n,s)=>n+capacities[s],0))
   return {ok:false,reason:'Unbekannte Kartenanzahl ungueltig'};
  return {ok:true,seat:view.seat,hand:[...view.hand],game,leaderSeat:view.leaderSeat,
   past,prefix,trickIndex,legal,unknown,capacities,voids,
   knownCalledAce:game.type==='rufspiel'?game.calledSuit+'-A':null};
 }
 function publicPartner(game,past,partial,leader){
  if(game.type!=='rufspiel')return null;
  const ace=game.calledSuit+'-A';
  for(const t of past){
   const k=t.cards.indexOf(ace);
   if(k>=0)return E.nextSeat(t.leaderSeat,k);
  }
  if(partial.length){
   const k=partial.indexOf(ace);
   if(k>=0)return E.nextSeat(leader,k);
  }
  return null;
 }
 function actualTeam(pos,hands){
  const g=pos.game;
  if(g.type!=='rufspiel')return new Set([g.declarerSeat]);
  const ace=g.calledSuit+'-A';
  // Die eigene Ruf-Sau liegt in pos.hand, nicht im Sampler (dort hat
  // der entscheidende Spieler Kapazitaet 0).
  const owner=pos.hand.includes(ace)?pos.seat:
   SEATS.find(s=>hands[s]?.includes(ace))||
   publicPartner(g,pos.past,pos.prefix,pos.leaderSeat);
  if(!owner||owner===g.declarerSeat)return null;
  return new Set([g.declarerSeat,owner]);
 }
 function rollout(pos,world,candidate,random,styles,opponentModel='tactical'){
  const g=pos.game,team=actualTeam(pos,world);
  if(!team)return null;
  const hands=Object.fromEntries(SEATS.map(s=>[s,s===pos.seat?[...pos.hand]:[...world[s]]]));
  let leader=pos.leaderSeat;
  const past=pos.past.map(t=>({leaderSeat:t.leaderSeat,cards:[...t.cards]}));
  const score=Object.fromEntries(SEATS.map(s=>[s,0]));
  for(const t of past){
   const winner=E.nextSeat(t.leaderSeat,E.winnerIndex(t.cards,g));
   score[winner]+=E.trickEyes(t.cards);
  }
  for(let turn=pos.trickIndex;turn<8;turn++){
   const cards=turn===pos.trickIndex?[...pos.prefix]:[];
   const start=cards.length;
   for(let j=start;j<4;j++){
    const seat=E.nextSeat(leader,j),hand=hands[seat];
    const partner=opponentModel==='partnerAware'
     ?T.publicPartner(g,past,cards,leader):publicPartner(g,past,cards,leader);
    const info={past,partner};
    let card;
    if(turn===pos.trickIndex&&j===pos.prefix.length){
     if(seat!==pos.seat)return null;
     card=candidate;
    }else card=opponentModel==='classic'
      ?O.choose(hand,cards,seat,leader,g,info,styles[seat],random)
      :T.choose(hand,cards,seat,leader,g,info,styles[seat],random,
       opponentModel==='tactical'?'legacy':opponentModel);
    if(!hand.includes(card))return null;
    const legal=E.legalMoves(hand,cards[0]||null,g,{past,trickIndex:turn});
    if(!legal.includes(card))return null;
    hand.splice(hand.indexOf(card),1);
    cards.push(card);
   }
   if(cards.length!==4)return null;
   const winner=E.nextSeat(leader,E.winnerIndex(cards,g));
   score[winner]+=E.trickEyes(cards);
   past.push({leaderSeat:leader,cards});
   leader=winner;
  }
  const attackEyes=SEATS.filter(s=>team.has(s)).reduce((n,s)=>n+score[s],0);
  const botAttack=team.has(pos.seat);
  const teamEyes=botAttack?attackEyes:120-attackEyes;
  const win=botAttack?attackEyes>=61:attackEyes<=60;
  return {win:win?1:0,eyes:teamEyes,utility:(win?0.73:0)+0.27*teamEyes/120};
 }
 function analyze(view,options={}){
  const pos=build(view);
  if(!pos.ok)return {ok:false,version:VERSION,reason:pos.reason};
  if(pos.legal.length===1)return {ok:true,version:VERSION,card:pos.legal[0],forced:true,samples:0};
  const sampler=MC.prepareDealSampler(pos);
  if(!sampler.count)return {ok:false,version:VERSION,reason:'Keine regelkonforme moegliche Kartenverteilung'};
  const samples=Math.max(8,Math.min(90,Number.isFinite(options.samples)?Math.floor(options.samples):26));
  const seed=Number.isFinite(options.seed)?options.seed>>>0:0x8030126;
  // Experimental option "partnerAware" is deliberately NOT live default
  // until independent held-out comparisons demonstrate an improvement.
  const opponentModel=['classic','tactical','partnerAware','knowledgeOnly'].includes(options.opponentModel)
   ?options.opponentModel:'tactical';
  const rnd=seeded(seed),aggregate=Object.fromEntries(pos.legal.map(card=>[card,{card,count:0,wins:0,eyes:0,total:0}]));
  for(let i=0;i<samples;i++){
   const world=sampler.sample(rnd);
   if(!world)continue;
   const common=(rnd()*4294967296)>>>0;
   // Gleiche Kartenwelt und gleicher Zufallssamen fuer alle erlaubten Karten.
   for(const card of pos.legal){
    const local=seeded(common),styles=O.assignStyles(local);
    const report=rollout(pos,world,card,local,styles,opponentModel);
    if(!report)continue;
    const target=aggregate[card];
    target.count++;target.wins+=report.win;target.eyes+=report.eyes;target.total+=report.utility;
   }
  }
  const rows=Object.values(aggregate).filter(x=>x.count>=Math.max(4,Math.ceil(samples*.75)))
   .map(x=>({card:x.card,samples:x.count,winRate:x.wins/x.count,
    meanEyes:x.eyes/x.count,utility:x.total/x.count}))
   .sort((a,b)=>b.utility-a.utility||a.card.localeCompare(b.card));
  if(!rows.length)return {ok:false,version:VERSION,reason:'Nicht genug konsistente Simulationen'};
  return {ok:true,version:VERSION,card:rows[0].card,forced:false,
   samples,possibleDeals:sampler.count,rows,opponentModel,
   tacticalVersion:opponentModel==='classic'?null:T.VERSION,
   method:opponentModel==='knowledgeOnly'
    ?'Test: nur zusaetzliche Rufspiel-Teamzuordnung, ohne Taktik-Boni'
    :opponentModel==='partnerAware'
     ?'Test: Rufspiel-Teamzuordnung plus heuristische Boni'
     :opponentModel==='tactical'?'Bisherige Wenz-/Rufspiel-Taktik'
      :'Bisheriges Gegnermodell',
   calibrated:false};
 }
 return Object.freeze({VERSION,publicView,build,analyze});
});
