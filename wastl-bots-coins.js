(function(w){'use strict';
const VAL=[200,100,50,20,10,5],INDEX={5:0,10:1,20:2,50:3,100:4,200:5,special:6};
const euro=n=>w.WastlBotBank.money(n);
const coin=(value,cls='')=>'<span class="bots-coin-icon '+cls+'" style="--coin-x:'+(INDEX[value]/6*100).toFixed(4)+'%" aria-hidden="true"></span>';
function change(cents){let rest=Math.max(0,Math.floor(cents)),coins=[];for(const value of VAL){const qty=Math.floor(rest/value);if(qty){coins.push({value,qty});rest-=qty*value;}}return {coins,rest};}
function bowl(){const cents=w.WastlBotBank.load().balances.you,{coins,rest}=change(cents);
const p=coins.map(x=>'<span class="bots-coin-pile">'+Array.from({length:Math.min(4,x.qty)},()=>coin(x.value,'bots-bowl-chip')).join('')+(x.qty>1?'<small>×'+x.qty+'</small>':'')+'</span>').join('');
return '<button class="bots-money-bowl" type="button" data-bots-wallet aria-label="Deine Münzschale, Guthaben '+euro(cents)+'"><span class="bots-bowl-well"></span><span class="bots-bowl-piles">'+p+'</span><span class="bots-bowl-rim"></span><span class="bots-bowl-caption">'+euro(cents)+(rest?' · '+rest+' ct Rest':'')+'</span>'+(cents<0?'<span class="bots-bowl-debt">Schulden</span>':'')+'</button>';}
function tokens(g,relative){const B=w.WastlBots,all=(g.knocks||[]).filter(x=>x.lay).map(x=>({seat:x.seat,kind:'leger',label:'Leger'})).concat((g.shots||[]).map(x=>({seat:x.seat,kind:x.kind,label:x.kind==='retour'?'Retour':'Schuss'})));
return '<div class="bots-table-tokens">'+B.SEATS.filter(seat=>all.some(x=>x.seat===seat)).map(seat=>'<div class="bots-token-position bots-token-position-'+relative(g,seat)+'">'+all.filter(x=>x.seat===seat).map(x=>'<span class="bots-table-token bots-token-'+x.kind+'" title="'+B.personAt(g,seat).name+': '+x.label+'">'+coin('special','bots-special-chip')+'<small>'+x.label+'</small></span>').join('')+'</div>').join('')+'</div>';}
w.WastlBotCoins=Object.freeze({VERSION:'7.10.0',coin,change,bowl,tokens});})(typeof globalThis!=='undefined'?globalThis:this);