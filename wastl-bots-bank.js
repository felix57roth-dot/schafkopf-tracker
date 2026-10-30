/* Stammtisch 7.7: virtuelle Viererkasse. Unabhängig vom realen Kassenbuch. */
(function(root,factory){
 const api=factory(root.WastlEngine,root.WastlBots,root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.WastlBotBank=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,B,root){
 'use strict';
 const KEY='schafkopf-botkasse-v1',SETTINGS_KEY='schafkopf-tracker-v1',START_CENTS=1000;
 const PEOPLE=['you','resi','sepp','xaver'];
 const DEFAULT_RATES=Object.freeze({rufspiel:10,solo:50,schneider:10,schwarz:10,laeufer:10});
 const money=n=>(Number(n)/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 function initial(){return {version:1,balances:Object.fromEntries(PEOPLE.map(id=>[id,START_CENTS])),settled:{}};}
 function load(){
  let value=null;
  try{value=JSON.parse(root.localStorage?.getItem(KEY)||'null');}catch{}
  if(!value||value.version!==1||!value.balances||typeof value.balances!=='object')return initial();
  const balances={};
  for(const id of PEOPLE){
   const n=value.balances[id];
   balances[id]=Number.isSafeInteger(n)&&Math.abs(n)<1e9?n:START_CENTS;
  }
  const settled=value.settled&&typeof value.settled==='object'&&!Array.isArray(value.settled)?value.settled:{};
  return {version:1,balances,settled};
 }
 function store(data){
  if(!root.localStorage)throw Error('Der lokale Speicher ist nicht verfügbar.');
  root.localStorage.setItem(KEY,JSON.stringify(data));return data;
 }
 function readSettings(){
  let saved=null;
  try{saved=JSON.parse(root.localStorage?.getItem(SETTINGS_KEY)||'null');}catch{}
  const rates={...DEFAULT_RATES};
  for(const key of Object.keys(rates)){
   const value=Number(saved?.rates?.[key]);
   if(saved?.rates?.[key]!==undefined&&Number.isSafeInteger(value)&&value>=0&&value<=10000)rates[key]=value;
  }
  return {rates,rufMinRunners:Number(saved?.rules?.rufMinRunners)===4?4:3};
 }
 function roundId(g){return g?String(g.started||'')+'#'+String(g.round||1):'';}
 function quote(g){
  if(!g||g.phase!=='done'||g.tricks?.length!==8||!['rufspiel','solo','wenz'].includes(g.type)||!B||!E)return null;
  const r=B.result(g);
  if(!r||!Number.isFinite(r.declarerEyes)||r.declarerEyes<0||r.declarerEyes>120)return null;
  const declarerTeam=g.type==='rufspiel'?[g.declarerSeat,r.partnerSeat]:[g.declarerSeat];
  if(declarerTeam.some(s=>!E.SEATS.includes(s))||new Set(declarerTeam).size!==declarerTeam.length)return null;
  const declarerWon=r.declarerEyes>=61;
  const losingEyes=declarerWon?120-r.declarerEyes:r.declarerEyes;
  const {rates,rufMinRunners}=readSettings();
  const cards=declarerTeam.flatMap(seat=>g.initialHands?.[seat]||[]);
  // Gleiche Trumpf-Reihenfolge wie die Stich-Engine, ohne private Engine-API.
  const suits=['eichel','gras','herz','schell'];
  const order=(g.type==='wenz'?['U']:['O','U']).flatMap(rank=>suits.map(suit=>suit+'-'+rank));
  if(g.type!=='wenz'){
   const suit=g.type==='solo'?g.trumpSuit:'herz';
   order.push(...['A','10','K','9','8','7'].map(rank=>suit+'-'+rank));
  }
  const owned=new Set(cards);
  if(!order.length)return null;
  const withTop=owned.has(order[0]);
  let consecutive=0;
  for(const card of order){if(owned.has(card)!==withTop)break;consecutive++;}
  const max=g.type==='wenz'?4:14;
  const usedRunners=consecutive>=(g.type==='rufspiel'?rufMinRunners:g.type==='wenz'?2:3)?Math.min(consecutive,max):0;
  // Spielerpartei unter 31 Augen, Gegenpartei unter 30 Augen Schneider.
  const schneider=losingEyes<=(declarerWon?29:30);
  // Schwarz heißt keinen einzigen Stich – nicht lediglich null Augen.
  const losers=declarerWon?E.SEATS.filter(seat=>!declarerTeam.includes(seat)):declarerTeam;
  const schwarz=g.tricks.every(trick=>!losers.includes(trick.winnerSeat));
  const unitCents=(g.type==='rufspiel'?rates.rufspiel:rates.solo)+
   (schneider?rates.schneider:0)+(schwarz?rates.schwarz:0)+usedRunners*rates.laeufer;
  // Jede Legeransage verdoppelt, Schuss erneut x2 und Retour x4.
  const leger=Math.min(4,(g.knocks||[]).filter(item=>item.lay).length);
  const shotLevel=Math.min(2,Math.max(0,Number(g.shotLevel)||0));
  const legerFactor=2**leger,shotFactor=2**shotLevel,totalFactor=legerFactor*shotFactor;
  const finalUnitCents=unitCents*totalFactor;
  const deltas={};
  for(const seat of E.SEATS){
   const person=B.personAt(g,seat);
   if(!person||!PEOPLE.includes(person.id))return null;
   const isDeclarerTeam=declarerTeam.includes(seat);
   const winner=isDeclarerTeam===declarerWon;
   deltas[person.id]=(winner?1:-1)*finalUnitCents*(g.type==='rufspiel'?1:isDeclarerTeam?3:1);
  }
  if(Object.values(deltas).reduce((sum,n)=>sum+n,0)!==0)return null;
  return {id:roundId(g),type:g.type,unitCents:finalUnitCents,baseUnitCents:unitCents,leger,legerFactor,shotLevel,shotFactor,totalFactor,deltas,declarerWon,declarerEyes:r.declarerEyes,
   schneider,schwarz,runners:usedRunners,runnersKind:withTop?'mit':'ohne',
   tariff:{...rates},createdAt:new Date().toISOString()};
 }
 function receipt(g){return load().settled[roundId(g)]||null;}
 function settle(g){
  if(!g?.cashEligible||g.phase!=='done')return null;
  const current=load(),id=roundId(g);
  if(current.settled[id])return current.settled[id];
  const entry=quote(g);
  if(!entry)throw Error('Die Spielkasse konnte diese Partie nicht regelkonform abrechnen.');
  for(const person of PEOPLE){
   const next=current.balances[person]+entry.deltas[person];
   if(!Number.isSafeInteger(next))throw Error('Das Guthaben überschreitet den zulässigen Bereich.');
   current.balances[person]=next;
  }
  current.settled[id]=entry;
  store(current); // Salden und bezahlte Spiel-ID in einem lokalen Schreibvorgang
  return entry;
 }
 function reset(){
  const previous=load();
  return store({version:1,balances:Object.fromEntries(PEOPLE.map(id=>[id,START_CENTS])),settled:previous.settled});
 }
 return Object.freeze({VERSION:'7.9.0',KEY,START_CENTS,PEOPLE,load,reset,readSettings,money,quote,settle,receipt,roundId});
});
