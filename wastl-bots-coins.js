/* Schafkopf-Stammtisch 7.11: Guthabenschale mit exakter Münzstückelung.
 * Die Spielkasse bleibt einzige Quelle für sämtliche Beträge.
 * Bei sehr vielen Münzen werden Stapel mit echter Stückzahl beschriftet.
 */
(function(w){'use strict';
const VAL=[200,100,50,20,10,5,2,1];
const INDEX={5:0,10:1,20:2,50:3,100:4,200:5,special:6};
const euro=n=>w.WastlBotBank.money(n);
const coin=(value,cls='')=>{
 if(value===1||value===2)return '<span class="bots-coin-icon bots-small-cent '+cls+'" data-cent="'+value+'" aria-hidden="true">'+value+'</span>';
 return '<span class="bots-coin-icon '+cls+'" style="--coin-x:'+(INDEX[value]/6*100).toFixed(4)+'%" aria-hidden="true"></span>';
};
function change(cents){
 let rest=Math.max(0,Math.round(Number(cents)||0)),coins=[];
 for(const value of VAL){
  const qty=Math.floor(rest/value);
  if(qty){coins.push({value,qty});rest-=qty*value;}
 }
 return {coins,rest};
}
function bowl(){
 const cents=w.WastlBotBank.load().balances.you;
 const {coins}=change(cents),total=coins.reduce((n,c)=>n+c.qty,0),compact=total>15;
 const visible=coins.map(({value,qty})=>{
  const shown=compact?Math.min(qty,3):qty;
  return '<span class="bots-bowl-coin-group" title="'+qty+' × '+(value>=100?(value/100)+' €':value+' ct')+'">'+
   Array.from({length:shown},()=>coin(value,'bots-bowl-chip')).join('')+
   (shown<qty?'<small class="bots-bowl-quantity">×'+qty+'</small>':'')+
   '</span>';
 }).join('');
 const label=euro(cents),debt=cents<0;
 return '<button type="button" class="bots-money-bowl'+(compact?' bots-bowl-compact':'')+'" data-bots-wallet aria-label="Deine Münzschale, Guthaben '+label+'">'+
  '<img class="bots-bowl-art" src="./players/stammtisch-schale.png" alt="" draggable="false">'+
  '<span class="bots-bowl-contents">'+(debt?'<span class="bots-bowl-empty">Schulden</span>':visible||'<span class="bots-bowl-empty">Leer</span>')+'</span>'+
  '<span class="bots-bowl-caption">'+label+'</span>'+
  (debt?'<span class="bots-bowl-debt">Schulden</span>':'')+
  '</button>';
}
function tokens(g,relative){
 const B=w.WastlBots,all=(g.knocks||[]).filter(x=>x.lay).map(x=>({seat:x.seat,kind:'leger',label:'Leger'}))
  .concat((g.shots||[]).map(x=>({seat:x.seat,kind:x.kind,label:x.kind==='retour'?'Retour':'Schuss'})));
 return '<div class="bots-table-tokens">'+B.SEATS.filter(seat=>all.some(x=>x.seat===seat)).map(seat=>
  '<div class="bots-token-position bots-token-position-'+relative(g,seat)+'">'+
  all.filter(x=>x.seat===seat).map(x=>'<span class="bots-table-token bots-token-'+x.kind+'" title="'+B.personAt(g,seat).name+': '+x.label+'">'+coin('special','bots-special-chip')+'<small>'+x.label+'</small></span>').join('')+'</div>').join('')+'</div>';
}
w.WastlBotCoins=Object.freeze({VERSION:'7.11.0',coin,change,bowl,tokens});
})(typeof globalThis!=='undefined'?globalThis:this);
