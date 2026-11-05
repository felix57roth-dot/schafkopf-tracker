/* Wastl Rufspiel: gezielte A/B-Zugtests gegen zweiten eigenstaendigen Bot.
 * Der Referenzgegner benutzt nur den Regelkern, nicht Wastls Policy,
 * Monte-Carlo, alte Gegnerstrategie oder neue Rufspiel-Taktik.
 * Vor der Ruf-Sau-Aufdeckung genau EINE Modellentscheidung vergleichen,
 * danach alle Spieler mit identischer Referenzheuristik weiterspielen.
 * node tests/wastl-rufspiel-reference-study.js --cases=90 --samples=14
 */
'use strict';
const E=require('../wastl-engine.js');
const B=require('../wastl-bots.js');
const Brain=require('../wastl-bot-brain.js');
const T=require('../wastl-tactics.js');
const Ref=require('../wastl-reference-opponent.js');
function random(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function situation(i){
 const hands=B.deal(random(97001+i*479)),options=[];
 for(const seat of E.SEATS){
  for(const bid of B.bidOptions(hands[seat],null,seat))
   if(bid.type==='rufspiel')options.push({seat,bid});
 }
 if(!options.length)return null;
 const choice=options[(i*5+7)%options.length],declarer=choice.seat,suit=choice.bid.calledSuit;
 const partner=E.SEATS.find(s=>hands[s].includes(suit+'-A'));
 if(!partner||partner===declarer)return null;
 const defenders=E.SEATS.filter(s=>s!==declarer&&s!==partner);
 const role=i%3,focal=role===0?declarer:role===1?partner:defenders[Math.floor(i/3)%defenders.length];
 const g=B.create({hands,mySeat:E.nextSeat(focal,1)});
 Object.assign(g,{phase:'playing',type:'rufspiel',calledSuit:suit,leaderSeat:'vh',
  declarerSeat:declarer,turn:'vh',current:[],tricks:[]});
 return {i,g,focal,role:['ansager','rufpartner','verteidiger'][role],partner};
}
function aceUnknown(g){
 const ace=g.calledSuit+'-A';
 return !g.tricks.some(t=>t.cards.includes(ace))&&!g.current.some(x=>x.card===ace)
  &&T.publicPartner(g,g.tricks,g.current.map(x=>x.card),g.leaderSeat,'partnerAware')===null;
}
function seedAt(s,game,style,phase=0){
 return (s.i*1000003+game.tricks.length*7919+game.current.length*239+
  E.SEATS.indexOf(game.turn)*101+(style==='tempo'?677:19)+phase)>>>0;
}
function advance(g,card,randomSeed){
 if(!B.playable(g,g.turn).includes(card))throw Error('Unzulaessige Referenzkarte '+card);
 if(g.turn===g.mySeat)B.play(g,card);
 else B.stepBot(g,random(randomSeed),{card});
}
function referenceStep(g,s,style,phase=0){
 const info={past:g.tricks},cards=g.current.map(x=>x.card),seed=seedAt(s,g,style,phase);
 // Explicitly pass ONLY public game settings, own hand and open tricks.
 const publicGame={type:g.type,trumpSuit:g.trumpSuit,calledSuit:g.calledSuit,declarerSeat:g.declarerSeat};
 const chosen=Ref.choose([...g.hands[g.turn]],cards,g.turn,g.leaderSeat,publicGame,info,style,random(seed));
 advance(g,chosen,seed);
}
function position(i,style='resource'){
 const s=situation(i);if(!s)return null;
 const g=s.g;let ticks=0;
 while(ticks++<32){
  if(g.phase==='trickDone'){B.nextTrick(g);continue;}
  if(g.phase==='finalTrick'||g.phase!=='playing'||g.tricks.length>5)return null;
  if(!aceUnknown(g))return null;
  if(g.turn===s.focal&&B.playable(g,s.focal).length>=2){
   return {...s,game:g,style,trickIndex:g.tricks.length,visible:g.current.length,
    legal:B.playable(g,s.focal)};
  }
  referenceStep(g,s,style,0);
 }
 return null;
}
function finish(pos,card){
 const g=JSON.parse(JSON.stringify(pos.game));
 const seed=seedAt(pos,g,pos.style,0);
 advance(g,card,seed);
 let turn=0;
 while(g.phase!=='done'&&turn++<55){
  if(g.phase==='trickDone'){B.nextTrick(g);continue;}
  if(g.phase==='finalTrick'){B.showResult(g);break;}
  if(g.phase!=='playing')throw Error('Testspiel phase '+g.phase);
  referenceStep(g,pos,pos.style,1);
 }
 if(g.phase!=='done'||g.tricks.length!==8)throw Error('Testspiel nicht abgeschlossen');
 const review=E.review(B.toRecord(g));
 if(!review.ok)throw Error('Ungültiges Testspiel: '+(review.errors?.[0]?.message||'Regel'));
 const attackers=new Set([pos.g.declarerSeat,pos.partner]);
 const eyesOnAttack=g.tricks.filter(t=>attackers.has(t.winnerSeat)).reduce((n,t)=>n+t.eyes,0);
 const myEyes=attackers.has(pos.focal)?eyesOnAttack:120-eyesOnAttack;
 return {win:Number(myEyes>=61),eyes:myEyes};
}
function avg(rows,key){
 if(!rows.length)return {mean:null,ci95:null};
 const n=rows.length,mean=rows.reduce((a,x)=>a+x[key],0)/n;
 const variance=n>1?rows.reduce((a,x)=>a+(x[key]-mean)**2,0)/(n-1):0;
 return {mean,ci95:n>1?1.96*Math.sqrt(variance/n):null};
}
function stats(rows){
 return {cases:rows.length,changed:rows.filter(x=>x.changed).length,
  win:avg(rows,'winDelta'),eyes:avg(rows,'eyeDelta'),
  comparedStich0:rows.filter(x=>x.trickIndex===0).length,
  comparedLater:rows.filter(x=>x.trickIndex>0).length};
}
function study({cases=90,samples=14,from=0,model='partnerAware',styles=['resource','tempo']}={}){
 cases=Math.max(3,Math.min(400,Math.trunc(cases)));
 samples=Math.max(8,Math.min(90,Math.trunc(samples)));
 const rows=[],errors=[],absent=[];
 for(const style of styles)for(let i=from;i<from+cases;i++){
  const p=position(i,style);
  if(!p){absent.push({i,style});continue;}
  const view=Brain.publicView(p.game,p.focal),seed=(0x993112+i*373)>>>0;
  try{
   const control=Brain.analyze(view,{samples,seed,opponentModel:'tactical'});
   const trial=Brain.analyze(view,{samples,seed,opponentModel:model});
   if(!control.ok||!trial.ok)throw Error('Keine konsistente Simulation: '+(control.reason||trial.reason));
   if(!p.legal.includes(control.card)||!p.legal.includes(trial.card))
    throw Error('Simulation waehlt illegale Karte');
   const before=finish(p,control.card),after=finish(p,trial.card);
   rows.push({i,style,role:p.role,trickIndex:p.trickIndex,
    visible:p.visible,oldCard:control.card,newCard:trial.card,changed:control.card!==trial.card,
    winDelta:after.win-before.win,eyeDelta:after.eyes-before.eyes});
  }catch(e){errors.push({i,style,role:p.role,reason:String(e.message||e)});}
 }
 const roles=['ansager','rufpartner','verteidiger'];
 return {version:'1.0.0',from,requested:cases,styles,model,samples,
  evaluated:rows.length,skipped:absent.length,errors,
  overall:stats(rows),byRole:Object.fromEntries(roles.map(r=>[r,stats(rows.filter(x=>x.role===r))])),
  byStyle:Object.fromEntries(styles.map(s=>[s,stats(rows.filter(x=>x.style===s))])),
  changedRows:rows.filter(r=>r.changed),
  rows,notes:'A/B vergleicht eine Entscheidung vor offengelegter Ruf-Sau, mit identischen Karten, oeffentlichem Kontext und danach vollstaendig unabhaengig gespielter Referenzfortsetzung. Keine menschliche Kalibrierung.'};
}
if(require.main===module){
 const arg=(key,def)=>{const found=process.argv.find(x=>x.startsWith('--'+key+'='));return found?Number(found.slice(key.length+3)):def;};
 const picked=process.argv.find(x=>x.startsWith('--model='));
 const model=picked?picked.slice('--model='.length):'partnerAware';
 const r=study({cases:arg('cases',90),samples:arg('samples',14),from:arg('from',0),model});
 console.log(JSON.stringify(r,null,2));
}
module.exports={situation,position,finish,study};
