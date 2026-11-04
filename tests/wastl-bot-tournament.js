/* Wastl Bot Tournament 8.1: gepaarte Alt-gegen-Neu-Pruefung.
 * Kommando: node tests/wastl-bot-tournament.js --cases=24 --samples=12
 * Gleiche zufallsgegebene Startkarten, Spiele und fokale Sitzplaetze.
 * Das ist kein Human-Benchmark. Gegenspieler bleiben Policy 4.5.
 */
'use strict';
const E=require('../wastl-engine.js');
const P=require('../wastl-policy.js');
const B=require('../wastl-bots.js');
const Brain=require('../wastl-bot-brain.js');
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function scoreRows(rows,key){
 const values=rows.map(r=>r[key]);
 const mean=values.reduce((a,b)=>a+b,0)/(values.length||1);
 const variance=values.length>1?values.reduce((a,b)=>a+(b-mean)**2,0)/(values.length-1):0;
 return {mean,ci95:values.length>1?1.96*Math.sqrt(variance/values.length):null};
}
function scenario(index){
 const types=['rufspiel','solo','wenz'];
 const type=types[index%3],seat=E.SEATS[Math.floor(index/3)%4];
 const dealSeed=(0x809100+index*18311)>>>0;
 const hands=B.deal(rng(dealSeed));
 const game={type,calledSuit:'eichel',trumpSuit:'herz'};
 const candidates=[];
 for(const s of E.SEATS){
  const bids=B.bidOptions(hands[s],null,s).filter(o=>o.type===type);
  for(const offer of bids)candidates.push({seat:s,offer,strength:B.bidStrength(hands[s],offer)});
 }
 if(!candidates.length)return null;
 candidates.sort((a,b)=>b.strength-a.strength||a.seat.localeCompare(b.seat));
 const chosen=candidates[0];
 return {type,seat,dealSeed,hands,declarerSeat:chosen.seat,
  calledSuit:chosen.offer.calledSuit||'eichel',trumpSuit:chosen.offer.trumpSuit||'herz',
  seed:index};
}
function playGame(test,mode,samples){
 const focal=test.seat,observer=E.nextSeat(focal,1);
 const g=B.create({mySeat:observer,hands:test.hands,random:rng(test.seed+909)});
 Object.assign(g,{phase:'playing',type:test.type,trumpSuit:test.trumpSuit,
  calledSuit:test.calledSuit,declarerSeat:test.declarerSeat,leaderSeat:'vh',turn:'vh',
  current:[],tricks:[]});
 let looked=0,fallbacks=0,disagreements=0,steps=0;
 while(g.phase!=='done'&&steps++<50){
  if(g.phase==='trickDone'){B.nextTrick(g);continue;}
  if(g.phase==='finalTrick'){B.showResult(g);break;}
  if(g.phase!=='playing')throw Error('Falsche Spielphase');
  const seat=g.turn,hand=g.hands[seat],played=g.current.map(x=>x.card);
  const game={type:g.type,trumpSuit:g.trumpSuit,calledSuit:g.calledSuit,declarerSeat:g.declarerSeat};
  const random=rng((test.seed*1640531535+g.tricks.length*1367+E.SEATS.indexOf(seat)*37+played.length*11+12)>>>0);
  const old=P.choose(hand,played,seat,g.leaderSeat,game,{past:g.tricks},random);
  let chosen=old;
  if(seat===focal&&mode==='new'&&B.playable(g,seat).length>1){
   const view=Brain.publicView(g,seat);
   const estimated=Brain.analyze(view,{samples,seed:(test.seed*131071+g.tricks.length*911+played.length*101+4)>>>0});
   looked++;
   if(estimated.ok&&B.playable(g,seat).includes(estimated.card)){chosen=estimated.card;if(chosen!==old)disagreements++;}
   else fallbacks++;
  }
  if(!B.playable(g,seat).includes(chosen))throw Error('Illegale Karte: '+chosen);
  if(seat===g.mySeat)B.play(g,chosen);
  else B.stepBot(g,random,{card:chosen});
 }
 if(g.phase!=='done')throw Error('Partie nicht abgeschlossen');
 const ace=test.calledSuit+'-A',partner=test.type==='rufspiel'
  ?E.SEATS.find(s=>test.hands[s].includes(ace)):null;
 const team=new Set(test.type==='rufspiel'?[test.declarerSeat,partner]:[test.declarerSeat]);
 const eyes=g.tricks.filter(t=>team.has(t.winnerSeat)).reduce((n,t)=>n+t.eyes,0);
 const attack=team.has(focal),ownEyes=attack?eyes:120-eyes,win=ownEyes>=61;
 const archived=B.toRecord(g);
 if(!E.review(archived).ok)throw Error('Gespeicherte Partie regelwidrig');
 return {win:win?1:0,eyes:ownEyes,looked,fallbacks,disagreements,attack,
  played:g.tricks.length};
}
function tournament({cases=24,samples=12}={}){
 const requested=Math.max(3,Math.min(250,Math.trunc(cases)));
 const trials=Math.max(8,Math.min(90,Math.trunc(samples)));
 const rows=[],errors=[];
 for(let i=0;i<requested;i++){
  try{
   const test=scenario(i);
   if(!test)continue;
   const old=playGame(test,'old',trials),newer=playGame(test,'new',trials);
   rows.push({index:i,type:test.type,seat:test.seat,attack:old.attack,
    oldWin:old.win,newWin:newer.win,oldEyes:old.eyes,newEyes:newer.eyes,
    deltaWin:newer.win-old.win,deltaEyes:newer.eyes-old.eyes,
    comparisons:newer.looked,changed:newer.disagreements,fallbacks:newer.fallbacks});
  }catch(error){errors.push({index:i,reason:String(error.message||error)});}
 }
 const byType=Object.fromEntries(['rufspiel','solo','wenz'].map(type=>{
  const v=rows.filter(r=>r.type===type);
  return [type,{cases:v.length,winDiff:scoreRows(v,'deltaWin').mean,eyeDiff:scoreRows(v,'deltaEyes').mean}];
 }));
 const byRole=Object.fromEntries(['ansagerTeam','gegenspieler'].map(role=>{
  const v=rows.filter(r=>r.attack===(role==='ansagerTeam'));
  return [role,{cases:v.length,winDiff:scoreRows(v,'deltaWin').mean,eyeDiff:scoreRows(v,'deltaEyes').mean}];
 }));
 const wins=scoreRows(rows,'deltaWin'),eyes=scoreRows(rows,'deltaEyes');
 return {version:'8.1.0',requested,usable:rows.length,samples:trials,
  gamesPlayed:rows.length*2,oldWinRate:scoreRows(rows,'oldWin').mean,
  newWinRate:scoreRows(rows,'newWin').mean,
  deltaWin:wins.mean,deltaWinCI95:wins.ci95,
  deltaEyes:eyes.mean,deltaEyesCI95:eyes.ci95,
  lookaheadDecisions:rows.reduce((n,x)=>n+x.comparisons,0),
  differentDecisions:rows.reduce((n,x)=>n+x.changed,0),
  fallbacks:rows.reduce((n,x)=>n+x.fallbacks,0),
  byType,byRole,errors,rows,
  disclaimer:'Gepaarter Offline-Politikvergleich gegen die alte KI. Kein Beleg fuer durchschnittliche menschliche Spielstaerke. 95%-Intervall nur ueber Testpartien.'};
}
if(typeof require==='function'&&require.main===module){
 const get=(name,def)=>{
  const found=process.argv.find(a=>a.startsWith('--'+name+'='));
  return found?Number(found.slice(name.length+3)):def;
 };
 console.log(JSON.stringify(tournament({cases:get('cases',24),samples:get('samples',12)}),null,2));
}
module.exports={rng,scenario,playGame,tournament};
