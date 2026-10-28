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
 function bidOptions(hand,top=null,seat=null){
  const options=[],min=top?.priority||0;
  // Bei gleichrangigen Spielen erhält die früher sitzende Person das Spielrecht.
  const hasSeatPriority=top&&seat&&SEATS.indexOf(seat)<SEATS.indexOf(top.seat);
  const allowed=priority=>priority>min||(priority===min&&hasSeatPriority);
  if(allowed(PRIORITY.rufspiel)){
   for(const s of ['eichel','gras','schell']){
    if(!hand.includes(s+'-A')&&hand.some(c=>E.colorClass(c,{type:'rufspiel'})===s))
     options.push({type:'rufspiel',calledSuit:s,priority:1,label:'Rufspiel '+SUIT_LABEL[s]});
   }
  }
  if(allowed(PRIORITY.wenz))options.push({type:'wenz',priority:2,label:'Wenz'});
  if(allowed(PRIORITY.solo))for(const s of SUITS)options.push({type:'solo',trumpSuit:s,priority:3,label:'Solo '+SUIT_LABEL[s]});
  return options;
 }
 // Alle Spielarten werden mit vergleichbaren Sicherheitsmargen bewertet.
 // Keine festen Zufallsquoten für Rufspiel/Wenz/Solo: die Karten entscheiden.
 const BID_THRESHOLDS=Object.freeze({rufspiel:5.5,wenz:7.5,solo:6.8});
 function bidStrength(hand,offer){
  const game={type:offer.type,trumpSuit:offer.trumpSuit||'herz',calledSuit:offer.calledSuit};
  const parsed=hand.map(card=>({...E.parse(card),card}));
  const r=rankName=>parsed.filter(c=>c.rank===rankName).length;
  const O=r('O'),U=r('U'),aces=r('A'),tens=r('10');
  const tr=hand.filter(card=>E.isTrump(card,game));
  if(offer.type==='rufspiel'){
   const topCards=['eichel-O','gras-O','herz-O','schell-O','eichel-U','gras-U'];
   const strongTrumps=hand.filter(c=>topCards.includes(c)).length;
   const redTrumps=parsed.filter(c=>c.suit==='herz'&&c.rank!=='O'&&c.rank!=='U').length;
   const called=parsed.filter(c=>c.suit===offer.calledSuit&&c.rank!=='O'&&c.rank!=='U');
   if(!called.length)return -100;
   return O*1.55+U*.92+redTrumps*.33+aces*.53+tens*.27+
    strongTrumps*.42+(called.some(c=>c.rank==='10')?.15:0)+
    (called.length>1?.22:0)+(tr.length>=5?.45:0);
  }
  if(offer.type==='wenz'){
   // Zwei Unter sind Mindestvoraussetzung; Eichel- und Gras-Unter sind
   // deutlich wertvoller als Herz- und Schellen-Unter.
   if(U<2)return -100;
   const weights={eichel:3.3,gras:2.65,herz:1.6,schell:1.1};
   return parsed.filter(c=>c.rank==='U').reduce((n,c)=>n+weights[c.suit],0)+
    aces*1.02+tens*.38+(U>=3?.6:0);
  }
  if(offer.type==='solo'){
   // Farbsolo nur mit tragfähiger Trumpfstruktur, nicht allein mit Assen.
   if(tr.length<5&&!(O>=3&&tr.length>=4))return -100;
   if(O+U<2&&tr.length<6)return -100;
   const trumpRanks={A:1.65,'10':1.12,K:.72,'9':.42,'8':.25,'7':.25};
   const suitPoints=parsed.filter(c=>c.suit===offer.trumpSuit&&c.rank!=='O'&&c.rank!=='U')
    .reduce((n,c)=>n+(trumpRanks[c.rank]||0),0);
   const highO=hand.filter(c=>['eichel-O','gras-O'].includes(c)).length;
   return O*1.25+U*.82+suitPoints+aces*.45+tens*.25+highO*.4+(tr.length>=6?.65:0);
  }
  return -100;
 }
 function botBid(hand,top,random=Math.random,seat=null){
  const offers=bidOptions(hand,top,seat).map(offer=>({
   ...offer,margin:bidStrength(hand,offer)-BID_THRESHOLDS[offer.type]
  })).sort((a,b)=>b.margin-a.margin);
  const best=offers[0];
  // Leichte Unsicherheit an der Spielbarkeitsgrenze. Keine Zufallsansage
  // mit objektiv schwacher Hand; hohe Sicherheitsmargen werden bevorzugt.
  if(!best||best.margin<(random()-.5)*.45)return null;
  const {margin,...offer}=best;
  return offer;
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
   bids:[],bidCursor:0,auctionStage:'opening',activeBidders:[],auctionQueue:[],best:null,type:null,calledSuit:'eichel',trumpSuit:'herz',
   declarerSeat:null,leaderSeat:'vh',turn:null,current:[],tricks:[],lastTrick:null,lastAction:null
  };
  return game;
 }
 // Jede der vier Personen erklärt zunächst ihre Spielabsicht. Bieten
 // mehrere, dürfen bereits interessierte Spieler bei einer Überbietung
 // nochmals erhöhen. Wer "Weiter" sagt, ist endgültig raus.
 function bidderSeat(g){
  if(g.phase!=='bidding'&&g.phase!=='chooseGame')return null;
  if((g.auctionStage||'opening')==='duel')return (g.auctionQueue||[])[0]||null;
  return g.bidCursor<4?SEATS[g.bidCursor]:null;
 }
 function chooseToPlay(g){
  if(g.phase!=='bidding'||bidderSeat(g)!==g.mySeat)
   throw Error('Du bist gerade nicht mit der Ansage an der Reihe.');
  if(!bidOptions(g.hands[g.mySeat],g.best,g.mySeat).length)
   throw Error('Ein höherwertiges Spiel kannst du gerade nicht ansagen.');
  g.phase='chooseGame';return g;
 }
 function cancelChoice(g){
  if(g.phase!=='chooseGame')throw Error('Es gibt gerade keine Spielwahl.');
  g.phase='bidding';return g;
 }
 function biddersAfter(g,seat){
  return [1,2,3].map(n=>E.nextSeat(seat,n))
   .filter(s=>(g.activeBidders||[]).includes(s));
 }
 function finishBidding(g){
  if(g.phase!=='bidding')return g;
  if((g.auctionStage||'opening')==='opening'){
   if(g.bidCursor<4)return g;
   const interested=g.activeBidders?.length
    ?g.activeBidders:[...new Set(g.bids.filter(x=>x.offer).map(x=>x.seat))];
   g.activeBidders=[...interested];
   if(!interested.length){g.phase='noGame';return g;}
   if(interested.length>1){
    g.auctionStage='duel';
    g.auctionQueue=biddersAfter(g,g.best.seat);
    if(g.auctionQueue.length)return g;
   }
  }else if(g.auctionQueue?.length)return g;
  // Extra Anzeigeschritt: Der letzte Ausruf und das endgültige Spiel
  // sind sichtbar, bevor die erste Karte gespielt wird.
  g.auctionStage='result';g.auctionQueue=[];g.phase='biddingResult';
  return g;
 }
 function startPlay(g){
  if(g.phase!=='biddingResult'||!g.best)
   throw Error('Die Ansagerunde ist noch nicht abgeschlossen.');
  g.type=g.best.type;g.trumpSuit=g.best.trumpSuit||'herz';
  g.calledSuit=g.best.calledSuit||'eichel';g.declarerSeat=g.best.seat;
  g.phase='playing';g.turn='vh';g.leaderSeat='vh';g.current=[];g.lastAction=null;
  return g;
 }
 function recordBid(g,seat,choice){
  // Übernahme einer vor dem Update gespeicherten laufenden Ansagerunde.
  if(!Array.isArray(g.activeBidders))
   g.activeBidders=[...new Set((g.bids||[]).filter(x=>x.offer).map(x=>x.seat))];
  if(!Array.isArray(g.auctionQueue))g.auctionQueue=[];
  if(!g.auctionStage)g.auctionStage='opening';
  if(g.phase!=='bidding')throw Error('Ansagerunde nicht aktiv.');
  if(bidderSeat(g)!==seat)throw Error('Dieser Spieler ist gerade nicht dran.');
  const stage=g.auctionStage||'opening';
  if(choice){
   const valid=bidOptions(g.hands[seat],g.best,seat).find(x=>
    x.type===choice.type&&x.trumpSuit===choice.trumpSuit&&x.calledSuit===choice.calledSuit);
   if(!valid)throw Error('Das Spiel ist nicht höherwertig oder nicht zulässig.');
   g.best={...valid,seat};
   if(!(g.activeBidders||[]).includes(seat))g.activeBidders.push(seat);
  }else if(stage==='duel'){
   g.activeBidders=g.activeBidders.filter(s=>s!==seat);
  }
  g.bids.push({seat,offer:choice?{...g.best}:null,stage});
  g.lastAction={seat,text:choice?'Spiele '+g.best.label+'!':'Weiter!',kind:'bid'};
  if(stage==='opening')g.bidCursor++;
  else if(choice){
   // Jeder weiterhin interessierte Mitspieler erhält nach einer neuen
   // höheren Ansage wieder eine Gelegenheit zu reagieren.
   g.auctionQueue=biddersAfter(g,seat);
  }else{
   g.auctionQueue.shift();
  }
  return finishBidding(g);
 }
 function submitBid(g,choice){
  if(!['bidding','chooseGame'].includes(g.phase)||bidderSeat(g)!==g.mySeat)
   throw Error('Du bist gerade nicht mit der Ansage an der Reihe.');
  g.phase='bidding';return recordBid(g,g.mySeat,choice);
 }
 // Ein Bot sagt bzw. legt immer exakt einmal je Aufruf.
 function stepBot(g,random=Math.random){
  if(g.phase==='bidding'){
   const seat=bidderSeat(g);
   if(!seat)return finishBidding(g);
   if(seat===g.mySeat)return g;
   const choice=botBid(g.hands[seat],g.best,random,seat);
   return recordBid(g,seat,choice);
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
 return Object.freeze({VERSION:'6.6.0',SEATS,PEOPLE,deal,sortHand,personAt,bidOptions,bidStrength,
  create,bidderSeat,chooseToPlay,cancelChoice,submitBid,stepBot,advance,finishBidding,startPlay,play,playable,nextTrick,nextRound,result,toRecord});
});
