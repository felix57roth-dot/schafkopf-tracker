/* Wastl Botspiel 5.0 – eigenständige Offline-Spielverwaltung.
 * Vier sichtbare Sitzplätze, der Computer kennt bei seinen Entscheidungen
 * ausschließlich die eigene Hand, bisherige Stiche und offene Karten.
 * Die Ansagephase ist in V5.0 absichtlich eine vereinfachte Angebotsrunde
 * (Rufspiel < Wenz < Farbsolo), nicht die vollständige Palast-Reizordnung.
 */
(function(root,factory){
 const E=(typeof module==='object'&&module.exports)?require('./wastl-engine.js'):root.WastlEngine;
 const P=(typeof module==='object'&&module.exports)?require('./wastl-policy.js'):root.WastlPolicy;
 const api=factory(E,P);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WastlBots=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,P){
 'use strict';
 const SEATS=E.SEATS, SUITS=E.SUITS, STR=['rufspiel','wenz','solo'];
 const PRIORITY={rufspiel:1,wenz:2,solo:3};
 const SUIT_LABEL={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'};
 const rank=x=>E.parse(x).rank;
 const isTrump=(c,g)=>E.isTrump(c,g);
 function deal(random=Math.random){
  const deck=[...E.FULL];for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return Object.fromEntries(SEATS.map((s,i)=>[s,deck.slice(i*8,i*8+8)]));
 }
 function bidOptions(hand,top=null){
  const options=[];const min=top?.priority||0;
  if(min<1)for(const s of ['eichel','gras','schell']){
    const called=s+'-A';
    if(!hand.includes(called)&&hand.some(c=>E.colorClass(c,{type:'rufspiel'})===s))options.push({type:'rufspiel',calledSuit:s,priority:1,label:'Rufspiel '+SUIT_LABEL[s]});
  }
  if(min<2)options.push({type:'wenz',priority:2,label:'Wenz'});
  if(min<3)for(const s of SUITS)options.push({type:'solo',trumpSuit:s,priority:3,label:'Farbsolo '+SUIT_LABEL[s]});
  return options;
 }
 function bidStrength(hand,offer){
  const g={type:offer.type, trumpSuit:offer.trumpSuit||'herz', calledSuit:offer.calledSuit};
  const tr=hand.filter(c=>isTrump(c,g));
  const aces=hand.filter(c=>rank(c)==='A').length;
  const tens=hand.filter(c=>rank(c)==='10').length;
  const o=hand.filter(c=>rank(c)==='O').length,u=hand.filter(c=>rank(c)==='U').length;
  if(offer.type==='wenz')return u*2.9+aces*1.1+tens*.45+(hand.includes('eichel-U')?1.7:0)+(hand.includes('gras-U')?1:0);
  if(offer.type==='solo')return tr.length*.93+o*.36+u*.33+aces*.65+(tr.some(c=>rank(c)==='A')?.6:0);
  const nontrump=hand.filter(c=>!isTrump(c,g));
  return tr.length*.6+o*.4+u*.35+aces*.45+(nontrump.some(c=>rank(c)==='A')?.4:0)+(nontrump.length>0?.2:0);
 }
 function botBid(hand,top,random=Math.random){
  const opts=bidOptions(hand,top);
  // Die rohen Punktzahlen der Spielarten haben unterschiedliche Skalen.
  // Deshalb eine Ansage nach ihrem Abstand zur jeweiligen Hürdenstärke
  // wählen, nicht automatisch Wenz wegen seines höheren Rohwerts.
  const target={rufspiel:5.8,wenz:9.6,solo:8.4};
  const ranked=opts.map(o=>({...o,margin:bidStrength(hand,o)-target[o.type]}))
    .sort((a,b)=>b.margin-a.margin);
  const best=ranked[0];
  if(!best||best.margin<(random()-.5)*.8)return null;
  const {margin,...choice}=best;return choice;
 }
 function checkHands(hands){
  if(!hands||SEATS.some(s=>!Array.isArray(hands[s])||hands[s].length!==8))throw Error('Jeder Platz braucht acht Karten.');
  const all=SEATS.flatMap(s=>hands[s]);if(new Set(all).size!==32||all.some(c=>!E.parse(c)))throw Error('Die 32 Anfangskarten sind nicht eindeutig.');
 }
 function create({mySeat='vh',hands=null,random=Math.random}={}){
  if(!SEATS.includes(mySeat))throw Error('Ungültiger Sitzplatz.');
  const initial=hands?structuredHands(hands):deal(random);checkHands(initial);
  const game={version:5,phase:'bidding',started:new Date().toISOString(),mySeat,initialHands:structuredHands(initial),hands:structuredHands(initial),bids:[],bidCursor:0,best:null,type:null,calledSuit:'eichel',trumpSuit:'herz',declarerSeat:null,leaderSeat:'vh',turn:null,current:[],tricks:[],lastTrick:null};
  return advance(game,random);
 }
 function structuredHands(h){return Object.fromEntries(SEATS.map(s=>[s,[...h[s]]]));}
 function submitBid(g,choice,random=Math.random){
  if(g.phase!=='bidding'||SEATS[g.bidCursor]!==g.mySeat)throw Error('Du bist gerade nicht mit der Ansage an der Reihe.');
  if(choice){
   const opt=bidOptions(g.hands[g.mySeat],g.best).find(x=>x.type===choice.type&&x.trumpSuit===choice.trumpSuit&&x.calledSuit===choice.calledSuit);
   if(!opt)throw Error('Diese Ansage ist mit deiner Hand oder nach der vorigen Ansage nicht zulässig.');
   g.best={...opt,seat:g.mySeat};
  }
  g.bids.push({seat:g.mySeat,offer:choice?{...g.best}:null});g.bidCursor++;
  return advance(g,random);
 }
 function advance(g,random=Math.random){
  let guard=0;
  while(g.phase==='bidding'&&g.bidCursor<4&&SEATS[g.bidCursor]!==g.mySeat){
   if(++guard>5)throw Error('Ansage hängt.');
   const seat=SEATS[g.bidCursor];const choice=botBid(g.hands[seat],g.best,random);
   if(choice)g.best={...choice,seat};
   g.bids.push({seat,offer:choice?{...choice,seat}:null});g.bidCursor++;
  }
  if(g.phase==='bidding'&&g.bidCursor===4){
   if(!g.best){g.phase='noGame';return g;}
   g.type=g.best.type;g.trumpSuit=g.best.trumpSuit||'herz';g.calledSuit=g.best.calledSuit||'eichel';g.declarerSeat=g.best.seat;
   g.phase='playing';g.turn='vh';g.leaderSeat='vh';g.current=[];
  }
  if(g.phase==='playing')runBots(g,random);
  return g;
 }
 function playable(g,seat){
  if(g.phase!=='playing'||g.turn!==seat)return [];
  return E.legalMoves(g.hands[seat],g.current[0]?.card||null,g,{past:g.tricks,trickIndex:g.tricks.length});
 }
 function put(g,seat,card){
  if(g.phase!=='playing'||g.turn!==seat)throw Error('Dieser Spieler ist gerade nicht dran.');
  if(!playable(g,seat).includes(card))throw Error('Diese Karte darfst du jetzt nicht legen (Bedienpflicht).');
  g.hands[seat].splice(g.hands[seat].indexOf(card),1);
  g.current.push({seat,card});
  if(g.current.length===4){
   const cards=g.current.map(x=>x.card);
   const i=E.winnerIndex(cards,g),winnerSeat=E.nextSeat(g.leaderSeat,i),eyes=E.trickEyes(cards);
   const trick={cards,leaderSeat:g.leaderSeat,winnerSeat,eyes,winner:'pending'};
   g.tricks.push(trick);g.lastTrick=trick;
   g.current=[];g.leaderSeat=winnerSeat;g.turn=winnerSeat;g.phase=g.tricks.length===8?'done':'trickDone';
  }else g.turn=E.nextSeat(seat);
  return g;
 }
 function runBots(g,random=Math.random){
  let guard=0;
  while(g.phase==='playing'&&g.turn!==g.mySeat){
   if(++guard>36)throw Error('Bot-Spielzug endet nicht.');
   const seat=g.turn,hand=g.hands[seat],cards=g.current.map(x=>x.card);
   const view={type:g.type,trumpSuit:g.trumpSuit,calledSuit:g.calledSuit,declarerSeat:g.declarerSeat};
   const options=playable(g,seat);
   let chosen;
   try{chosen=P.choose(hand,cards,seat,g.leaderSeat,view,{past:g.tricks},random);}catch{chosen=null;}
   if(!options.includes(chosen))chosen=options[0];
   put(g,seat,chosen);
  }
  return g;
 }
 function play(g,card,random=Math.random){put(g,g.mySeat,card);return advance(g,random);}
 function nextTrick(g,random=Math.random){
  if(g.phase!=='trickDone')throw Error('Der Stich ist noch nicht abgeschlossen.');
  g.phase='playing';return advance(g,random);
 }
 function toRecord(g){
  if(g.phase!=='done'||g.tricks.length!==8)throw Error('Nur abgeschlossene Partien speichern.');
  const partner=g.type==='rufspiel'?SEATS.find(seat=>g.initialHands[seat].includes(g.calledSuit+'-A')):null;
  const team=g.type==='rufspiel'?[g.declarerSeat,partner]:[g.declarerSeat];
  const record={id:'bots-'+g.started.replace(/\W/g,'')+'-'+Math.random().toString(36).slice(2,8),source:'bot',type:g.type,trumpSuit:g.trumpSuit,calledSuit:g.calledSuit,role:team.includes(g.mySeat)?'declarer':'defender',mySeat:g.mySeat,firstSeat:'vh',declarerSeat:g.declarerSeat,partnerSeat:partner,partnerMode:g.type==='rufspiel'?'auto':'manual',seatNames:Object.fromEntries(SEATS.map(s=>[s,s===g.mySeat?'Du':'Bot '+(SEATS.indexOf(s)+1)])),started:g.started,finished:new Date().toISOString(),initialHandsSource:'bots-known-deal-v5.0',initialHands:structuredHands(g.initialHands),linkedGameId:null,tricks:g.tricks.map(t=>({...t,cards:[...t.cards],winner:team.includes(t.winnerSeat)===(team.includes(g.mySeat))?'us':'them'}))};
  const result=E.review(record);
  if(!result.ok)throw Error('Die Partie konnte nicht regelkonform gespeichert werden: '+(result.errors[0]?.message||'Unbekannter Fehler'));
  return record;
 }
 return Object.freeze({VERSION:'5.0.0',SEATS,deal,bidOptions,bidStrength,create,submitBid,advance,play,playable,nextTrick,toRecord});
});
