/* Schafkopftracker v4.8: locally matched reference corners for Schafkopf Palast import.
 * The recognizer makes fallible SUGGESTIONS. Never save without full user review.
 * No network requests, third-party APIs, uploads or external card art.
 */
let palastDraft=null;
const PALAST_POSITIONS=[
  [421,629],[21,780],[221,780],[421,780],
  [21,931],[221,931],[421,931],[21,1081]
];
const PALAST_SEATS=['vh','mh','hh','g'];
// Local alias, saved once for matching the player's name on Palast screenshots.
// We do not claim OCR of player names or game announcement; user supplies those labels.
const PALAST_ALIAS_KEY='schafkopf-palast-player-alias-v1';
function palastGetAlias(){try{return String(localStorage.getItem(PALAST_ALIAS_KEY)||'').slice(0,45);}catch{return '';}}
function palastSetAlias(value){try{localStorage.setItem(PALAST_ALIAS_KEY,String(value||'').trim().slice(0,45));}catch{alert('Palast-Name konnte auf diesem Gerät nicht gespeichert werden.');}}
function palastComparableName(text){return String(text||'').replace(/^(\s*\[[^\]]+\]\s*)+/,'').normalize('NFKC').trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');}
function palastMatchingSeats(p){
 const alias=palastComparableName(p.alias);if(!alias)return [];
 return PALAST_SEATS.filter(id=>palastComparableName(p.seatNames[id])===alias);
}
function palastTryFindMySeat(p){
 const hits=palastMatchingSeats(p);p.matchedSeat=hits.length===1?hits[0]:'';
 if(!p.selfSeatManual)p.mySeat=p.matchedSeat;
}
function palastSeatLabel(id){return ({vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'})[id]||'Nicht ausgewählt';}
function palastMustHaveTrump(type){return ['solo','farbwenz','farbgeier'].includes(type);}
function palastResetMeta(p){p.metaConfirmed=false;p.handConfirmed=false;}

const PALAST_SUIT_LABEL={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'};
const PALAST_CHOICE_ORDER=['eichel','gras','herz','schell'].flatMap(s=>['A','10','K','O','U','9','8','7'].map(r=>s+'-'+r));
const PALAST_TEMPLATE_PIXELS=PALAST_SIGNATURES.map(([id,s])=>{const binary=atob(s),bits=new Uint8Array(binary.length);for(let i=0;i<bits.length;i++)bits[i]=binary.charCodeAt(i);return {id,bits};});
function palastNew(){
 return {image:null,small:null,name:'',tricks:Array(32).fill(''),scores:Array(32).fill(999),alternatives:Array.from({length:32},()=>[]),userEdited:Array(32).fill(false),uncertain:Array(32).fill(false),fileName:'',fileSize:0,
 type:'',calledSuit:'',trumpSuit:'',firstSeat:'vh',leaders:Array(8).fill('auto'),declarerSeat:'',mySeat:'',selfSeatManual:false,matchedSeat:'',alias:palastGetAlias(),metaConfirmed:false,handConfirmed:false,
 seatNames:{vh:'',mh:'',hh:'',g:''},startHands:null,handRecognized:false,handMatching:null,
 date:nowISO(),gameId:'',recognized:false,notice:'',selected:0,picking:-1};
}
function palastImageCanvas(img){const c=document.createElement('canvas');c.width=600;c.height=1350;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,600,1350);return c;}
// Compare original screenshot pixels to compact 14 × 22 corner signatures.
// Emphasize the printed rank in the upper-left corner (7/9, 8/9 etc.).
// Coordinates always refer to the 600 × 1350 normalized Palast screenshot.
const PALAST_CORNER_W=14, PALAST_CORNER_H=22;
function palastCornerCost(data,canvasWidth,x,y,template,best){
 let sum=0,pos=0;
 for(let py=0;py<PALAST_CORNER_H;py++){
  let off=((y+py)*canvasWidth+x)*4;
  for(let px=0;px<PALAST_CORNER_W;px++){
   const w=py<2?2:(py<13?(px<7?3:6):3);
   sum+=w*(Math.abs(data[off]-template[pos])+Math.abs(data[off+1]-template[pos+1])+Math.abs(data[off+2]-template[pos+2]));
   pos+=3;off+=4;
  }
  // A current offset cannot outperform a prior offset once all partial costs exceed it.
  if(sum>=best)return sum;
 }
 return sum;
}
// Pixelabgleich v4.8: quadratischer RGB-Abstand statt nur Helligkeitsabweichung.
// Für 32 Referenzen: den besten Versatz pixelgenau bestimmen. So bleiben Hand- und Stichscan mobil nutzbar.
function palastSquaredCorner(data,width,x,y,bits,step=1){
 let sum=0;
 for(let py=0;py<22;py+=step){
  let src=((y+py)*width+x)*4,ref=py*14*3;
  for(let px=0;px<14;px+=step){
   const si=src+px*4,ri=ref+px*3;
   const dr=data[si]-bits[ri],dg=data[si+1]-bits[ri+1],db=data[si+2]-bits[ri+2];
   sum+=dr*dr+dg*dg+db*db;
  }
 }
 return sum;
}
function palastTemplateMatrix(c,points){
 const data=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
 const offsets=[];for(let dx=-3;dx<=3;dx++)for(let dy=-4;dy<=6;dy++)offsets.push([dx,dy]);
 return points.map(([x,y])=>PALAST_TEMPLATE_PIXELS.map(ref=>{
  let best=Infinity;
  for(const [dx,dy] of offsets){
   const cost=palastSquaredCorner(data,c.width,x+dx,y+dy,ref.bits);
   if(cost<best)best=cost;
  }
  return Math.sqrt(best/(14*22*3));
 }));
}
// Returns optimal non-repeating proposals. Hungarian algorithm, O(n^3).
function palastAssign(cost){
 const n=cost.length,p=new Array(n+1).fill(0),u=new Array(n+1).fill(0),v=new Array(n+1).fill(0),way=new Array(n+1).fill(0);
 for(let i=1;i<=n;i++){
  p[0]=i;const minv=new Array(n+1).fill(Infinity),used=new Array(n+1).fill(false);let j0=0;
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=n;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0;}if(minv[j]<delta){delta=minv[j];j1=j;}}
   for(let j=0;j<=n;j++){if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else minv[j]-=delta;}
   j0=j1;
  }while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }
 const assignment=new Array(n);for(let j=1;j<=n;j++)assignment[p[j]-1]=j-1;return assignment;
}
function palastRecognize(c,locked={}){
 if(c.width!==600||c.height!==1350)throw new Error('Das Palast-Bild muss auf 600 × 1350 Pixel normalisiert werden.');
 if(PALAST_TEMPLATE_PIXELS.length!==32||PALAST_TEMPLATE_PIXELS.some(ref=>ref.bits.length!==PALAST_CORNER_W*PALAST_CORNER_H*3))throw new Error('Die 32 Referenz-Kartenecken konnten nicht geladen werden.');
 // Stichleisten: 33 px Karteneckenabstand, acht Stiche à vier Karten.
 const matrix=palastTemplateMatrix(c,PALAST_POSITIONS.flatMap(([bx,by])=>
  Array.from({length:4},(_,k)=>[bx+k*33,by])));
 const fixedIndices=Object.keys(locked).map(Number).filter(i=>i>=0&&i<32&&PALAST_TEMPLATE_PIXELS.some(r=>r.id===locked[i]));
 const reserved=new Set(fixedIndices.map(i=>locked[i]));
 if(reserved.size!==fixedIndices.length)throw new Error('Einige manuell ausgewählte Karten sind doppelt vergeben. Bitte erst die doppelten Karten korrigieren.');
 const variable=Array.from({length:32},(_,i)=>i).filter(i=>!fixedIndices.includes(i));
 const reference=PALAST_TEMPLATE_PIXELS.map((r,i)=>i).filter(i=>!reserved.has(PALAST_TEMPLATE_PIXELS[i].id));
 const result=new Array(32);
 fixedIndices.forEach(i=>{result[i]={id:locked[i],score:0,alternatives:[{id:locked[i],score:0}],uncertain:false};});
 if(variable.length&&variable.length===reference.length){
  const reduced=variable.map(i=>reference.map(j=>matrix[i][j]));
  const match=palastAssign(reduced),baseCost=match.reduce((sum,j,i)=>sum+reduced[i][j],0);
  // Assignment stability: how much more expensive is the next legal 32-card allocation
  // if we forbid this one card at this position? A low margin means ambiguous.
  const globalMargins=variable.map((_,row)=>{
   if(variable.length<2)return Infinity;
   const alternative=reduced.map((costs,i)=>i===row?costs.map((v,j)=>j===match[row]?1000000:v):costs);
   const next=palastAssign(alternative);
   return Math.max(0,next.reduce((sum,j,i)=>sum+alternative[i][j],0)-baseCost);
  });
  variable.forEach((i,rank)=>{
   const assignedIndex=reference[match[rank]],selected=PALAST_TEMPLATE_PIXELS[assignedIndex];
   const shortlist=reference.map(j=>({id:PALAST_TEMPLATE_PIXELS[j].id,score:matrix[i][j]})).sort((a,b)=>a.score-b.score).slice(0,4);
   const selectedScore=matrix[i][assignedIndex],margin=globalMargins[rank];
   // This is allocation STABILITY, not an empirically calibrated error probability.
   result[i]={id:selected.id,score:selectedScore,alternatives:shortlist,margin,uncertain:selectedScore>=62||margin<=1.5};
  });
 }
 return result;
}
// v4.8: Erkenne zusätzlich die vier ORIGINAL-Starthände aus dem oberen
// Viertel des Palast-Bildes. Diese Karten haben einen Abstand von 37 px,
// während die Karten in den Stichleisten 33 px auseinander liegen.
// Diese 32 Vorlagen werden bewusst UNABHÄNGIG von den Stichleisten zugeordnet.
function palastRecognizeInitialHands(c){
 if(c.width!==600||c.height!==1350)throw new Error('Das Originalbild hat ein nicht unterstütztes Format.');
 const matrix=palastTemplateMatrix(c,Array.from({length:4},(_,seat)=>
  Array.from({length:8},(_,k)=>[151+k*37,26+seat*150])).flat());
 const assignments=palastAssign(matrix);
 const ordered=assignments.map(i=>PALAST_TEMPLATE_PIXELS[i].id);
 const scores=assignments.map((i,j)=>matrix[j][i]);
 return {
  seats:Object.fromEntries(PALAST_SEATS.map((s,i)=>[s,ordered.slice(i*8,i*8+8)])),
  scores,
  unique:new Set(ordered).size===32
 };
}
// Abgleich zwischen zwei voneinander unabhängigen Bildlesungen:
// 32 Anfangskarten pro Sitz und 32 Stichkarten in der tatsächlich gespielten
// Reihenfolge. Die Ansage und das Ausspiel müssen vorher feststehen.
function palastCrosscheck(p){
 if(!p.handRecognized||!p.startHands?.unique||!p.type||!p.firstSeat)return null;
 if(p.type==='rufspiel'&&!p.calledSuit)return null;
 if(palastMustHaveTrump(p.type)&&!p.trumpSuit)return null;
 if(p.tricks.some(c=>!CARD_MAP[c])||new Set(p.tricks).size!==32)return null;
 const tricks=palastBuildTricks(p);if(tricks.length!==8)return null;
 const ownership=Object.fromEntries(PALAST_SEATS.map(s=>[s,new Set(p.startHands.seats[s])]));
 const wrong=[];
 tricks.forEach((trick,t)=>trick.cards.forEach((card,k)=>{
  const seat=stitchPositionFromLeader(trick.leaderSeat,k);
  if(!ownership[seat]?.has(card)){
   const trueSeat=PALAST_SEATS.find(s=>ownership[s]?.has(card))||'?';
   wrong.push({index:t*4+k,seat,expected:trueSeat,card});
  }
 }));
 return {ok:wrong.length===0,wrong};
}
function palastApplyRecognition(p,locked={}){
 const got=palastRecognize(p.small,locked),initial=palastRecognizeInitialHands(p.small);
 p.startHands=initial;p.handRecognized=true;
 p.tricks=got.map(x=>x.id);p.scores=got.map(x=>x.score);
 p.alternatives=got.map(x=>x.alternatives);p.uncertain=got.map(x=>!!x.uncertain);
 p.recognized=true;p.handConfirmed=false;
 return got;
}
function palastImageSlice(c,x,y,width=164,height=105,targetWidth=328){const crop=document.createElement('canvas');crop.width=targetWidth;crop.height=Math.round(targetWidth*height/width);crop.getContext('2d').drawImage(c,x,y,width,height,0,0,crop.width,crop.height);return crop.toDataURL('image/jpeg',.82);}
function palastScoreLabel(score){return score<45?'Referenzabgleich':score<62?'bitte prüfen':'unsicher';}
function palastSeatSelect(value,attr){return `<option value="" ${!value?'selected':''}>Bitte auswählen</option>`+PALAST_SEATS.map(s=>`<option value="${s}" ${s===value?'selected':''}>${palastSeatLabel(s)}</option>`).join('');}
function palastReview(){
 const p=palastDraft;if(!p)return {errors:['Kein Bild geladen.'],notes:[],valid:false};
 const errors=[],notes=[];const filled=p.tricks.filter(Boolean),seen=new Set(filled),dupes=[...new Set(filled.filter((x,i)=>filled.indexOf(x)!==i))];
 if(p.tricks.length!==32||filled.length!==32)errors.push(`${32-filled.length} Karten müssen noch zugeordnet werden.`);
 if(dupes.length)errors.push(`${dupes.length} Karte(n) mehrfach vergeben: ${dupes.slice(0,4).map(c=>CARD_MAP[c]?.name||c).join(', ')}${dupes.length>4?' …':''}.`);
 let eyes=0;for(const id of filled)eyes+=CARD_MAP[id]?.eyes||0;
 if(filled.length===32&&eyes!==120)errors.push(`Es ergeben sich nur ${eyes} statt 120 Augen.`);
 if(!validDate(p.date))errors.push('Bitte gültiges Spieldatum auswählen.');
 if(!p.type)errors.push('Spielart fehlt: Wähle die Ansage ausdrücklich anhand des Screenshots aus.');
 if(palastMustHaveTrump(p.type)&&!p.trumpSuit)errors.push('Bitte die angesagte Trumpffarbe auswählen (z. B. Herz für Farbsolo Herz).');
 if(p.type==='rufspiel'&&!p.calledSuit)errors.push('Bitte die gerufene Farbe angeben.');
 if(!['ramsch','kreuzrunde'].includes(p.type)&&!PALAST_SEATS.includes(p.declarerSeat))errors.push('Bitte den Ansager auswählen.');
 if(!p.alias.trim())errors.push('Bitte deinen Spielernamen bei Schafkopf Palast einmalig hinterlegen.');
 if(!PALAST_SEATS.includes(p.mySeat))errors.push('Deine Position ist nicht identifiziert. Namen zuordnen oder Sitzplatz ausdrücklich auswählen.');
 const aliasSeats=palastMatchingSeats(p);
 if(aliasSeats.length>1)errors.push('Der hinterlegte Spielername kommt an mehreren Plätzen vor. Bitte Namen prüfen.');
 if(aliasSeats.length===1&&p.mySeat!==aliasSeats[0])errors.push('Dein gewählter Platz widerspricht dem Spielernamen auf dem Bild: '+palastSeatLabel(aliasSeats[0])+'.');
 if(!p.metaConfirmed)errors.push('Bestätige bitte die Spielart, den Ansager und deine Position anhand des Originalbildes.');
 const autoHandCheck=palastCrosscheck(p);
 if(autoHandCheck?.ok)notes.push('✓ Automatischer Kreuzvergleich: Alle 32 Karten aus den vier Starthänden stimmen mit den 32 Stichkarten und ihren Spielern überein.');
 if(autoHandCheck&&!autoHandCheck.ok){
  errors.push(`${autoHandCheck.wrong.length} widersprüchliche Kartenzuordnungen zwischen Starthänden und Stichen. Bitte vor dem Speichern korrigieren.`);
  notes.push('Betroffene Positionen: '+autoHandCheck.wrong.slice(0,10).map(v=>`Stich ${Math.floor(v.index/4)+1}, Karte ${v.index%4+1}`).join('; ')+(autoHandCheck.wrong.length>10?' …':''));
 }
 if(!autoHandCheck?.ok&&!p.handConfirmed)errors.push('Bestätige bitte den Vergleich deiner acht Karten mit der Hand im Originalbild.');
 if(p.type&&!['rufspiel','solo','wenz','geier','farbwenz','farbgeier','kreuzrunde','hochzeit','bettel','ramsch'].includes(p.type))errors.push('Unbekannte Spielart.');
 if(p.type==='rufspiel'&&p.declarerSeat===null)errors.push('Für Rufspiel fehlt der Ansager.');
 const ids=new Set(stitch.archive.map(g=>g.id));if(p.gameId.trim()&&ids.has('palast-'+p.gameId.trim()))errors.push('Die Spielnummer wurde bereits importiert.');
 if(filled.length===32&&!dupes.length&&eyes===120&&p.type&&(!palastMustHaveTrump(p.type)||p.trumpSuit)&&(p.type!=='rufspiel'||p.calledSuit)){
  const ts=palastBuildTricks(p);
  if(ts.length!==8)errors.push('Stichfolge konnte nicht rekonstruiert werden.');
  else{
   const nextLeaders=ts.map((t,i)=>t.leaderSeat).join(', ');
   notes.push('Vorschau der ermittelten Ausspieler: '+nextLeaders.toUpperCase());
   if(p.type==='rufspiel'){const ace=p.calledSuit+'-A',hasAce=ts.some(t=>t.cards.includes(ace));if(!hasAce)errors.push('Gerufenes Ass fehlt.');}
   // Detect violations using reconstructed hands and follow suit.
   const test=palastAsGame(p,ts);const stateHands=palastHandsBySeat(test);
   if(p.type==='rufspiel'&&(!test.partnerSeat||test.partnerSeat===p.declarerSeat))errors.push('Rufspiel: Gerufenes Ass oder Partner nicht plausibel.');
   if(stateHands){
    let fouls=0;const used=Object.fromEntries(PALAST_SEATS.map(s=>[s,new Set()]));
    ts.forEach((trick,i)=>{
     const lead=CARD_MAP[trick.cards[0]];
     for(let k=1;k<4;k++){
      const seat=stitchPositionFromLeader(trick.leaderSeat,k);
      const left=stateHands[seat].filter(id=>!used[seat].has(id));
      const legal=mentorLegalOptions(left,lead,test);
      if(!legal.includes(trick.cards[k]))fouls++;
     }
     for(let k=0;k<4;k++)used[stitchPositionFromLeader(trick.leaderSeat,k)].add(trick.cards[k]);
    });
    if(fouls)errors.push(`${fouls} mögliche Bedienpflicht-Verstöße: Bitte Kartenzuordnung, erste Ausspielposition und Spielart korrigieren.`);
   }
  }
 }
 if(p.recognized){const low=p.uncertain.filter((uncertain,i)=>uncertain&&!p.userEdited[i]).length;if(autoHandCheck?.ok)notes.unshift(`${low} Einzelkarten sind im direkten Bildvergleich mehrdeutig, werden aber durch den unabhängigen Hand-Stich-Abgleich bestätigt.`);else notes.unshift(`${low} Zuordnungen sind im Referenzabgleich mehrdeutig. Bitte diese und alle widersprüchlichen Karten kontrollieren.`);}
 return {errors,notes,valid:errors.length===0,eyes};
}
function palastBuildTricks(p){
 let leader=p.firstSeat;const ts=[];
 for(let t=0;t<8;t++){
  if(t>0&&p.leaders[t]&&p.leaders[t]!=='auto')leader=p.leaders[t];
  const cards=p.tricks.slice(t*4,t*4+4);if(cards.length!==4||cards.some(id=>!CARD_MAP[id]))return [];
  const wi=stitchWinnerIndex(cards,p.type,p.trumpSuit);if(wi<0)return [];
  const winnerSeat=stitchPositionFromLeader(leader,wi);
  ts.push({cards,winner:'pending',eyes:cards.reduce((n,id)=>n+CARD_MAP[id].eyes,0),leaderSeat:leader,winnerSeat});leader=winnerSeat;
 }
 return ts;
}
function palastAsGame(p,tricks){
 const game={id:'',type:p.type,calledSuit:p.calledSuit,trumpSuit:p.trumpSuit||'herz',partnerMode:'manual',role:'defender',firstSeat:p.firstSeat,mySeat:p.mySeat,declarerSeat:p.declarerSeat||'vh',partnerSeat:null,seatNames:{...p.seatNames},tricks};
 if(p.type==='rufspiel'&&p.calledSuit){const hands=palastHandsBySeat(game);game.partnerSeat=hands?PALAST_SEATS.find(seat=>hands[seat].includes(p.calledSuit+'-A')&&seat!==p.declarerSeat)||null:null;}
 game.role=stitchMyDeclarerTeam(game)?'declarer':'defender';return game;
}
function palastHandsBySeat(g){
 const hands=Object.fromEntries(PALAST_SEATS.map(s=>[s,[]]));
 for(const t of g.tricks)for(let i=0;i<4;i++)hands[stitchPositionFromLeader(t.leaderSeat,i)].push(t.cards[i]);
 return PALAST_SEATS.every(s=>hands[s].length===8)?hands:null;
}
function palastImportUI(){
 const p=palastDraft;if(!p)return '';
 const valid=palastReview();const hasPicture=!!p.small;
 const last=p.selected;const questionable=(p.recognized&&!palastCrosscheck(p)?.ok?p.uncertain.map((flag,i)=>(flag&&!p.userEdited[i])?i:-1).filter(i=>i>=0):[]);
 const controls=(id,value,options)=>`<label class="field">${id}<select data-palast-config="${options}">${value}</select></label>`;
 const typeOptions=[['rufspiel','Rufspiel'],['solo','Farbsolo'],['wenz','Wenz'],['geier','Geier'],['farbwenz','Farbwenz'],['farbgeier','Farbgeier'],['hochzeit','Hochzeit'],['kreuzrunde','Kreuzrunde'],['bettel','Bettel'],['ramsch','Ramsch']];
 const typeLabel=typeOptions.find(([id])=>id===p.type)?.[1]||'Nicht bestimmt';
 const suitLabel=p.type==='rufspiel'?(PALAST_SUIT_LABEL[p.calledSuit]||'Farbe fehlt'):(palastMustHaveTrump(p.type)?(PALAST_SUIT_LABEL[p.trumpSuit]||'Farbe fehlt'):'');
 const aliasHits=palastMatchingSeats(p);
 const seatStatus=aliasHits.length===1?`Spielername zugeordnet: ${palastSeatLabel(aliasHits[0])}`:aliasHits.length>1?'Spielername mehrfach vorhanden.':'Noch kein eindeutiger Namensabgleich – bitte vier Spielernamen vom Foto übernehmen.';
 const personStatus=p.mySeat?`Deine Hand: ${palastSeatLabel(p.mySeat)} · ${p.seatNames[p.mySeat]||'Name fehlt'}`:'Deine Hand noch nicht zugeordnet';
 const handAudit=palastCrosscheck(p);
 const handAuditText=handAudit?.ok?'✓ Alle 32 Starthandkarten passen exakt zu den späteren Stichen und Spielern.':
  handAudit?`⚠ ${handAudit.wrong.length} Karten weichen zwischen den Starthänden und den Stichen ab. Bitte erst diese Stellen korrigieren.`:
  p.handRecognized?'Bitte erst Spielart und Ausspieler festlegen, dann prüft Wastl alle vier Starthände automatisch.':'';
 const seatIndex=PALAST_SEATS.indexOf(p.mySeat),photoSeat=seatIndex>=0&&p.small?palastImageSlice(p.small,5,seatIndex*150+5,590,135,830):'';
 let reconstructed=[];
 if(p.mySeat&&p.tricks.every(v=>!!CARD_MAP[v])&&new Set(p.tricks).size===32&&p.type){
  const ts=palastBuildTricks(p);if(ts.length===8)reconstructed=palastHandsBySeat(palastAsGame(p,ts))?.[p.mySeat]||[];
 }
 const fields=`<div class="palast-critical">
 <h4>1 · Meine Identität und Sitzposition</h4>
 <p class="help">Den Palast-Spielernamen nur einmal speichern. Die Namen aus dem Bild bitte den vier Positionen zuordnen – Text aus dem Screenshot wird derzeit nicht zuverlässig automatisch gelesen.</p>
 <div class="palast-settings"><label>Mein Spielername in Schafkopf Palast<input data-palast-alias maxlength="45" value="${esc(p.alias)}" placeholder="z. B. [Wee] Maaf" autocomplete="off"></label>
 <label>Mein Platz <select data-palast-config="mySeat">${palastSeatSelect(p.mySeat)}</select></label></div>
 <div class="palast-status" role="status">${esc(seatStatus)}<br>${esc(personStatus)}</div>
 <div class="palast-settings palast-player-names">${PALAST_SEATS.map(id=>`<label>${palastSeatLabel(id)} · Name im Bild<input data-palast-name="${id}" maxlength="28" value="${esc(p.seatNames[id])}" placeholder="Name aus dem Bild eingeben"></label>`).join('')}</div>
 <h4>2 · Spielart aus dem Foto bestimmen</h4>
 <p class="help">Die Spielart steht im unteren Berichtsfeld. Wir zeigen es vergrößert, statt automatisch ein falsches Rufspiel anzunehmen.</p>
 <img class="palast-game-crop" src="${p.small?palastImageSlice(p.small,180,598,235,120,550):''}" alt="Spielansage im unteren Bereich des Originalbildes">
 <div class="palast-settings"><label>Angesagte Spielart <select data-palast-config="type"><option value="" ${!p.type?'selected':''}>Bitte Spielart aus dem Bild auswählen</option>${typeOptions.map(([k,l])=>`<option value="${k}" ${p.type===k?'selected':''}>${l}</option>`).join('')}</select></label>
 ${p.type==='rufspiel'?`<label>Gerufene Farbe <select data-palast-config="calledSuit"><option value="">Bitte auswählen</option>${['eichel','gras','schell'].map(id=>`<option value="${id}" ${p.calledSuit===id?'selected':''}>${PALAST_SUIT_LABEL[id]}</option>`).join('')}</select></label>`:palastMustHaveTrump(p.type)?`<label>Farbe des Spiels <select data-palast-config="trumpSuit"><option value="">Bitte auswählen</option>${['eichel','gras','herz','schell'].map(id=>`<option value="${id}" ${p.trumpSuit===id?'selected':''}>${PALAST_SUIT_LABEL[id]}</option>`).join('')}</select></label>`:''}
 <label>Ansager <select data-palast-config="declarerSeat">${palastSeatSelect(p.declarerSeat)}</select></label>
 <label>Erster Ausspieler <select data-palast-config="firstSeat">${palastSeatSelect(p.firstSeat)}</select></label>
 <label>Spielnummer (optional)<input data-palast-config="gameId" maxlength="42" value="${esc(p.gameId)}" placeholder="z. B. 348.215.100"></label>
 <label>Datum <input data-palast-config="date" type="date" value="${esc(p.date)}"></label></div>
 <div class="palast-summary"><strong>So wird Wastl das Spiel anzeigen:</strong><div>${esc(typeLabel+(suitLabel?' '+suitLabel:''))} · ${esc(p.declarerSeat?('Ansager: '+(p.seatNames[p.declarerSeat]||palastSeatLabel(p.declarerSeat))):'Ansager nicht gewählt')} · ${esc(personStatus)}</div></div>
 <label class="palast-check"><input data-palast-confirm="metaConfirmed" type="checkbox" ${p.metaConfirmed?'checked':''}><span>Ich habe die Spielart, den Ansager und meinen Platz mit dem Bild verglichen.</span></label>
 <h4>3 · Automatischer Abgleich aller vier Starthände</h4>
 ${handAuditText?`<p class="${handAudit&&!handAudit.ok?'palast-err':'palast-note'}" role="status">${esc(handAuditText)}</p>`:''}
 ${photoSeat?`<div class="palast-hand-compare"><b>Original: ${esc(palastSeatLabel(p.mySeat))}</b><img src="${photoSeat}" alt="Meine Hand im Schafkopf-Palast-Bild"></div>`:'<p class="palast-note">Wähle deinen Platz, um deine Hand im Original zu sehen.</p>'}
 ${p.handRecognized&&p.mySeat?`<div class="palast-reconstructed"><b>Direkt aus dem Bild gelesene Hand</b><div class="palast-my-hand">${p.startHands.seats[p.mySeat].map(id=>`<img src="cards/${id}.webp" alt="${esc(CARD_MAP[id].name)}" title="${esc(CARD_MAP[id].name)}">`).join('')}</div></div>`:''}
 ${handAudit?.ok?'<p class="palast-note">Die manuelle Kontrolle der acht Handkarten entfällt: Alle 32 Karten sind unabhängig mit den Stichkarten abgeglichen. Spielart und Namen weiterhin bestätigen.</p>':`<label class="palast-check"><input data-palast-confirm="handConfirmed" type="checkbox" ${p.handConfirmed?'checked':''} ${!reconstructed.length?'disabled':''}><span>Ich habe meine acht Karten mit dem Originalbild verglichen.</span></label>`}
 ${handAudit&&!handAudit.ok?`<div class="palast-suspects"><b>Bitte diese widersprüchlichen Stellen prüfen:</b><div>${handAudit.wrong.slice(0,24).map(v=>`<a href="#palast-card-${v.index}">Stich ${Math.floor(v.index/4)+1} · Karte ${v.index%4+1}</a>`).join('')}</div></div>`:''}
 ${p.handRecognized?`<details class="palast-hands-details"><summary>Alle vier erkannten Starthände anzeigen</summary>${PALAST_SEATS.map(s=>`<p><b>${palastSeatLabel(s)}</b></p><div class="palast-my-hand">${p.startHands.seats[s].map(id=>`<img src="cards/${id}.webp" alt="${esc(CARD_MAP[id].name)}" title="${esc(CARD_MAP[id].name)}">`).join('')}</div>`).join('')}</details>`:''}
 </div>`;
 const review=valid.errors.map(s=>`<p class="palast-err">${esc(s)}</p>`).join('')+valid.notes.map(s=>`<p class="palast-note">${esc(s)}</p>`).join('');
 const renders=hasPicture?Array.from({length:8},(_,ti)=>{const [x,y]=PALAST_POSITIONS[ti];return `<section class="palast-trick" id="palast-trick-${ti}"><div class="palast-trick-h"><b>Stich ${ti+1}</b><span>${p.tricks.slice(ti*4,ti*4+4).filter(Boolean).length} / 4 Karten</span></div><label class="palast-lead">Erster Ausspieler <select data-palast-leader="${ti}" ${ti===0?'disabled':''}><option value="auto" ${p.leaders[ti]==='auto'?'selected':''}>${ti===0?'Wie oben festgelegt':'Automatisch aus dem vorherigen Stich'}</option>${PALAST_SEATS.map(v=>`<option value="${v}" ${p.leaders[ti]===v?'selected':''}>${{vh:'VH – Vorhand',mh:'MH – Mittelhand',hh:'HH – Hinterhand',g:'G – Geber'}[v]}</option>`).join('')}</select></label>
 <img loading="lazy" class="palast-crop" src="${palastImageSlice(p.small,x,y-11,162,118,324)}" alt="Bildauszug aus Stich ${ti+1}">
 <div class="palast-trick-grid">${Array.from({length:4},(_,ci)=>{const at=ti*4+ci,id=p.tricks[at],score=p.scores[at];return `<label class="palast-card-choice" id="palast-card-${at}"><span>Karte ${ci+1}${p.recognized?` <small>${p.userEdited[at]?'manuell geprüft':(p.uncertain[at]?'unsicher':palastScoreLabel(score))}</small>`:''}</span><select data-palast-card="${at}" aria-label="Stich ${ti+1}, Karte ${ci+1}"><option value="">Bitte auswählen</option>${PALAST_CHOICE_ORDER.map(v=>`<option value="${v}" ${v===id?'selected':''}>${CARD_MAP[v].name}</option>`).join('')}</select>${id?`<img class="palast-mini" src="cards/${id}.webp" alt="${esc(CARD_MAP[id]?.name||id)}">`:''}
 ${p.recognized&&!p.userEdited[at]&&p.alternatives[at]?.length?`<div class="palast-proposals"><span>Andere Vorschläge:</span>${p.alternatives[at].filter(v=>v.id!==id).slice(0,3).map(v=>`<button type="button" data-palast-suggest="${at}" data-card="${v.id}">${esc(CARD_MAP[v.id].name)}</button>`).join('')}</div>`:''}
 ${p.userEdited[at]?'<span class="palast-manual-label">✓ Manuell korrigiert</span>':''}<button type="button" class="palast-pick-open" data-palast-pick="${at}">🃏 Karte aus Bildern wählen</button></label>`;}).join('')}</div></section>`;}).join(''):'';
 const picker=p.picking>=0?`<div class="palast-picker-backdrop" role="dialog" aria-modal="true" aria-label="Spielkarte auswählen"><div class="palast-picker"><div class="palast-picker-top"><strong>Stich ${Math.floor(p.picking/4)+1} · Karte ${p.picking%4+1}</strong><button type="button" id="palastPickClose" aria-label="Kartenwahl schließen">✕</button></div><p>Tippe die passende Karte an. Schon in anderen Stichen vergebene Karten sind markiert.</p><div class="palast-picker-suits">${['eichel','gras','herz','schell'].map(suit=>`<section><h4>${PALAST_SUIT_LABEL[suit]}</h4><div class="palast-picker-grid">${['A','10','K','O','U','9','8','7'].map(rank=>{const id=suit+'-'+rank,used=p.tricks.some((v,i)=>v===id&&i!==p.picking);return `<button type="button" class="palast-picker-card ${used?'used':''}" data-palast-pick-choice="${id}" aria-label="${esc(CARD_MAP[id].name)}${used?', bereits verwendet':''}"><img loading="lazy" src="cards/${id}.webp" alt=""><span>${used?'Bereits':'Wählen'}</span></button>`;}).join('')}</div></section>`).join('')}</div></div></div>`:'';
 return `<div class="content-page palast-import">${picker}<button type="button" class="btn ghost" id="palastCancel">← Zurück zu Wastl</button><div class="palast-hero"><h2>Schafkopf Palast importieren</h2><p>Alle Daten bleiben auf deinem Gerät. 32 Palast-Referenzkarten erkennen sowohl die 32 Stichkarten als auch die vier ursprünglichen Hände. Ein unabhängiger Hand-Stich-Abgleich findet Zuordnungsfehler. <b>Spielart und Spielernamen bitte weiterhin selbst bestimmen und bestätigen.</b></p></div>
 <section class="card palast-section"><label class="palast-upload"><span>📷 Geteiltes Spielbild auswählen</span><input id="palastFile" type="file" accept="image/png,image/jpeg,image/webp"></label>${!hasPicture?'<p class="help">Wähle das vollständige Hochformatbild aus Schafkopf Palast mit vier Spielerhänden und allen acht Stichen. Unterstützt wird vorerst die bekannte Bildaufteilung im Format ca. 600 × 1350.</p>':`<p class="palast-image-meta">${esc(p.fileName)} · ${Math.round(p.fileSize/1024)} KB</p><img class="palast-screenshot" src="${p.image}" alt="Importiertes Schafkopf-Palast-Bild"><div class="palast-actions"><button type="button" class="btn" id="palastRecognize">↻ Karten automatisch vorschlagen</button><button type="button" class="btn secondary" id="palastClearCards">Kartenzuordnung leeren</button></div>`}</section>
 ${hasPicture?`<section class="card palast-section"><h3>Spielangaben</h3>${fields}</section><section class="card palast-section"><div class="palast-section-title"><h3>Stiche und Karten kontrollieren</h3><span class="badge">${p.tricks.filter(Boolean).length}/32</span></div><p class="help">Wastl vergleicht die Stiche automatisch mit den vier Starthänden. Du musst nur widersprüchliche Karten korrigieren. Bei Bedarf kannst du einen Stich aufklappen.</p>${questionable.length?`<div class="palast-suspects"><b>${questionable.length} mehrdeutige Zuordnungen – zuerst kontrollieren:</b><div>${questionable.map(i=>`<a href="#palast-card-${i}">Stich ${Math.floor(i/4)+1} · Karte ${i%4+1}</a>`).join('')}</div></div>`:''}${renders}</section><section class="card palast-section"><h3>Prüfergebnis</h3>${review}<button id="palastSave" class="btn" type="button" ${!valid.valid?'disabled':''}>✓ Geprüfte Partie bei Wastl speichern</button><p class="help">Erst nach deiner Bestätigung wird die Partie als Training gespeichert. Es werden keine Geldbeträge oder Spielabende verändert.</p></section>`:''}</div>`;
}
let palastRefreshTimer=0;
function palastRefresh(keepY=true){
 const y=window.scrollY;
 clearTimeout(palastRefreshTimer);
 // Let the native change/blur event finish before replacing its active input node.
 palastRefreshTimer=setTimeout(()=>{render();if(keepY)window.scrollTo(0,y);},0);
}
function palastLoad(file){
 if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)){alert('Bitte ein JPG-, PNG- oder WebP-Bild wählen.');return;}
 if(file.size>12*1024*1024){alert('Das Bild ist größer als 12 MB. Bitte als normales Screenshot-JPG exportieren.');return;}
 const reader=new FileReader();reader.onerror=()=>alert('Die Datei konnte nicht gelesen werden.');reader.onload=()=>{
  const img=new Image();img.onerror=()=>alert('Das Bild konnte nicht geöffnet werden.');img.onload=()=>{
   const ratio=img.width/img.height;if(Math.abs(ratio-600/1350)>.055){alert('Dieses Bild hat eine andere Aufteilung als die bekannten geteilten Palast-Spielbilder (ca. 600 × 1350). Der Import kann die Kartenbereiche eventuell nicht richtig finden.');}
   palastDraft.small=palastImageCanvas(img);palastDraft.image=reader.result;palastDraft.fileName=file.name;palastDraft.fileSize=file.size;palastDraft.recognized=false;palastDraft.tricks=Array(32).fill('');palastDraft.scores=Array(32).fill(999);palastDraft.userEdited=Array(32).fill(false);palastDraft.uncertain=Array(32).fill(false);palastDraft.alternatives=Array.from({length:32},()=>[]);palastDraft.startHands=null;palastDraft.handMatching=null;palastDraft.handRecognized=false;palastResetMeta(palastDraft);
   // Automatisch erkennen: Der Kreuzvergleich macht manuelles Abhaken überflüssig,
   // solange Karten, Ausspieler und Spielart widerspruchsfrei zusammenpassen.
   const draft=palastDraft;
   palastRefresh(false);window.scrollTo(0,0);
   setTimeout(()=>{if(palastDraft!==draft||!draft.small)return;
    try{palastApplyRecognition(draft);palastRefresh();}catch(err){console.error(err);flash('Automatische Kartenerkennung nicht möglich: bitte erneut starten.');}
   },60);
  };img.src=reader.result;
 };reader.readAsDataURL(file);
}
function palastSave(skipConfirm=false){
 const p=palastDraft,check=palastReview();if(!check.valid){alert('Bitte prüfe die Karten: '+check.errors.join(' '));palastRefresh();return;}
 if(!skipConfirm&&!confirm('Sind Spielart, Ansager und dein Name korrekt? Die Karten wurden soweit möglich mit den vier Starthänden abgeglichen. Speicherung nur lokal.'))return;
 const ts=palastBuildTricks(p),id=p.gameId.trim()?'palast-'+p.gameId.trim():'palast-'+uid();if(stitch.archive.some(g=>g.id===id)){alert('Diese Partie ist bereits gespeichert.');return;}
 const game=palastAsGame(p,ts);game.id=id;game.source='palast';game.palastGameId=p.gameId.trim();game.palastPlayerAlias=p.alias.trim();game.started=p.date+'T12:00:00';game.finished=new Date().toISOString();game.fairPlay=true;game.partnerMode='manual';
 game.imageHash=typeof p.imageHash==='string'?p.imageHash:'';game.linkedGameId=null;game.role=stitchMyDeclarerTeam(game)?'declarer':'defender';
 const audit=palastCrosscheck(p);
 if(audit?.ok){game.initialHands=Object.fromEntries(PALAST_SEATS.map(s=>[s,[...p.startHands.seats[s]]]));game.initialHandsSource='palast-photo-crosschecked-v4.8';}
 for(const t of ts)t.winner=stitchTeamForSeat(t.winnerSeat,game)||'pending';
 const previousLength=stitch.archive.length;stitch.archive.push(game);
 if(!saveStitch()){stitch.archive.splice(previousLength);return;}
 const target=game.id;palastDraft=null;mentorGameId=target;mentorStep=0;mentorTab='tricks';switchTab('mentor');
 flash('Partie importiert ✓ · Wastl schaut mit dir drüber');
}
document.addEventListener('click',e=>{
 const jump=e.target.closest('a[href^="#palast-card-"]');
 if(jump){const target=document.getElementById(jump.getAttribute('href').slice(1));const details=target?.closest('details.palast-trick');if(details)details.open=true;}
 if(e.target.closest('#palastStart')){palastDraft=palastNew();mentorGameId='';palastRefresh(false);window.scrollTo(0,0);return;}
 if(e.target.closest('#palastCancel')){palastDraft=null;palastRefresh(false);window.scrollTo(0,0);return;}
 if(e.target.closest('#palastRecognize')){
  if(!palastDraft?.small)return;const button=e.target.closest('button');button.disabled=true;button.textContent='Erkennung läuft …';
  setTimeout(()=>{try{const locked=Object.fromEntries(palastDraft.userEdited.flatMap((is,i)=>is&&palastDraft.tricks[i]?[[i,palastDraft.tricks[i]]]:[]));palastApplyRecognition(palastDraft,locked);palastRefresh();flash('Kartenvorschläge aktualisiert · Änderungen bleiben erhalten');}catch(err){console.error(err);alert(err?.message||'Erkennung fehlgeschlagen. Bitte die Karten manuell auswählen.');button.disabled=false;}},50);return;
 }
 if(e.target.closest('#palastPickClose')||e.target.classList.contains('palast-picker-backdrop')){palastDraft.picking=-1;palastRefresh();return;}
 const pick=e.target.closest('[data-palast-pick]');if(pick&&palastDraft){palastDraft.picking=Number(pick.dataset.palastPick);palastRefresh();return;}
 const choice=e.target.closest('[data-palast-pick-choice]');if(choice&&palastDraft&&palastDraft.picking>=0){const i=palastDraft.picking,id=choice.dataset.palastPickChoice;palastDraft.tricks[i]=id;palastDraft.handConfirmed=false;palastDraft.scores[i]=999;palastDraft.userEdited[i]=true;palastDraft.picking=-1;palastRefresh();return;}
 const suggest=e.target.closest('[data-palast-suggest]');
 if(suggest&&palastDraft){const i=Number(suggest.dataset.palastSuggest),id=suggest.dataset.card;if(i>=0&&i<32&&CARD_MAP[id]){palastDraft.tricks[i]=id;palastDraft.handConfirmed=false;palastDraft.scores[i]=999;palastDraft.userEdited[i]=true;palastRefresh();}return;}
 if(e.target.closest('#palastClearCards')){if(!confirm('Alle Kartenzuordnungen leeren?'))return;palastDraft.tricks.fill('');palastDraft.handConfirmed=false;palastDraft.scores.fill(999);palastDraft.userEdited.fill(false);palastDraft.uncertain.fill(false);palastDraft.alternatives=Array.from({length:32},()=>[]);palastDraft.recognized=false;palastRefresh();return;}
 if(e.target.closest('#palastSave')){palastSave();return;}
},true);
document.addEventListener('change',e=>{
 if(e.target.id==='palastFile'){const file=e.target.files?.[0];if(file)palastLoad(file);return;}
 if(!palastDraft)return;
 const card=e.target.closest('[data-palast-card]');if(card){const at=Number(card.dataset.palastCard);palastDraft.tricks[at]=card.value;palastDraft.handConfirmed=false;palastDraft.scores[at]=999;palastDraft.userEdited[at]=true;palastRefresh();return;}
 const leader=e.target.closest('[data-palast-leader]');if(leader){palastDraft.leaders[Number(leader.dataset.palastLeader)]=leader.value;palastDraft.handConfirmed=false;palastRefresh();return;}
 const alias=e.target.closest('[data-palast-alias]');if(alias){palastDraft.alias=alias.value.trim().slice(0,45);palastSetAlias(palastDraft.alias);palastDraft.selfSeatManual=false;palastTryFindMySeat(palastDraft);palastResetMeta(palastDraft);palastRefresh();return;}
 const confirmation=e.target.closest('[data-palast-confirm]');if(confirmation){palastDraft[confirmation.dataset.palastConfirm]=confirmation.checked;palastRefresh();return;}
 const setting=e.target.closest('[data-palast-config]');if(setting){const key=setting.dataset.palastConfig;palastDraft[key]=setting.value;
  if(key==='mySeat'){palastDraft.selfSeatManual=!!setting.value;palastDraft.handConfirmed=false;palastDraft.metaConfirmed=false;}
  else if(['type','trumpSuit','calledSuit','declarerSeat','firstSeat'].includes(key)){palastResetMeta(palastDraft);}
  else if(key==='date'||key==='gameId')palastDraft.metaConfirmed=false;
  palastRefresh();return;}
 const name=e.target.closest('[data-palast-name]');if(name){palastDraft.seatNames[name.dataset.palastName]=name.value.trim().slice(0,28);palastTryFindMySeat(palastDraft);palastResetMeta(palastDraft);palastRefresh();return;}
},true);
