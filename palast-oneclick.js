/* Wastl 4.8 – Ein-Klick-Import. Lokal, ohne OCR-Cloud, ohne unbegründete Gewissheit.
 * Exakte Binär-Textmuster nur für bereits vorliegende Palast-Spielansagen.
 * Unbekannte Schrift-/Spielvarianten gehen ausschließlich in die Korrekturansicht. */
(function(){
'use strict';
const escFast=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const labels={vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'};
const types=[['rufspiel','Rufspiel'],['solo','Farbsolo'],['wenz','Wenz'],['geier','Geier'],['farbwenz','Farbwenz'],['farbgeier','Farbgeier'],['ramsch','Ramsch'],['kreuzrunde','Kreuzrunde'],['hochzeit','Hochzeit'],['bettel','Bettel']];
const suits=[['eichel','Eichel'],['gras','Gras'],['herz','Herz'],['schell','Schellen']];
function select(key,opts,value,required=true){return `<select data-palast-config="${key}">${required?'<option value="">Bitte wählen</option>':''}${opts.map(([v,label])=>`<option value="${v}" ${value===v?'selected':''}>${label}</option>`).join('')}</select>`;}
// Spielnamen: gepackte, farbunabhängige Helltext-Silhouetten aus den eigenen Palast-Referenzscreenshots.
const decode=()=>PALAST_GAME_LABELS.map(entry=>{
 const bytes=atob(entry.mask),bits=new Uint8Array(190*31);
 for(let i=0;i<bits.length;i++)bits[i]=(bytes.charCodeAt(i>>3)>>(7-(i&7)))&1;
 return {...entry,bits,count:bits.reduce((n,x)=>n+x,0)};
});
const textTemplates=decode();
function lightMask(data,w){
 const bits=new Uint8Array(190*31);let count=0;
 for(let y=0;y<31;y++)for(let x=0;x<190;x++){
  const n=((y+662)*w+(x+205))*4,r=data[n],g=data[n+1],b=data[n+2];
  const on=Math.min(r,g,b)>165&&Math.max(r,g,b)-Math.min(r,g,b)<53;
  bits[y*190+x]=on?1:0;if(on)count++;
 }
 return {bits,count};
}
function textDistance(now,reference){
 let best=Infinity;
 for(let dy=-2;dy<=2;dy++)for(let dx=-3;dx<=3;dx++){
  let differences=0;
  for(let y=Math.max(0,dy);y<Math.min(31,31+dy);y++)for(let x=Math.max(0,dx);x<Math.min(190,190+dx);x++){
   differences+=now.bits[y*190+x]!==reference.bits[(y-dy)*190+(x-dx)];
  }
  best=Math.min(best,differences/Math.max(1,now.count+reference.count));
 }
 return best;
}
function guessGame(data,w){
 const observed=lightMask(data,w);if(observed.count<390)return null;
 const scores=textTemplates.map(t=>({type:t.type,suit:t.suit,diff:textDistance(observed,t)})).sort((a,b)=>a.diff-b.diff);
 // Threshold measures matching a known template, NOT an estimated probability.
 return scores[0]?.diff<.20&&(scores.length<2||scores[1].diff-scores[0].diff>.10)?scores[0]:null;
}
// Grün markierter Eigenname: ein belegbares Palast-UI-Merkmal, aber keine Texterkennung.
function guessSeat(data,w){
 const counts=[];
 for(let s=0;s<4;s++){
  let green=0;
  for(let y=103+s*150;y<137+s*150;y++)for(let x=15;x<143;x++){
   const n=(y*w+x)*4,r=data[n],g=data[n+1],b=data[n+2];
   if(g>95&&g>r*1.4&&g>b*1.3)green++;
  }
  counts.push(green);
 }
 const order=counts.map((n,i)=>[n,i]).sort((a,b)=>b[0]-a[0]);
 return order[0][0]>=110 && order[0][0]>order[1][0]*2.2?PALAST_SEATS[order[0][1]]:null;
}
function guessDeclarer(data,w){
 const counts=[];
 for(const y of [620,650,681,710]){
  let bright=0;
  for(let yy=y;yy<y+24;yy++)for(let xx=97;xx<195;xx++){
   const n=(yy*w+xx)*4,r=data[n],g=data[n+1],b=data[n+2];
   if(Math.min(r,g,b)>150&&Math.max(r,g,b)-Math.min(r,g,b)<50)bright++;
  }
  counts.push(bright);
 }
 // Der Ansager steht links hinter dem Sitz mit »Rufspiel«/»Solo«, die anderen »weg«.
 // Schwellen auf konservativen Unterschied zum je Zeile unterschiedlich langen Basistext.
 const excess=counts.map((v,i)=>v-[119,168,167,168][i]);
 const ordering=excess.map((n,i)=>[n,i]).sort((a,b)=>b[0]-a[0]);
 return ordering[0][0]>=35 && ordering[0][0]>=ordering[1][0]+22?PALAST_SEATS[ordering[0][1]]:null;
}
function prefill(p){
 if(!p?.small||!p.recognized||p._fastInitialized)return;
 p._fastInitialized=true;
 const c=p.small,data=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
 // Einfacher stabiler Bildfingerabdruck gegen versehentlichen Doppelimport.
 let hash=2166136261;
 for(let j=0;j<data.length;j+=1091){hash=Math.imul(hash^data[j],16777619)>>>0;}
 p.imageHash='p'+hash.toString(16).padStart(8,'0');
 const type=guessGame(data,c.width),seat=guessSeat(data,c.width),declarer=guessDeclarer(data,c.width);
 p._fastEvidence={type,seat,declarer};
 if(type){p.type=type.type;if(p.type==='rufspiel')p.calledSuit=type.suit;else if(palastMustHaveTrump(p.type))p.trumpSuit=type.suit;}
 if(seat){p.mySeat=seat;p.selfSeatManual=true;p.matchedSeat=seat;p.alias=p.alias||'Ich';p.seatNames[seat]=p.alias;}
 if(declarer)p.declarerSeat=declarer;
 p.firstSeat='vh';
}
function issues(p){
 const problems=[];
 if(!p.type||(p.type==='rufspiel'&&!p.calledSuit)||(palastMustHaveTrump(p.type)&&!p.trumpSuit))problems.push('Spielart / Farbe');
 if(!p.declarerSeat&&!['ramsch','kreuzrunde'].includes(p.type))problems.push('Ansager');
 if(!p.mySeat)problems.push('Dein Platz');
 if(!p.recognized||!p.handRecognized)problems.push('Kartenerkennung');
 const audit=palastCrosscheck(p);
 if(!audit?.ok)problems.push(audit?`${audit.wrong.length} Kartenwidersprüche`:'Hand-Stich-Abgleich');
 return {problems,audit};
}
const oldUI=palastImportUI;
palastImportUI=function(){
 const p=palastDraft;
 if(!p)return oldUI();
 if(p.recognized)prefill(p);
 const image=!!p.small;
 const {problems,audit}=issues(p);
 let status='';
 if(image){
  const evidence=p._fastEvidence||{};
  const typeLabel=types.find(([id])=>id===p.type)?.[1]||'Nicht erkannt';
  const suit=(p.type==='rufspiel'?p.calledSuit:p.trumpSuit)||'';
  status=`<div class="fast-info"><div><small>SPIELART</small><strong>${escFast(typeLabel)} ${escFast(suits.find(x=>x[0]===suit)?.[1]||'')}</strong>${!evidence.type?'<small class="fast-caution">Auswahl erforderlich</small>':''}</div>
  <div><small>MEIN PLATZ</small><strong>${escFast(labels[p.mySeat]||'Unbekannt')}</strong></div>
  <div><small>ANSAGER</small><strong>${escFast(labels[p.declarerSeat]||'Unbekannt')}</strong></div>
  <div><small>KARTEN</small><strong>${audit?.ok?'32 + 32 ✓':p.recognized?`${p.tricks.filter(Boolean).length}/32`:'Werden gelesen …'}</strong></div></div>`;
 }
 const needed=image&&problems.length>0;
 const metadata=`<div class="fast-fixes">
 <p>${needed?'Bitte nur die fehlenden Informationen ergänzen:':'Du kannst die erkannten Angaben bei Bedarf korrigieren:'}</p>
 <div class="fast-fix-grid">
 <label>Spielart ${select('type',types,p.type)}</label>
 ${p.type==='rufspiel'?`<label>Gerufene Farbe ${select('calledSuit',suits.filter(x=>x[0]!=='herz'),p.calledSuit)}</label>`:palastMustHaveTrump(p.type)?`<label>Trumpffarbe ${select('trumpSuit',suits,p.trumpSuit)}</label>`:''}
 <label>Mein Platz ${select('mySeat',PALAST_SEATS.map(id=>[id,labels[id]]),p.mySeat)}</label>
 ${!['ramsch','kreuzrunde'].includes(p.type)?`<label>Ansager ${select('declarerSeat',PALAST_SEATS.map(id=>[id,labels[id]]),p.declarerSeat)}</label>`:''}
 </div></div>`;
 const legacy=oldUI();
 const panel=document.createElement('div');panel.innerHTML=legacy;
 const content=panel.querySelector('.palast-import');
 const advanced=content?Array.from(content.querySelectorAll('.palast-section')).slice(1).map(n=>n.outerHTML).join(''):'';
 const help=needed?`<p class="fast-warning" role="status">${problems.map(s=>`<span>⚠ ${escFast(s)}</span>`).join(' ')}</p>`:image?'<p class="fast-ok">✓ Beide Kartenquellen und die Spielerpositionen passen zusammen. Kein Abhaken nötig.</p>':'';
 return `<div class="content-page palast-import fast-import"><button type="button" class="btn ghost" id="palastCancel">← Zu Wastl</button><div class="fast-heading"><div class="fast-mark">🃏</div><div><h2>Partie mit Wastl analysieren</h2><p>Screenshot auswählen · Spiel analysieren · fertig</p></div></div>
 <section class="card fast-upload"><label class="fast-file">📷 ${image?'Anderen Screenshot auswählen':'Schafkopf-Palast-Bild auswählen'}<input id="palastFile" type="file" accept="image/png,image/jpeg,image/webp"></label>${image?`<small>${escFast(p.fileName)} · ${Math.round(p.fileSize/1024)} KB</small>`:'<p>Offline und ohne Konto. Die 4 Anfangshände und 8 Stiche werden automatisch erkannt.</p>'}</section>
 ${image?`<section class="card fast-summary">${status}${help}${needed?metadata:`<details class="fast-optional"><summary>Erkannte Angaben korrigieren</summary>${metadata}</details>`}
 <button id="palastOneClick" type="button" class="btn fast-main" ${p.recognized?'':'disabled'}>${needed?'🔍 Spiel prüfen und analysieren':'🎲 Spiel analysieren'}</button>
 <p class="fast-note">Wastl berechnet automatisch 350 Kartenverteilungen pro Stich. Nur bei nicht erkannten Angaben oder Widersprüchen ist eine Korrektur nötig.</p></section>`:''}
 ${image?`<details class="fast-advanced" ${needed&&audit&&!audit.ok?'open':''}><summary>🛠 Detailkorrektur der Karten und erweiterten Angaben</summary><div class="fast-advanced-inner">${advanced}</div></details>`:''}</div>`;
};
function oneClick(){
 const p=palastDraft;if(!p?.small||!p.recognized){alert('Bitte zuerst ein Palast-Spielbild auswählen.');return;}
 prefill(p);
 if(!p.alias.trim())p.alias='Ich';
 if(p.mySeat&&!p.seatNames[p.mySeat])p.seatNames[p.mySeat]=p.alias;
 p.metaConfirmed=!!p.type&&!!p.mySeat&&(['ramsch','kreuzrunde'].includes(p.type)||!!p.declarerSeat);
 const {problems,audit}=issues(p);
 if(problems.length){palastRefresh();flash('Bitte nur die markierten Angaben ergänzen');return;}
 if(!audit?.ok){palastRefresh();return;}
 p.handConfirmed=true;
 const reviewed=palastReview();
 if(!reviewed.valid){palastRefresh();flash('Einige Angaben widersprechen den Spielregeln – bitte Detailkorrektur öffnen.');return;}
 if(p.imageHash&&stitch.archive.some(g=>g.imageHash===p.imageHash)){flash('Diese Bilddatei wurde bereits importiert.');return;}
 palastSave(true);
 if(!palastDraft&&mentorGameId){
  const id=mentorGameId;
  Promise.resolve().then(()=>{
   if(mentorGameId!==id||typeof window.WastlAutoSimulation?.startFor!=='function'){flash('Partie gespeichert – Simulation über den Würfel starten.');return;}
   window.WastlAutoSimulation.startFor(id,350);
  });
 }
}
document.addEventListener('click',e=>{
 if(e.target.closest('#palastOneClick')){e.preventDefault();e.stopImmediatePropagation();oneClick();}
},true);
window.WastlFastImport=Object.freeze({guessSeat,guessDeclarer,guessGame,prefill,issues});
})();
