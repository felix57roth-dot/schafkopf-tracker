/* Wastl Rufspiel-Labor: gepaarte Offline-Referenzspiele, kein Human-Benchmark.
 * Gegenbots: eigene, einfache Regelheuristik O.chooseIndependent. Sie koennen
 * pro Entscheidung nur eigene Hand und oeffentliche Stiche sehen.
 * node tests/wastl-rufspiel-independent-study.js --cases=144 --samples=12
 */
'use strict';
const E=require('../wastl-engine.js');
const B=require('../wastl-bots.js');
const O=require('../wastl-opponents.js');
const Brain=require('../wastl-bot-brain.js');
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;
 t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
 return ((t^(t>>>14))>>>0)/4294967296;};}
function scenario(i){
 const hands=B.deal(rng(57000+i*131)),options=[];
 for(const seat of E.SEATS)
  for(const offer of B.bidOptions(hands[seat],null,seat))
   if(offer.type==='rufspiel')options.push({seat,offer});
 if(!options.length)return null;
 const sel=options[(i*7+3)%options.length],declarer=sel.seat,
  calledSuit=sel.offer.calledSuit,partner=E.SEATS.find(s=>hands[s].includes(calledSuit+'-A'));
 const role=i%3;
 const candidates=E.SEATS.filter(s=>s!==declarer&&s!==partner);
 const focal=role===0?declarer:role===1?partner:candidates[(Math.floor(i/3))%candidates.length];
 return {i,hands,declarer,partner,calledSuit,focal,role:['ansager','rufpartner','verteidiger'][role]};
}
function play(s,model,samples=10){
 const game=B.create({mySeat:E.nextSeat(s.focal,1),hands:s.hands});
 Object.assign(game,{type:'rufspiel',calledSuit:s.calledSuit,phase:'playing',
  declarerSeat:s.declarer,leaderSeat:'vh',turn:'vh',current:[],tricks:[]});
 let steps=0,decisions=0,unrevealedDecisions=0,fallbacks=0;
 while(game.phase!=='done'&&steps++<49){
  if(game.phase==='trickDone'){B.nextTrick(game);continue;}
  if(game.phase==='finalTrick'){B.showResult(game);break;}
  if(game.phase!=='playing')throw Error('Ungueltige Spielphase '+game.phase);
  const seat=game.turn,played=game.current.map(x=>x.card),hand=game.hands[seat];
  const seed=(s.i*2654435761+game.tricks.length*201+E.SEATS.indexOf(seat)*41+played.length*97)>>>0;
  let chosen;
  if(seat===s.focal){
   const legal=B.playable(game,seat);
   if(legal.length===1)chosen=legal[0];
   else{
    const report=Brain.analyze(Brain.publicView(game,seat),{samples,seed,opponentModel:model});
    if(!report.ok)fallbacks++;
    chosen=report.ok?report.card:O.chooseIndependent(hand,played,seat,game.leaderSeat,game,{past:game.tricks},rng(seed));
    decisions++;
    if(!game.tricks.some(t=>t.cards.includes(s.calledSuit+'-A')))unrevealedDecisions++;
   }
  }else chosen=O.chooseIndependent(hand,played,seat,game.leaderSeat,game,{past:game.tricks},rng(seed));
  if(!B.playable(game,seat).includes(chosen))throw Error('Unerlaubte Karte '+chosen);
  if(seat===game.mySeat)B.play(game,chosen);
  else B.stepBot(game,rng(seed),{card:chosen});
 }
 if(game.phase!=='done'||game.tricks.length!==8)throw Error('Partie nicht fertig');
 if(!E.review(B.toRecord(game)).ok)throw Error('Spielregeln verletzt');
 const team=new Set([s.declarer,s.partner]);
 const attackEyes=game.tricks.filter(t=>team.has(t.winnerSeat)).reduce((n,t)=>n+t.eyes,0);
 const eyes=team.has(s.focal)?attackEyes:120-attackEyes;
 return {win:Number(eyes>=61),eyes,decisions,unrevealedDecisions,fallbacks};
}
function stat(rows){
 const n=rows.length,mean=key=>n?rows.reduce((a,r)=>a+r[key],0)/n:0;
 const margin=key=>{
  if(n<2)return null;
  const m=mean(key),v=rows.reduce((a,r)=>a+(r[key]-m)**2,0)/(n-1);
  return 1.96*Math.sqrt(v/n);
 };
 return {cases:n,winDelta:mean('winDelta'),winMargin95:margin('winDelta'),
  eyesDelta:mean('eyesDelta'),eyesMargin95:margin('eyesDelta'),
  unrevealedDecisions:rows.reduce((s,r)=>s+r.unrevealedDecisions,0),
  fallbacks:rows.reduce((s,r)=>s+r.fallbacks,0)};
}
function study(options={}){
 const cases=Math.max(3,Math.min(300,Math.trunc(options.cases||72)));
 const samples=Math.max(8,Math.min(90,Math.trunc(options.samples||10)));
 const before=options.before||'tactical',after=options.after||'partnerAware';
 const rows=[],errors=[];
 for(let i=0;i<cases;i++){
  const s=scenario(i);if(!s)continue;
  try{
   const a=play(s,before,samples),b=play(s,after,samples);
   rows.push({i,role:s.role,winDelta:b.win-a.win,eyesDelta:b.eyes-a.eyes,
    unrevealedDecisions:b.unrevealedDecisions,fallbacks:b.fallbacks});
  }catch(e){errors.push({index:i,reason:String(e?.message||e)});}
 }
 return {version:'1.0.0',before,after,samples,overall:stat(rows),
  byRole:Object.fromEntries(['ansager','rufpartner','verteidiger'].map(k=>
   [k,stat(rows.filter(r=>r.role===k))])),
  errors,rows,
  note:'Synthetische gepaarte Referenz gegen getrennte einfache Offline-Regelgegner. Kein Beleg fuer menschliches Spielniveau.'};
}
if(require.main===module){
 const get=(key,def)=>{const arg=process.argv.find(a=>a.startsWith('--'+key+'='));return arg?Number(arg.slice(key.length+3)):def;};
 console.log(JSON.stringify(study({cases:get('cases',72),samples:get('samples',10)}),null,2));
}
module.exports={scenario,play,study};
