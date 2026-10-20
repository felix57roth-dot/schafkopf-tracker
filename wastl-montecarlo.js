/* Wastl 4.1: unabhängiger lokaler Monte-Carlo-Prototyp für Schafkopf.
 * Bewertet nur die zum Entscheidungszeitpunkt sichtbaren Informationen.
 * Keine Spielstärke-Garantie; die modellierten Gegenspieler sind heuristisch.
 * Eigenständige Implementierung ohne Fremdbibliotheken.
 */
(function(root, factory){
 const E = (typeof module==='object' && module.exports) ? require('./wastl-engine.js') : root.WastlEngine;
 const api=factory(E);
 if(typeof module==='object' && module.exports)module.exports=api;
 if(root)root.WastlMonteCarlo=api;
})(typeof globalThis!=='undefined'?globalThis:this, function(E){
 'use strict';
 const VERSION='4.1.0';
 const SUPPORTED=new Set(['rufspiel','solo','wenz','farbwenz','geier','farbgeier']);
 function seeded(seed){let a=seed>>>0;return function(){a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function shuffle(arr,random){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
 function seatIndex(leader,seat){return (E.SEATS.indexOf(seat)-E.SEATS.indexOf(leader)+4)%4;}
 function cloneHands(h){return Object.fromEntries(E.SEATS.map(s=>[s,[...h[s]]]));}
 function addVoids(voids,lead,cards,leader){
  const clazz=E.colorClass(lead.gameCard,lead.game);
  cards.forEach((card,i)=>{if(E.colorClass(card,lead.game)!==clazz){const seat=E.nextSeat(leader,i);voids[seat].add(clazz);}});
 }
 function buildPosition(game,turn){
  if(!E||!SUPPORTED.has(game?.type))return {ok:false,reason:'Monte-Carlo-Version 4.1 unterstützt zunächst Rufspiel, Solo, Wenz und Geier mit Farbvarianten.'};
  const r=E.review(game);
  if(!r.ok||r.result.status!=='known')return {ok:false,reason:'Die Partie ist nicht vollständig und regelkonform dokumentiert. Bitte zuerst „Regeln prüfen“ verwenden.'};
  if(!E.SEATS.includes(game.mySeat))return {ok:false,reason:'Dein Platz konnte nicht bestimmt werden.'};
  if(!Number.isInteger(turn)||turn<0||turn>=8)return {ok:false,reason:'Bitte einen Stich von 1 bis 8 auswählen.'};
  const t=game.tricks[turn],seat=game.mySeat,idx=seatIndex(t.leaderSeat,seat);
  const myFull=E.reconstructHands(game)?.[seat];
  if(!myFull||myFull.length!==8)return {ok:false,reason:'Deine Anfangshand lässt sich nicht rekonstruieren.'};
  const used=new Set();const playedCount=Object.fromEntries(E.SEATS.map(s=>[s,0]));
  const voids=Object.fromEntries(E.SEATS.map(s=>[s,new Set()]));
  const past=[];
  for(let k=0;k<turn;k++){
   const tk=game.tricks[k], cards=tk.cards;
   for(let j=0;j<4;j++){const s=E.nextSeat(tk.leaderSeat,j);used.add(cards[j]);playedCount[s]++;}
   const lead={gameCard:cards[0],game};addVoids(voids,lead,cards,tk.leaderSeat);
   past.push({leaderSeat:tk.leaderSeat,cards:[...cards],winnerSeat:E.nextSeat(tk.leaderSeat,E.winnerIndex(cards,game)),eyes:E.trickEyes(cards)});
  }
  const prefix=t.cards.slice(0,idx);
  for(let j=0;j<prefix.length;j++){
   const s=E.nextSeat(t.leaderSeat,j);used.add(prefix[j]);playedCount[s]++;
  }
  // Stiche in progress can reveal that an opponent was already void (even before own turn).
  if(prefix.length>1)addVoids(voids,{gameCard:prefix[0],game},prefix,t.leaderSeat);
  const myHand=myFull.filter(c=>!used.has(c));
  const legal=E.legalMoves(myHand,prefix[0]||null,game);
  if(!legal.includes(t.cards[idx]))return {ok:false,reason:'Deine tatsächlich gespielte Karte ist nach der Rekonstruktion nicht legal.'};
  if(legal.length<=1)return {ok:false,reason:'In diesem Stich hattest du keine Kartenauswahl (Bedienpflicht). Ein Vergleich ist nicht sinnvoll.',onlyLegal:true};
  const reserved=new Set([...used,...myHand]);
  const unknown=E.FULL.filter(c=>!reserved.has(c));
  const capacities=Object.fromEntries(E.SEATS.map(s=>[s,s===seat?0:8-playedCount[s]]));
  if(unknown.length!==Object.values(capacities).reduce((a,b)=>a+b,0))return {ok:false,reason:'Die verbleibenden Kartenanzahlen passen nicht zusammen.'};
  const knownCalledAce=game.type==='rufspiel'?`${game.calledSuit}-A`:null;
  return {ok:true,game,turn,t,seat,idx,past,prefix,myHand,legal,actual:t.cards[idx],unknown,capacities,voids,used,knownCalledAce};
 }
 // Randomized randomized DFS with void constraints, valid ownership count and
 // called ace excluded from caller. This is a feasibility sampler, not uniform.
 function assignUnknown(pos,random){
  const hands=Object.fromEntries(E.SEATS.map(s=>[s,[]]));
  const caps={...pos.capacities};
  const cards=shuffle([...pos.unknown],random);
  const possible=c=>E.SEATS.filter(s=>s!==pos.seat&&!pos.voids[s].has(E.colorClass(c,pos.game))&&!(c===pos.knownCalledAce&&s===pos.game.declarerSeat));
  const choices=cards.map(c=>({c,seats:possible(c)})).sort((a,b)=>a.seats.length-b.seats.length||(random()-.5));
  if(choices.some(x=>!x.seats.length))return null;
  const visit=(n)=>{
    if(n===choices.length)return E.SEATS.every(s=>caps[s]===0);
    const {c,seats}=choices[n];const opts=shuffle([...seats].filter(s=>caps[s]>0),random);
    for(const s of opts){caps[s]--;hands[s].push(c);if(visit(n+1))return true;hands[s].pop();caps[s]++;}
    return false;
  };
  return visit(0)?hands:null;
 }
 function worldTeams(pos,hands){
  const g=pos.game;
  if(g.type!=='rufspiel')return new Set([g.declarerSeat]);
  const ace=pos.knownCalledAce;
  let teammate=null;
  for(const s of E.SEATS){
   if(hands[s]?.includes(ace)||pos.myHand.includes(ace)){
    if(hands[s]?.includes(ace))teammate=s;
    else teammate=pos.seat;
   }
  }
  if(!teammate){ // Ace has been played in publicly observed prefix or past.
   for(const k of pos.past){const i=k.cards.indexOf(ace);if(i>=0)teammate=E.nextSeat(k.leaderSeat,i);}
   const i=pos.prefix.indexOf(ace);if(i>=0)teammate=E.nextSeat(pos.t.leaderSeat,i);
  }
  if(!teammate||teammate===g.declarerSeat)return null;
  return new Set([g.declarerSeat,teammate]);
 }
 function weight(card,game){
  const c=E.parse(card);const rank=c.rank;
  const order= ['O','U','A','10','K','9','8','7'];
  return (E.isTrump(card,game)?12:0)+(8-order.indexOf(rank))+(c.eyes*.4);
 }
 // Imperfect-information *policy*: does not inspect other private hands. It uses
 // only observed cards and whether declarer/partner are publicly identifiable.
 function policyPick(hand,played,seat,game,publicPartner,random){
  const opts=E.legalMoves(hand,played[0]||null,game);if(opts.length===1)return opts[0];
  if(!played.length){
   const scored=opts.map(c=>({c,s:1.1*weight(c,game)+(E.isTrump(c,game)?2:0)+random()*13}));
   scored.sort((a,b)=>b.s-a.s);return scored[0].c;
  }
  const leader=game.__simLeader;
  // Prefix-winner, taking only the partial trick into account.
  const prefixWin=(()=>{let best=0;for(let i=1;i<played.length;i++)if(E.compare(played[i],played[best],played[0],game)<0)best=i;return E.nextSeat(leader,best);})();
  const alliesKnown=publicPartner!==null;
  const ownTeam=s=>game.type==='rufspiel'?(alliesKnown&&(s===game.declarerSeat||s===publicPartner)):(s===game.declarerSeat);
  const likelyFriendly=alliesKnown&&ownTeam(seat)===ownTeam(prefixWin) || game.type!=='rufspiel'&&ownTeam(seat)===ownTeam(prefixWin);
  const scored=opts.map(c=>{
    const beats=E.compare(c,played[prefixCardWinnerIndex(played,game)],played[0],game)<0;
    const eyes=played.reduce((n,x)=>n+E.parse(x).eyes,0)+E.parse(c).eyes;
    let score;
    if(likelyFriendly)score=E.parse(c).eyes*2.1-(beats?10:0)-(E.isTrump(c,game)?weight(c,game)*.45:0);
    else if(beats)score=11+eyes*.7-weight(c,game)*.68;
    else score=-E.parse(c).eyes*1.8-weight(c,game)*.05;
    return {c,score:score+random()*9};
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].c;
 }
 function prefixCardWinnerIndex(cards,game){
  let best=0;
  for(let i=1;i<cards.length;i++)if(E.compare(cards[i],cards[best],cards[0],game)<0)best=i;
  return best;
 }
 function rollout(pos,sampled,candidate,random){
  const g={...pos.game};
  const hands=cloneHands(sampled);hands[pos.seat]=[...pos.myHand];
  const team=worldTeams(pos,hands);if(!team)return null;
  const actualSide=team.has(pos.seat),knownAce=pos.knownCalledAce;
  let publiclyKnownPartner=null;
  if(g.type==='rufspiel'){
   for(const t of pos.past){const k=t.cards.indexOf(knownAce);if(k>=0)publiclyKnownPartner=E.nextSeat(t.leaderSeat,k);}
   const k=pos.prefix.indexOf(knownAce);if(k>=0)publiclyKnownPartner=E.nextSeat(pos.t.leaderSeat,k);
  }
  let declarerPoints=pos.past.reduce((n,t)=>n+(team.has(t.winnerSeat)?t.eyes:0),0);
  let trickLeader=pos.t.leaderSeat;
  for(let k=pos.turn;k<8;k++){
   const play=k===pos.turn?[...pos.prefix]:[];
   const begin=play.length;
   g.__simLeader=trickLeader;
   for(let j=begin;j<4;j++){
    const s=E.nextSeat(trickLeader,j);
    const card=k===pos.turn&&j===pos.idx?candidate:policyPick(hands[s],play,s,g,publiclyKnownPartner,random);
    const at=hands[s].indexOf(card);if(at<0)throw Error('Simulierte Hand enthält die gespielte Karte nicht.');
    hands[s].splice(at,1);play.push(card);
    if(card===knownAce)publiclyKnownPartner=s;
   }
   const winner=E.nextSeat(trickLeader,E.winnerIndex(play,g));
   if(team.has(winner))declarerPoints+=E.trickEyes(play);
   trickLeader=winner;
  }
  const myPoints=actualSide?declarerPoints:120-declarerPoints;
  const myWin=actualSide?declarerPoints>=61:declarerPoints<=60;
  return {myWin:myWin?1:0,myPoints};
 }
 function analyze(game,turn,options={}){
  const pos=buildPosition(game,turn);if(!pos.ok)return {version:VERSION,...pos};
  const samples=Math.max(20,Math.min(500,Number(options.samples)||120));
  const seed=(Number(options.seed)||0x4192026)>>>0;
  const rnd=seeded(seed),totals=Object.fromEntries(pos.legal.map(c=>[c,{card:c,wins:0,eyes:0,count:0}]));
  let rejected=0;
  for(let i=0;i<samples;i++){
   let hand=null;for(let retry=0;retry<35&&!hand;retry++)hand=assignUnknown(pos,rnd);
   if(!hand){rejected++;continue;}
   // Same underlying deals for every move; tie stochastic simulations to common seed.
   const common=(rnd()*0xffffffff)>>>0;
   for(const card of pos.legal){const sim=rollout(pos,hand,card,seeded(common));if(!sim)continue;
    const x=totals[card];x.count++;x.wins+=sim.myWin;x.eyes+=sim.myPoints;}
  }
  const evaluated=Object.values(totals).filter(x=>x.count>0).map(x=>({card:x.card,samples:x.count,winRate:x.wins/x.count,meanEyes:x.eyes/x.count})).sort((a,b)=>b.meanEyes-a.meanEyes);
  if(!evaluated.length)return {ok:false,version:VERSION,reason:'Unter den bisherigen Beobachtungen konnte keine konsistente Kartenverteilung erzeugt werden.'};
  const recorded=evaluated.find(x=>x.card===pos.actual), best=evaluated[0], n=evaluated[0].samples;
  const lowSamples=n<60;
  return {ok:true,version:VERSION,turn:turn+1,actual:pos.actual,candidates:evaluated,
   sampleCount:n,rejected,supported:game.type,method:'Randomisierte Kartenzuteilung mit Bedienpflicht-Ausschlüssen; einfache simulierte Mitspieler',
   estimated:true,confidence:lowSamples?'low':'experimental',
   note:'Experimentelle Schätzung, keine kalibrierte Gewinnwahrscheinlichkeit oder sichere Bestzug-Aussage. Die Ergebnisse hängen stark vom einfachen Mitspielermodell und der Kartenzuteilung ab.',
   comparison:best.card===pos.actual?'Die gespielte Karte lag im einfachen Simulationsmodell vorne.':'Eine andere Karte ergab in diesem experimentellen Modell mehr durchschnittliche Augen.',
   pointsGap:Math.max(0,best.meanEyes-recorded.meanEyes), recorded, reference:best};
 }
 return Object.freeze({VERSION,analyze,buildPosition,assignUnknown});
});
