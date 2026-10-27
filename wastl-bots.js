/* Wastl Botspiel 6.0: fortlaufender, lokaler Schafkopftisch.
 * Aktionen der Mitspieler werden einzeln vom UI-Taktgeber ausgelöst.
 * Tischmitspieler bleiben auf ihrem Stuhl; Vorhand/Mittelhand/Hinterhand/Geber
 * rotieren nach jeder Runde im Uhrzeigersinn. Bots kennen nur ihre Karten und
 * offen liegende Stiche. Keine Änderung an Kassenbuch oder anderen Daten.
 */
(function(root,factory){
 const E=(typeof module==='object'&&module.exports)?require('./wastl-engine.js'):root.WastlEngine;
 const P=(typeof module==='object'&&module.exports)?require('./wastl-policy.js'):root.WastlPolicy;
 const api=factory(E,P);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WastlBots=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P){
 'use strict';
 const SEATS=E.SEATS,SUITS=E.SUITS;
 const PRIORITY={rufspiel:1,wenz:2,solo:3};
 const SUIT_LABEL={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schellen'};
 const PEOPLE=Object.freeze([
  {id:'you',name:'Du',portrait:null},
  {id:'resi',name:'Resi',portrait:'./players/resi_sitzend.png'},
  {id:'sepp',name:'Sepp',portrait:'./players/sepp_sitzend.png'},
  {id:'xaver',name:'Xaver',portrait:'./players/xaver_sitzend.png'}
 ]);
 const rank=c=>E.parse(c).rank;
 const copyHands=h=>Object.fromEntries(SEATS.map(s=>[s,[...h[s]]]));
 function personAt(g,seat){
  const offset=(SEATS.indexOf(seat)-SEATS.indexOf(g.mySeat)+4)%4;
  return PEOPLE[offset];
 }
 function deal(random=Math.random){
  const deck=[...E.FULL];
  for(let i=deck.length-1;i>0;i--){
   const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));
   [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return Object.fromEntries(SEATS.map((seat,i)=>[seat,deck.slice(i*8,i*8+8)]));
 }
 function sortHand(hand,game={type:'rufspiel'}){
  const g=game.type?game:{type:'rufspiel'};
  const core=g.type==='wenz'?['U']:['O','U'];
  const trump=core.flatMap(r=>SUITS.map(s=>s+'-'+r));
  if(g.type!=='wenz'){
   const suit=g.type==='solo'?g.trumpSuit:'herz';
   trump.push(...['A','10','K','9','8','7'].map(r=>suit+'-'+r));
  }
  const other=['A','10','K','O','U','9','8','7'];
  function key(card){
   if(E.isTrump(card,g)){
    const i=trump.indexOf(card);
    return i>=0?i:100;
   }
   const p=E.parse(card);
   return 100+SUITS.indexOf(p.suit)*10+other.indexOf(p.rank);
  }
  return [...hand].sort((a,b)=>key(a)-key(b));
 }
 function bidOptions(hand,top=null){
  const options=[],min=top?.priority||0;
  if(min<PRIORITY.rufspiel){
   for(const s of ['eichel','gras','schell']){
    if(!hand.includes(s+'-A')&&hand.some(c=>E.colorClass(c,{type:'rufspiel'})===s))
     options.push({type:'rufspiel',calledSuit:s,priority:1,label:'Rufspiel '+SUIT_LABEL[s]});
   }
  }
  if(min<PRIORITY.wenz)options.push({type:'wenz',priority:2,label:'Wenz'});
  if(min<PRIORITY.solo)for(const s of SUITS)options.push({type:'solo',trumpSuit:s,priority:3,label:'Solo '+SUIT_LABEL[s]});
  return options;
 }
 function bidStrength(hand,offer){
  const g={type:offer.type,trumpSuit:offer.trumpSuit||'herz',calledSuit:offer.calledSuit};
  const tr=hand.filter(c=>E.isTrump(c,g));
  const aces=hand.filter(c=>rank(c)==='A').length,tens=hand.filter(c=>rank(c)==='10').length;
  const o=hand.filter(c=>rank(c)==='O').length,u=hand.filter(c=>rank(c)==='U').length;
  if(offer.type==='wenz')return u*2.9+aces*1.1+tens*.45+(hand.includes('eichel-U')?1.7:0)+(hand.includes('gras-U')?1:0);
  if(offer.type==='solo')return tr.length*.93+o*.36+u*.33+aces*.65+(tr.some(c=>rank(c)==='A')?.6:0);
  const nontrump=hand.filter(c=>!E.isTrump(c,g));
  return tr.length*.6+o*.4+u*.35+aces*.45+(nontrump.some(c=>rank(c)==='A')?.4:0)+(nontrump.length>0?.2:0);
 }
 function botBid(hand,top,random=Math.random){
  const thresholds={rufspiel:5.8,wenz:9.6,solo:8.4};
  const offers=bidOptions(hand,top).map(offer=>({...offer,margin:bidStrength(hand,offer)-thresholds[offer.type]}))
   .sort((a,b)=>b.margin-a.margin);
  const best=offers[0];
  if(!best||best.margin<(random()-.5)*.8)return null;
  const {margin,...offer}=best;return offer;
 }
 function checkHands(hands){
  if(!hands||SEATS.some(s=>!Array.isArray(hands[s])||hands[s].length!==8))throw Error('Jeder Platz braucht acht Karten.');
  const all=SEATS.flatMap(s=>hands[s]);
  if(new Set(all).size!==32||all.some(c=>!E.parse(c)))throw Error('Die 32 Anfangskarten sind nicht eindeutig.');
 }
 function create({mySeat=null,hands=null,random=Math.random,round=1,session=null}={}){
  if(mySeat===null)mySeat=SEATS[Math.min(3,Math.floor(random()*4))];
  if(!SEATS.includes(mySeat))throw Error('Ungültiger Sitzplatz.');
  const initial=hands?copyHands(hands):deal(random);checkHands(initial);
  const game={
   version:6,phase:'bidding',started:new Date().toISOString(),round,session:session||{played:0,won:0,lost:0,passed:0},
   mySeat,initialHands:copyHands(initial),hands:copyHands(initial),
   bids:[],bidCursor:0,best:null,type:null,calledSuit:'eichel',trumpSuit:'herz',
   declarerSeat:null,leaderSeat:'vh',turn:null,current:[],tricks:[],lastTrick:null,lastAction:null
  };
  return game;
 }
 function chooseToPlay(g){
  if(g.phase!=='bidding'||SEATS[g.bidCursor]!==g.mySeat)throw Error('Du bist gerade nicht mit der Ansage an der Reihe.');
  if(!bidOptions(g.hands[g.mySeat],g.best).length)throw Error('Kein höheres Spiel mehr möglich.');
  g.phase='chooseGame';return g;
 }
 function cancelChoice(g){
  if(g.phase!=='chooseGame')throw Error('Es gibt gerade keine Spielwahl.');
  g.phase='bidding';return g;
 }
 function finishBidding(g){
  if(g.phase!=='bidding'||g.bidCursor!==4)return g;
  if(!g.best){g.phase='noGame';return g;}
  g.type=g.best.type;g.trumpSuit=g.best.trumpSuit||'herz';
  g.calledSuit=g.best.calledSuit||'eichel';g.declarerSeat=g.best.seat;
  g.phase='playing';g.turn='vh';g.leaderSeat='vh';g.current=[];
  return g;
 }
 function submitBid(g,choice){
  if(!['bidding','chooseGame'].includes(g.phase)||SEATS[g.bidCursor]!==g.mySeat)
   throw Error('Du bist gerade nicht mit der Ansage an der Reihe.');
  if(choice){
   const opt=bidOptions(g.hands[g.mySeat],g.best).find(x=>
     x.type===choice.type&&x.trumpSuit===choice.trumpSuit&&x.calledSuit===choice.calledSuit);
   if(!opt)throw Error('Diese Ansage ist mit deiner Hand oder nach der vorigen Ansage nicht zulässig.');
   g.best={...opt,seat:g.mySeat};
  }
  g.bids.push({seat:g.mySeat,offer:choice?{...g.best}:null});
  g.lastAction={seat:g.mySeat,text:choice?'Spiele '+g.best.label+'!':'Weiter!',kind:'bid'};
  g.bidCursor++;g.phase='bidding';
  return finishBidding(g);
 }
 // Genau EINE Botaktion pro Aufruf. Auf den nächsten Spieler wird erst
 // nach der im UI sichtbaren Sprechblasen-/Kartenspielpause gewechselt.
 function stepBot(g,random=Math.random){
  if(g.phase==='bidding'){
   if(g.bidCursor>=4)return finishBidding(g);
   const seat=SEATS[g.bidCursor];
   if(seat===g.mySeat)return g;
   const choice=botBid(g.hands[seat],g.best,random);
   if(choice)g.best={...choice,seat};
   g.bids.push({seat,offer:choice?{...choice,seat}:null});
   g.lastAction={seat,text:choice?'Spiele '+choice.label+'!':'Weiter!',kind:'bid'};
   g.bidCursor++;
   return finishBidding(g);
  }
  if(g.phase==='playing'&&g.turn!==g.mySeat){
   const seat=g.turn,hand=g.hands[seat],cards=g.current.map(x=>x.card);
   const view={type:g.type,trumpSuit:g.trumpSuit,calledSuit:g.calledSuit,declarerSeat:g.declarerSeat};
   const options=playable(g,seat);
   if(!options.length)throw Error('Bot hat keine spielbare Karte.');
   let chosen;
   try{chosen=P.choose(hand,cards,seat,g.leaderSeat,view,{past:g.tricks},random);}catch{chosen=null;}
   if(!options.includes(chosen))chosen=options[0];
   put(g,seat,chosen);
   g.lastAction={seat,text:'Legt eine Karte',card:chosen,kind:'card'};
  }
  return g;
 }
 // Öffentliche, rückwärtskompatible Einzelschrittfunktion.
 function advance(g,random=Math.random){return stepBot(g,random);}
 function playable(g,seat){
  if(g.phase!=='playing'||g.turn!==seat)return [];
  return E.legalMoves(g.hands[seat],g.current[0]?.card||null,g,
   {past:g.tricks,trickIndex:g.tricks.length});
 }
 function put(g,seat,card){
  if(g.phase!=='playing'||g.turn!==seat)throw Error('Dieser Spieler ist gerade nicht dran.');
  if(!playable(g,seat).includes(card))throw Error('Diese Karte darfst du nicht legen (Bedienpflicht).');
  g.hands[seat].splice(g.hands[seat].indexOf(card),1);
  g.current.push({seat,card});
  if(g.current.length===4){
   const cards=g.current.map(x=>x.card);
   const i=E.winnerIndex(cards,g),winnerSeat=E.nextSeat(g.leaderSeat,i),eyes=E.trickEyes(cards);
   const trick={cards,leaderSeat:g.leaderSeat,winnerSeat,eyes,winner:'pending'};
   g.tricks.push(trick);g.lastTrick=trick;
   g.current=[];g.leaderSeat=winnerSeat;g.turn=winnerSeat;
   g.phase=g.tricks.length===8?'done':'trickDone';
  }else g.turn=E.nextSeat(seat);
  return g;
 }
 function play(g,card){
  put(g,g.mySeat,card);
  g.lastAction={seat:g.mySeat,text:'Karte gelegt',card,kind:'card'};
  return g;
 }
 function nextTrick(g){
  if(g.phase!=='trickDone')throw Error('Der Stich ist noch nicht abgeschlossen.');
  g.phase='playing';g.lastAction=null;return g;
 }
 function result(g){
  if(g.phase!=='done')return null;
  const partner=g.type==='rufspiel'?SEATS.find(s=>g.initialHands[s].includes(g.calledSuit+'-A')):null;
  const team=g.type==='rufspiel'?[g.declarerSeat,partner]:[g.declarerSeat];
  const eyes=g.tricks.filter(t=>team.includes(t.winnerSeat)).reduce((s,t)=>s+t.eyes,0);
  const myTeam=team.includes(g.mySeat);
  return {declarerEyes:eyes,partnerSeat:partner,win:myTeam?eyes>=61:eyes<61,myTeam};
 }
 function nextRound(g,random=Math.random){
  if(!['done','noGame'].includes(g?.phase))throw Error('Beende zunächst diese Runde.');
  const s={played:g.session?.played||0,won:g.session?.won||0,lost:g.session?.lost||0,passed:g.session?.passed||0};
  if(g.phase==='done'){const r=result(g);s.played++;if(r.win)s.won++;else s.lost++;}
  else s.passed++;
  // Der Geber rückt zum nächsten physischen Stuhl: jeder Teilnehmer
  // wird aus seiner bisherigen Spielposition eine Position zurückgesetzt.
  return create({mySeat:E.nextSeat(g.mySeat,-1),random,round:(g.round||1)+1,session:s});
 }
 function toRecord(g){
  if(g.phase!=='done'||g.tricks.length!==8)throw Error('Nur abgeschlossene Partien speichern.');
  const r=result(g),team=g.type==='rufspiel'?[g.declarerSeat,r.partnerSeat]:[g.declarerSeat];
  const record={
   id:'bots-'+g.started.replace(/\W/g,'')+'-'+Math.random().toString(36).slice(2,8),
   source:'bot',type:g.type,trumpSuit:g.trumpSuit,calledSuit:g.calledSuit,
   role:team.includes(g.mySeat)?'declarer':'defender',mySeat:g.mySeat,
   firstSeat:'vh',declarerSeat:g.declarerSeat,partnerSeat:r.partnerSeat,
   partnerMode:g.type==='rufspiel'?'auto':'manual',
   seatNames:Object.fromEntries(SEATS.map(s=>[s,personAt(g,s).name])),
   started:g.started,finished:new Date().toISOString(),
   initialHandsSource:'bots-known-deal-v6.0',initialHands:copyHands(g.initialHands),
   linkedGameId:null,round:g.round,
   tricks:g.tricks.map(t=>({...t,cards:[...t.cards],winner:team.includes(t.winnerSeat)===team.includes(g.mySeat)?'us':'them'}))
  };
  const review=E.review(record);
  if(!review.ok)throw Error('Die Partie konnte nicht regelkonform gespeichert werden: '+(review.errors[0]?.message||'Unbekannter Fehler'));
  return record;
 }
 return Object.freeze({VERSION:'6.2.0',SEATS,PEOPLE,deal,sortHand,personAt,bidOptions,bidStrength,
  create,chooseToPlay,cancelChoice,submitBid,stepBot,advance,play,playable,nextTrick,nextRound,result,toRecord});
});
