/* Wastl 4.1: unabhängiger lokaler Monte-Carlo-Prototyp für Schafkopf.
 * Bewertet nur die zum Entscheidungszeitpunkt sichtbaren Informationen.
 * Keine Spielstärke-Garantie; die modellierten Gegenspieler sind heuristisch.
 * Eigenständige Implementierung ohne Fremdbibliotheken.
 */
(function(root, factory){
 const E = (typeof module==='object' && module.exports) ? require('./wastl-engine.js') : root.WastlEngine;
 const Policy=(typeof module==='object' && module.exports) ? require('./wastl-policy.js') : root.WastlPolicy;
 const Opponents=(typeof module==='object' && module.exports) ? require('./wastl-opponents.js') : root.WastlOpponents;
 const api=factory(E,Policy,Opponents);
 if(typeof module==='object' && module.exports)module.exports=api;
 if(root)root.WastlMonteCarlo=api;
})(typeof globalThis!=='undefined'?globalThis:this, function(E,Policy,Opponents){
 'use strict';
 const VERSION='5.1.0';
 const SUPPORTED=new Set(['rufspiel','solo','wenz','farbwenz','geier','farbgeier','ramsch','kreuzrunde']);
 function seeded(seed){let a=seed>>>0;return function(){a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function seatIndex(leader,seat){return (E.SEATS.indexOf(seat)-E.SEATS.indexOf(leader)+4)%4;}
 function cloneHands(h){return Object.fromEntries(E.SEATS.map(s=>[s,[...h[s]]]));}
 function addVoids(voids,lead,cards,leader){
  const clazz=E.colorClass(lead.gameCard,lead.game);
  cards.forEach((card,i)=>{if(E.colorClass(card,lead.game)!==clazz){const seat=E.nextSeat(leader,i);voids[seat].add(clazz);}});
 }
 function buildPosition(game,turn){
  if(!E||!SUPPORTED.has(game?.type))return {ok:false,reason:'Unterstützt werden Rufspiel, Solo, Wenz, Geier, Kreuzrunde und Ramsch mit den jeweiligen Farbvarianten.'};
  const r=E.review(game);
  if(!r.ok||r.result.status!=='known')return {ok:false,reason:'Die Partie ist nicht vollständig und regelkonform dokumentiert. Bitte zuerst „Regeln prüfen“ verwenden.'};
  if(!E.SEATS.includes(game.mySeat))return {ok:false,reason:'Dein Platz konnte nicht bestimmt werden.'};
  if(!Number.isInteger(turn)||turn<0||turn>=8)return {ok:false,reason:'Bitte einen Stich von 1 bis 8 auswählen.'};
  const t=game.tricks[turn],seat=game.mySeat,idx=seatIndex(t.leaderSeat,seat);
  const myFull=(game.source==='palast'&&game.initialHandsSource==='palast-photo-crosschecked-v4.8'&&Array.isArray(game.initialHands?.[seat])&&game.initialHands[seat].length===8?game.initialHands[seat]:null)||E.reconstructHands(game)?.[seat];
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
  const legal=E.legalMoves(myHand,prefix[0]||null,game,{past,trickIndex:turn});
  if(!legal.includes(t.cards[idx]))return {ok:false,reason:'Deine tatsächlich gespielte Karte ist nach der Rekonstruktion nicht legal.'};
  if(legal.length<=1)return {ok:false,reason:'In diesem Stich hattest du keine Kartenauswahl (Bedienpflicht). Ein Vergleich ist nicht sinnvoll.',onlyLegal:true};
  const reserved=new Set([...used,...myHand]);
  const unknown=E.FULL.filter(c=>!reserved.has(c));
  const capacities=Object.fromEntries(E.SEATS.map(s=>[s,s===seat?0:8-playedCount[s]]));
  if(unknown.length!==Object.values(capacities).reduce((a,b)=>a+b,0))return {ok:false,reason:'Die verbleibenden Kartenanzahlen passen nicht zusammen.'};
  const knownCalledAce=game.type==='rufspiel'?`${game.calledSuit}-A`:null;
  return {ok:true,game,turn,t,seat,idx,past,prefix,myHand,legal,actual:t.cards[idx],unknown,capacities,voids,used,knownCalledAce};
 }
 // Wastl 5.0: genaue bedingte Gleichverteilung unbekannter Karten.
 // Statt verzerrter Zufalls-DFS zaehlen wir mit dynamischer Programmierung
 // alle vollstaendigen Zuteilungen. Die Wahl jedes Besitzers ist proportional
 // zur Zahl der danach noch moeglichen Komplettierungen.
 // Bei maximal 24 unbekannten Karten bleiben die Anzahlen sichere JS-Integer.
 function prepareDealSampler(pos){
  const seats=E.SEATS.filter(s=>s!==pos.seat);
  if(seats.length!==3)return {count:0,sample:()=>null};
  const caps=seats.map(s=>pos.capacities[s]);
  const cards=pos.unknown.map(card=>({
   card,choices:seats.map((seat,index)=>({seat,index}))
    .filter(x=>!pos.voids[x.seat].has(E.colorClass(card,pos.game))
     &&!(card===pos.knownCalledAce&&x.seat===pos.game.declarerSeat))
    .map(x=>x.index)
  })).sort((a,b)=>a.choices.length-b.choices.length);
  if(caps.some(n=>!Number.isInteger(n)||n<0||n>8)
   ||caps.reduce((a,b)=>a+b,0)!==cards.length
   ||cards.some(c=>!c.choices.length))return {count:0,sample:()=>null};
  const memo=new Map();
  function ways(index,left){
   if(left.some(n=>n<0))return 0;
   if(index===cards.length)return left.every(n=>n===0)?1:0;
   // Die dritte Restkapazitaet ist durch Index und erste zwei festgelegt.
   const key=index+':'+left[0]+':'+left[1];
   if(memo.has(key))return memo.get(key);
   let count=0;
   for(const seat of cards[index].choices){
    if(left[seat]===0)continue;
    left[seat]--;
    count+=ways(index+1,left);
    left[seat]++;
   }
   memo.set(key,count);
   return count;
  }
  const count=ways(0,[...caps]);
  if(!Number.isSafeInteger(count))throw Error('Zu viele Kartenverteilungen fuer exakte Ziehung.');
  function sample(random){
   if(!count)return null;
   const remaining=[...caps],hands=Object.fromEntries(E.SEATS.map(s=>[s,[]]));
   for(let index=0;index<cards.length;index++){
    const options=[];
    let total=0;
    for(const candidate of cards[index].choices){
     if(remaining[candidate]===0)continue;
     remaining[candidate]--;
     const n=ways(index+1,remaining);
     remaining[candidate]++;
     if(n>0){options.push({candidate,n});total+=n;}
    }
    if(!total)return null;
    let draw=Math.max(0,Math.min(1-Number.EPSILON,Number(random())))*total;
    let selected=options[options.length-1].candidate;
    for(const {candidate,n} of options){if(draw<n){selected=candidate;break;}draw-=n;}
    hands[seats[selected]].push(cards[index].card);
    remaining[selected]--;
   }
   return hands;
  }
  return {count,sample};
 }
 // Bestehende Test-API bleibt kompatibel.
 function assignUnknown(pos,random){return prepareDealSampler(pos).sample(random);}
 function worldTeams(pos,hands){
  const g=pos.game;
  if(g.type==='ramsch')return new Set([pos.seat]);
  if(g.type==='kreuzrunde')return new Set(['vh','hh']);
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
 function rollout(pos,sampled,candidate,random,opponentModel){
  const g={...pos.game};
  // Feste Charaktere fuer die gesamte simulierte Fortsetzung. Durch den
  // identischen Seed gelten dieselben Stile fuer alle Kartenalternativen.
  const profiles=opponentModel==='mixed'?Opponents.assignStyles(random):null;
  const hands=cloneHands(sampled);hands[pos.seat]=[...pos.myHand];
  const team=worldTeams(pos,hands);if(!team)return null;
  const actualSide=team.has(pos.seat),knownAce=pos.knownCalledAce;
  const publicState={past:pos.past.map(t=>({leaderSeat:t.leaderSeat,cards:[...t.cards]})),partner:null};
  let publiclyKnownPartner=null;
  if(g.type==='rufspiel'){
   for(const t of pos.past){const k=t.cards.indexOf(knownAce);if(k>=0)publiclyKnownPartner=E.nextSeat(t.leaderSeat,k);}
   const k=pos.prefix.indexOf(knownAce);if(k>=0)publiclyKnownPartner=E.nextSeat(pos.t.leaderSeat,k);
  }
  publicState.partner=publiclyKnownPartner;
  let declarerPoints=pos.past.reduce((n,t)=>n+(team.has(t.winnerSeat)?t.eyes:0),0);
  const ramschTricks=g.type==='ramsch'?pos.past.map(t=>({...t})):null;
  let trickLeader=pos.t.leaderSeat;
  for(let k=pos.turn;k<8;k++){
   const play=k===pos.turn?[...pos.prefix]:[];
   const begin=play.length;
   g.__simLeader=trickLeader;
   for(let j=begin;j<4;j++){
    const s=E.nextSeat(trickLeader,j);
    const card=k===pos.turn&&j===pos.idx?candidate
      :profiles?Opponents.choose(hands[s],play,s,trickLeader,g,publicState,profiles[s],random)
      :Policy.choose(hands[s],play,s,trickLeader,g,publicState,random);
    const at=hands[s].indexOf(card);if(at<0)throw Error('Simulierte Hand enthält die gespielte Karte nicht.');
    hands[s].splice(at,1);play.push(card);
    if(card===knownAce){publiclyKnownPartner=s;publicState.partner=s;}
   }
   const winner=E.nextSeat(trickLeader,E.winnerIndex(play,g));
   if(team.has(winner))declarerPoints+=E.trickEyes(play);
   if(ramschTricks)ramschTricks.push({leaderSeat:trickLeader,cards:[...play],winnerSeat:winner});
   trickLeader=winner;
   publicState.past.push({leaderSeat:g.__simLeader,cards:[...play]});
  }
  if(ramschTricks){
   const res=E.ramschOutcome(ramschTricks);
   if(res.status!=='known')return null;
   const own=res.people.find(x=>x.seat===pos.seat);
   const success=res.winner==='durchmarsch'?Number(res.winnerSeat===pos.seat):Number(res.loserSeat!==pos.seat);
   return {myWin:success,myPoints:own.eyes};
  }
  const myPoints=actualSide?declarerPoints:120-declarerPoints;
  const myWin=actualSide?declarerPoints>=61:declarerPoints<=60;
  return {myWin:myWin?1:0,myPoints};
 }
 function analyze(game,turn,options={}){
  const pos=buildPosition(game,turn);if(!pos.ok)return {version:VERSION,...pos};
  const samples=Math.max(20,Math.min(500,Number(options.samples)||120));
  const seed=(Number(options.seed)||0x4192026)>>>0;
  const opponentModel=options.opponentModel==='legacy'?'legacy':'mixed';
  const sampler=prepareDealSampler(pos);
  if(!sampler.count)return {ok:false,version:VERSION,reason:'Keine zur bisherigen Kartenfolge passende Verteilung unbekannter Haende gefunden.'};
  const rnd=seeded(seed),totals=Object.fromEntries(pos.legal.map(c=>[c,{card:c,wins:0,eyes:0,count:0}]));
  let rejected=0;
  const paired=Object.fromEntries(pos.legal.map(c=>[c,[]]));
  for(let i=0;i<samples;i++){
   const hand=sampler.sample(rnd);
   if(!hand){rejected++;continue;}
   // Dieselbe Kartenverteilung und identische Zufalls-Startwerte für jeden Zug.
   const common=(rnd()*0xffffffff)>>>0;
   const results={};
   for(const card of pos.legal){
    const sim=rollout(pos,hand,card,seeded(common),opponentModel);
    if(!sim)continue;
    const x=totals[card];x.count++;x.wins+=sim.myWin;x.eyes+=sim.myPoints;
    results[card]=sim;
   }
   const actual=results[pos.actual];
   if(actual)for(const card of pos.legal){
    if(results[card])paired[card].push(results[card].myWin-actual.myWin);
   }
  }
  const evaluated=Object.values(totals).filter(x=>x.count>0).map(x=>({card:x.card,samples:x.count,winRate:x.wins/x.count,meanEyes:x.eyes/x.count}))
   .sort((a,b)=>b.winRate-a.winRate||(pos.game.type==='ramsch'?a.meanEyes-b.meanEyes:b.meanEyes-a.meanEyes));
  if(!evaluated.length)return {ok:false,version:VERSION,reason:'Unter den bisherigen Beobachtungen konnte keine konsistente Kartenverteilung erzeugt werden.'};
  const recorded=evaluated.find(x=>x.card===pos.actual),best=evaluated[0],n=best.samples;
  const diff=paired[best.card],gain=diff.reduce((x,y)=>x+y,0)/Math.max(1,diff.length);
  const variance=diff.reduce((x,y)=>x+(y-gain)**2,0)/Math.max(1,diff.length-1);
  const margin=diff.length>1?1.96*Math.sqrt(variance/diff.length):1;
  // Eine klare Empfehlung nur bei genügend Stichproben und größerem Abstand.
  const clear=best.card!==pos.actual&&diff.length>=100&&gain>=.05&&gain-margin>0;
  const lowSamples=n<80;
  const comparison=best.card===pos.actual
   ? 'Deine gespielte Karte liegt in diesem Modell vorne. Das belegt noch keinen optimalen Zug.'
   : clear
    ? 'Die Alternative erzielte in diesem Modell häufiger einen Sieg; der Unterschied ist innerhalb dieser Stichprobe erkennbar.'
    : 'Mehrere Karten liegen im Bereich der statistischen Unsicherheit. Kein klar besserer Zug nachweisbar.';
  return {ok:true,version:VERSION,turn:turn+1,actual:pos.actual,candidates:evaluated,
   sampleCount:n,rejected,supported:game.type,opponentModel,
   method:opponentModel==='mixed'
    ?'Gleichverteilte plausible Kartenwelten; variierende vorsichtige, offensive und ausgewogene Offline-Mitspieler (experimentell)'
    :'Gleichverteilte plausible Kartenwelten; bisherige einheitliche heuristische Offline-Mitspieler',
   sampler:'exact-uniform-conditional-v1',possibleDeals:sampler.count,
   estimated:true,confidence:lowSamples?'low':'experimental',policyVersion:Policy.VERSION,clearAlternative:clear,
   note:'Modellergebnis, keine kalibrierte Gewinnwahrscheinlichkeit oder sichere Bestzug-Aussage. Die simulierten Mitspieler sind heuristisch; Kartenverteilungen und Annahmen bleiben vereinfacht.',
   comparison,pairedWinGap:gain,pairedUncertainty:margin,
   pointsGap:Math.max(0,game.type==='ramsch'?recorded.meanEyes-best.meanEyes:best.meanEyes-recorded.meanEyes),recorded,reference:best};
 }
 return Object.freeze({VERSION,analyze,buildPosition,assignUnknown,prepareDealSampler});
});
