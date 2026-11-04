/* Wastl 8.1: Regressionstests fuer simulationsbasierte Spielansagen.
 * Keine externen Daten oder Bibliotheken.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const B=require('../wastl-bots.js');
const Bid=require('../wastl-bid-brain.js');
function rand(seed){
 let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};
}
const strong=['eichel-O','gras-O','herz-O','schell-O','eichel-U','gras-U','herz-U','schell-U'];
const weak=['eichel-7','eichel-8','eichel-9','gras-7','gras-8','gras-9','schell-7','schell-8'];
test('Offensichtlich starke Trumpfhand kann ein Solo begruenden',()=>{
 const r=Bid.analyze({seat:'vh',hand:strong},{samples:18,seed:213});
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.offer?.type,'solo');
 assert.ok(r.estimates.some(x=>x.type==='solo'&&x.winRate>=.9));
});
test('Schwache Hand wird trotz formell erlaubter Spielarten nicht zum Spiel gezwungen',()=>{
 const r=Bid.analyze({seat:'vh',hand:weak},{samples:18,seed:213});
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.offer,null);
});
test('Gleiche Hand, gleiche Stichproben und gleicher Seed ergeben gleiche Ansage',()=>{
 const hand=B.deal(rand(87123)).mh;
 const opts={samples:12,seed:513};
 const a=Bid.analyze({seat:'mh',hand},opts);
 const b=Bid.analyze({seat:'mh',hand},opts);
 assert.deepEqual(a,b);
 assert.equal(a.calibrated,false);
});
test('Ansageberechnung verwendet nur die eigene Hand und bekannte Gebote',()=>{
 const g=B.create({mySeat:'g',random:rand(50123)});
 const hand=[...g.hands.vh],input={seat:'vh',hand,top:null};
 assert.deepEqual(Object.keys(input).sort(),['hand','seat','top']);
 const first=Bid.analyze(input,{samples:12,seed:447});
 g.hands.mh=['gras-7'];g.hands.hh=['schell-7'];g.initialHands.g=['eichel-7'];
 const second=Bid.analyze(input,{samples:12,seed:447});
 assert.deepEqual(first,second);
});
test('Hoehere Ansage begrenzt gueltige Angebote korrekt',()=>{
 const r=Bid.analyze({seat:'vh',hand:strong,top:{priority:2}},{samples:12,seed:12});
 assert.equal(r.ok,true);
 assert.ok(r.estimates.every(x=>x.priority>2));
 assert.ok(!r.offer||r.offer.priority>2);
 const noOffer=Bid.analyze({seat:'vh',hand:strong,top:{priority:3}},{samples:12,seed:12});
 assert.equal(noOffer.ok,true);
 assert.equal(noOffer.offer,null);
});
test('Ungueltige oder doppelte Karten werden ohne Ansage abgelehnt',()=>{
 assert.equal(Bid.analyze({seat:'vh',hand:[...strong.slice(0,7),'eichel-O']}).ok,false);
 assert.equal(Bid.analyze({seat:'falsch',hand:strong}).ok,false);
 assert.equal(Bid.analyze({seat:'vh',hand:['fehler',...strong.slice(1)]}).ok,false);
});
test('Bidding im Spiel nutzt nur regelkonforme Worker-Vorschlaege',()=>{
 const g=B.create({mySeat:'g',random:rand(701)});
 const offered=B.bidOptions(g.hands.vh,null,'vh')[0];
 assert.ok(offered);
 B.stepBot(g,rand(3),{bidReady:true,offer:offered});
 assert.equal(g.bids[0].intent,true);
 assert.equal(g.botBidBrainActions,1);
 assert.equal(g.botBidBrainVersion,'8.1.0');
 g.auctionStage='declaration';g.auctionQueue=['vh'];g.activeBidders=['vh'];g.bidCursor=4;
 B.stepBot(g,rand(4),{bidReady:true,offer:offered});
 assert.equal(g.best.type,offered.type);
 assert.equal(g.best.priority,offered.priority);
});
test('Fremde oder zu niedrige Ansage darf nicht als hoehere Ansage durchgehen',()=>{
 const g=B.create({mySeat:'g',random:rand(10)});
 g.auctionStage='declaration';g.auctionQueue=['vh'];g.activeBidders=['vh'];g.bidCursor=4;
 g.best={type:'solo',priority:3,seat:'mh'};
 const old={...g.best};
 B.stepBot(g,rand(0),{bidReady:true,offer:{type:'rufspiel',calledSuit:'eichel',priority:1,label:'Falsch'}});
 assert.deepEqual(g.best,old);
});
test('Worker berechnet Angebote offscreen und faellt bei Problemen auf die alte KI zurueck',()=>{
 const worker=fs.readFileSync(path.join(__dirname,'../wastl-bot-worker.js'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../wastl-bots-ui.js'),'utf8');
 assert.match(worker,/wastl-bid-brain\.js/);
 assert.match(worker,/WastlBidBrain\.analyze\(data\.view/);
 assert.match(ui,/function prepareBotBid\(/);
 assert.match(ui,/else if\(botBid\)prepareBotBid\(g\)/);
 assert.match(ui,/bidReady:true,offer:botJob\.offer/);
 assert.ok(!/initialHands/.test(worker));
});
