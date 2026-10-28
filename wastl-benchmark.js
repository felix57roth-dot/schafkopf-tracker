/* Wastl 4.4: reproduzierbares Offline-Prueflabor, keine Menschen-Kalibrierung.
 * Train/Test-Trennung: MC sieht nur eigene Karten + oeffentlich gespielte Stiche;
 * unabhaengige Auswertung darf die in Testpartien versteckten Haende nutzen.
 * Alle Algorithmen eigenstaendig, ohne externe Bibliotheken oder Verbindungen.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const E=node?require('./wastl-engine.js'):root.WastlEngine;
 const P=node?require('./wastl-policy.js'):root.WastlPolicy;
 const MC=node?require('./wastl-montecarlo.js'):root.WastlMonteCarlo;
 const api=factory(E,P,MC);
 if(node)module.exports=api;
 if(root)root.WastlBenchmark=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P,MC){
 'use strict';
 const VERSION='4.5.0', MODEL='wastl-policy-4.5';
 function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function shuffled(a,rand){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 const CATEGORIES=['solo','wenz','rufspiel','geier','ramsch','kreuzrunde'];
 const typeAt=n=>CATEGORIES[n%CATEGORIES.length];
 function makeGame(seed,category){
  const rand=rng(seed),type=category||typeAt(seed),seats=E.SEATS;
  const declarerSeat=seats[seed%4],mySeat=seats[(seed>>>4)%4];
  const calledSuit=['eichel','gras','schell'][seed%3];
  let hands;
  // Every Rufspiel requires the called ace to be outside declarer's hand.
  for(let tries=0;tries<100;tries++){
   const deck=shuffled(E.FULL,rand);
   hands=Object.fromEntries(seats.map((s,i)=>[s,deck.slice(i*8,(i+1)*8)]));
   if(type!=='rufspiel'||(!hands[declarerSeat].includes(calledSuit+'-A')&&hands[declarerSeat].some(c=>c.startsWith(calledSuit+'-')&&!['O','U'].includes(c.split('-')[1]))))break;
  }
  if(type==='rufspiel'&&(hands[declarerSeat].includes(calledSuit+'-A')||!hands[declarerSeat].some(c=>c.startsWith(calledSuit+'-')&&!['O','U'].includes(c.split('-')[1]))))throw Error('Keine gültige Rufspielhand');
  const game={id:'bench-'+seed,type,trumpSuit:['herz','eichel','gras','schell'][seed%4],calledSuit,declarerSeat,mySeat,tricks:[]};
  // Kreuzsolo ist Solo mit Eichel-Trumpf, kein eigener Regeltyp.
  if(type==='solo'&&seed%2===0)game.trumpSuit='eichel';
  const initial=Object.fromEntries(seats.map(s=>[s,[...hands[s]]]));
  let leader='vh',partner=null;
  for(let k=0;k<8;k++){
   const cards=[];
   for(let i=0;i<4;i++){
    const s=E.nextSeat(leader,i);
    const card=P.choose(hands[s],cards,s,leader,game,{past:game.tricks,partner},rand);
    const j=hands[s].indexOf(card);if(j<0)throw Error('Generator: Unbekannte Karte');
    hands[s].splice(j,1);cards.push(card);
    if(type==='rufspiel'&&card===calledSuit+'-A')partner=s;
   }
   const winnerSeat=E.nextSeat(leader,E.winnerIndex(cards,game));
   game.tricks.push({leaderSeat:leader,cards,winnerSeat,eyes:E.trickEyes(cards)});
   leader=winnerSeat;
  }
  const checked=E.review(game);
  if(!checked.ok||checked.result.status!=='known')throw Error('Referenzspiel ungültig: '+checked.errors.map(e=>e.message).join('; '));
  return {game,initial};
 }
 function heldout(game,turn,card,seed,randomRate=.14){
  const rand=rng(seed),all=E.reconstructHands(game),teams=E.partnership(game,all);
  if(!teams&&game.type!=='ramsch')throw Error('Unklare Teams in Referenzspiel');
  const mySide=teams?teams.team.includes(game.mySeat):true,hands=Object.fromEntries(E.SEATS.map(s=>[s,[...all[s]]]));
  const prefixTrick=game.tricks[turn],idx=(E.SEATS.indexOf(game.mySeat)-E.SEATS.indexOf(prefixTrick.leaderSeat)+4)%4;
  let points=0,leader='vh',partner=null;
  const ramschTricks=[];
  const past=[];
  for(let t=0;t<turn;t++){
   const tr=game.tricks[t];
   for(let j=0;j<4;j++){
    const s=E.nextSeat(tr.leaderSeat,j);
    hands[s].splice(hands[s].indexOf(tr.cards[j]),1);
    if(game.type==='rufspiel'&&tr.cards[j]===game.calledSuit+'-A')partner=s;
   }
   if(teams?.team.includes(tr.winnerSeat))points+=tr.eyes;
   if(game.type==='ramsch')ramschTricks.push({...tr});
   past.push({leaderSeat:tr.leaderSeat,cards:[...tr.cards]});
  }
  for(let t=turn;t<8;t++){
   const original=t===turn?prefixTrick:null;
   leader=t===turn?prefixTrick.leaderSeat:leader;
   const cards=[];
   for(let i=0;i<4;i++){
    const s=E.nextSeat(leader,i);
    let chosen;
    if(original&&i<idx)chosen=original.cards[i];
    else if(original&&i===idx)chosen=card;
    else {
     const legal=E.legalMoves(hands[s],cards[0]||null,game,{past,trickIndex:t});
     chosen=rand()<randomRate?legal[Math.floor(rand()*legal.length)]:P.choose(hands[s],cards,s,leader,game,{past,partner},rand);
    }
    const j=hands[s].indexOf(chosen);
    if(j<0)throw Error('Holdout: Karte fehlt ('+chosen+')');
    hands[s].splice(j,1);cards.push(chosen);
    if(game.type==='rufspiel'&&chosen===game.calledSuit+'-A')partner=s;
   }
   const win=E.nextSeat(leader,E.winnerIndex(cards,game));
   if(teams?.team.includes(win))points+=E.trickEyes(cards);
   if(game.type==='ramsch')ramschTricks.push({leaderSeat:leader,cards:[...cards],winnerSeat:win});
   past.push({leaderSeat:leader,cards:[...cards]});
   leader=win;
  }
  if(game.type==='ramsch'){
   const result=E.ramschOutcome(ramschTricks);
   if(result.status!=='known')throw Error('Uneindeutiger Ramsch im Referenztest');
   const own=result.people.find(x=>x.seat===game.mySeat);
   const nonLoser=result.winner==='durchmarsch'?Number(result.winnerSeat===game.mySeat):Number(result.loserSeat!==game.mySeat);
   return {win:nonLoser,eyes:120-own.eyes}; // Kennzahl: weniger eigene Augen = besser.
  }
  const myEyes=mySide?points:120-points;
  return {win:mySide?(points>=61?1:0):(points<=60?1:0),eyes:myEyes};
 }
 function chooseTurns(game,rand){
  const eligible=[];
  for(let i=0;i<7;i++){
   const p=MC.buildPosition(game,i);
   if(p.ok&&p.legal.length>1)eligible.push(i);
  }
  return shuffled(eligible,rand);
 }
 function average(a){return a.length?a.reduce((n,v)=>n+v,0)/a.length:0;}
 function evaluateCase(game,turn,options={}){
  const samples=options.samples||90,evalRuns=options.evalRuns||24;
  const seed=options.seed||0x441199;
  const simulated=MC.analyze(game,turn,{samples,seed});
  if(!simulated.ok)return {ok:false,reason:simulated.reason,turn};
  const candidateRows=simulated.candidates.map(c=>{
   const real=[];for(let i=0;i<evalRuns;i++)real.push(heldout(game,turn,c.card,(seed+i*11719+0x33333333)>>>0));
   return {card:c.card,predicted:c.winRate,observed:average(real.map(x=>x.win)),eyes:average(real.map(x=>x.eyes))};
  });
  const best=candidateRows.find(x=>x.card===simulated.reference.card);
  const randomWin=average(candidateRows.map(c=>c.observed));
  const randomEyes=average(candidateRows.map(c=>c.eyes));
  const observedBest=candidateRows.reduce((a,b)=>a.observed>b.observed?a:b);
  const played=candidateRows.find(c=>c.card===simulated.actual);
  return {ok:true,type:game.type,turn,seed,samples:simulated.sampleCount,evalRuns,
   candidateCount:candidateRows.length,pick:simulated.reference.card,actual:simulated.actual,
   predicted:best.predicted,observed:best.observed,randomWin,randomEyes,
   recommendedEyes:best.eyes,oracleWin:observedBest.observed,
   brierLike:average(candidateRows.map(c=>(c.predicted-c.observed)**2)),
   baselineBrierLike:average(candidateRows.map(c=>(randomWin-c.observed)**2)),
   recommendedVsRandom:best.observed-randomWin,
   regretVsBest:observedBest.observed-best.observed,
   cardRows:candidateRows,playedObserved:played?.observed};
 }
 function aggregate(rows,requested){
  const valid=rows.filter(x=>x.ok);
  if(!valid.length)return {ok:false,version:VERSION,requested,usable:0,reason:'Keine vergleichbaren Entscheidungssituationen gefunden.'};
  const diffs=valid.map(x=>x.recommendedVsRandom);
  const lift=average(diffs),sd=Math.sqrt(average(diffs.map(x=>(x-lift)**2)));
  const margin=valid.length>1?1.96*sd/Math.sqrt(valid.length):1;
  const averageSamples=Math.round(average(valid.map(x=>x.samples)));
  const eyeLift=average(valid.map(x=>x.recommendedEyes-x.randomEyes));
  const breakdown=Object.fromEntries(CATEGORIES.map(t=>{const a=valid.filter(x=>x.type===t);const v=a.map(x=>x.recommendedVsRandom),mean=average(v),deviation=Math.sqrt(average(v.map(x=>(x-mean)**2)));return [t,{count:a.length,lift:mean,margin:a.length>1?1.96*deviation/Math.sqrt(a.length):1,modelError:average(a.map(x=>x.brierLike)),eyeLift:average(a.map(x=>x.recommendedEyes-x.randomEyes))}];}));
  return {ok:true,version:VERSION,model:MODEL,requested,usable:valid.length,
   lift,margin,eyeLift,meanLoss:average(valid.map(x=>x.regretVsBest)),
   meanModelError:average(valid.map(x=>x.brierLike)),meanBaselineError:average(valid.map(x=>x.baselineBrierLike)),
   averageSamples,avgHoldout:Math.round(average(valid.map(x=>x.evalRuns))),
   types:breakdown,positive:diffs.filter(x=>x>.00001).length,negative:diffs.filter(x=>x<-.00001).length,
   ties:diffs.filter(x=>Math.abs(x)<=.00001).length,
   // The width only reflects scenario-to-scenario variability; not real players.
   evidence: valid.length>=24&&lift-margin>0?'supported':valid.length<24?'small-sample':'inconclusive',
   warning:'Gleiche KI-Politik erzeugt und bewertet die künstlichen Partien; das ist ein interner Konsistenztest und KEINE unabhängige Bestätigung realer Spielstärke. Vergleich gegen zufällig legale Karten. Das Prüfverfahren kennt die vollständige Referenzhand; die Empfehlung nicht. Modellfehler und reale Spielstärke werden dadurch NICHT validiert.'};
 }
 function suite(options={}){
  const requested=Math.max(8,Math.min(96,Math.round(Number(options.cases)||24)));
  const samples=Math.max(40,Math.min(180,Math.round(Number(options.samples)||80)));
  const evalRuns=Math.max(8,Math.min(48,Math.round(Number(options.evalRuns)||16)));
  const baseSeed=(Number(options.seed)||0x441022)>>>0;
  const rows=[],errors=[];
  let dealIndex=0;
  while(rows.length<requested&&dealIndex<requested*9){
   const index=dealIndex++,seed=(baseSeed+index*7907)>>>0;
   const category=typeAt(index);
   try{
    const {game}=makeGame(seed,category);
    const turns=chooseTurns(game,rng(seed^0x17));
    if(!turns.length)continue;
    const turn=turns[0];
    const r=evaluateCase(game,turn,{samples,evalRuns,seed:seed^0x5724});
    if(r.ok)rows.push(r);else errors.push(r.reason);
   }catch(e){errors.push(String(e.message||e));}
   if(typeof options.onProgress==='function')options.onProgress({completed:rows.length,total:requested,attempts:dealIndex});
  }
  return {...aggregate(rows,requested),cases:rows,errors:errors.slice(0,6),seed:baseSeed,samples,evalRuns};
 }
 return Object.freeze({VERSION,makeGame,heldout,evaluateCase,aggregate,suite});
});
