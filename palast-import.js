/* Schafkopftracker v3.6: fully local screenshot-assisted Schafkopf Palast import.
 * The recognizer makes fallible SUGGESTIONS. Never save without full user review.
 * No network requests, third-party APIs, uploads or external card art.
 */
let palastDraft=null;
const PALAST_POSITIONS=[
  [421,629],[21,780],[221,780],[421,780],
  [21,931],[221,931],[421,931],[21,1081]
];
const PALAST_SEATS=['vh','mh','hh','g'];
const PALAST_SUIT_LABEL={eichel:'Eichel',gras:'Gras',herz:'Herz',schell:'Schell'};
const PALAST_CHOICE_ORDER=['eichel','gras','herz','schell'].flatMap(s=>['A','10','K','O','U','9','8','7'].map(r=>s+'-'+r));
const PALAST_TEMPLATE_PIXELS=PALAST_SIGNATURES.map(([id,s])=>{const binary=atob(s),bits=new Uint8Array(binary.length);for(let i=0;i<bits.length;i++)bits[i]=binary.charCodeAt(i);return {id,bits};});
function palastNew(){
 return {image:null,small:null,name:'',tricks:Array(32).fill(''),scores:Array(32).fill(999),fileName:'',fileSize:0,
 type:'rufspiel',calledSuit:'gras',trumpSuit:'herz',firstSeat:'vh',leaders:Array(8).fill('auto'),declarerSeat:'hh',mySeat:'mh',
 seatNames:{vh:'Spieler VH',mh:'Spieler MH',hh:'Spieler HH',g:'Spieler G'},
 date:nowISO(),gameId:'',recognized:false,notice:'',selected:0};
}
function palastImageCanvas(img){const c=document.createElement('canvas');c.width=600;c.height=1350;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,600,1350);return c;}
function palastPatch(ctx,x,y){
 const c=document.createElement('canvas');c.width=10;c.height=20;
 c.getContext('2d',{willReadFrequently:true}).drawImage(ctx.canvas,x+1,y+3,14,27,0,0,10,20);
 const rgba=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,10,20).data;
 const rgb=new Uint8Array(600);for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}return rgb;
}
function palastPixelDistance(a,b){let value=0;for(let j=0;j<a.length;j++)value+=Math.abs(a[j]-b[j]);return value/a.length;}
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
function palastRecognize(c){
 const ctx=c.getContext('2d',{willReadFrequently:true}),matrix=[],selected=[];
 for(let t=0;t<8;t++)for(let k=0;k<4;k++){
  const [bx,by]=PALAST_POSITIONS[t],x=bx+k*40;
  const crops=[];for(const dx of [-2,-1,0,1,2])for(const dy of [-3,-2,-1,0,1,2,3])crops.push(palastPatch(ctx,x+dx,by+dy));
  matrix.push(PALAST_TEMPLATE_PIXELS.map(ref=>{let best=Infinity;for(const pix of crops)best=Math.min(best,palastPixelDistance(pix,ref.bits));return best;}));
 }
 const assigned=palastAssign(matrix);
 for(let i=0;i<32;i++){const k=assigned[i];selected.push({id:PALAST_TEMPLATE_PIXELS[k].id,score:matrix[i][k]});}
 return selected;
}
function palastImageSlice(c,x,y,width=164,height=105,targetWidth=328){const crop=document.createElement('canvas');crop.width=targetWidth;crop.height=Math.round(targetWidth*height/width);crop.getContext('2d').drawImage(c,x,y,width,height,0,0,crop.width,crop.height);return crop.toDataURL('image/jpeg',.82);}
function palastScoreLabel(score){return score<32?'guter Vorschlag':score<55?'prüfen':'unsicher'};
function palastSeatSelect(value,attr){return PALAST_SEATS.map(s=>`<option value="${s}" ${s===value?'selected':''}>${{vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'}[s]}</option>`).join('');}
function palastReview(){
 const p=palastDraft;if(!p)return {errors:['Kein Bild geladen.'],notes:[],valid:false};
 const errors=[],notes=[];const filled=p.tricks.filter(Boolean),seen=new Set(filled),dupes=[...new Set(filled.filter((x,i)=>filled.indexOf(x)!==i))];
 if(p.tricks.length!==32||filled.length!==32)errors.push(`${32-filled.length} Karten müssen noch zugeordnet werden.`);
 if(dupes.length)errors.push(`${dupes.length} Karte(n) mehrfach vergeben: ${dupes.slice(0,4).map(c=>CARD_MAP[c]?.name||c).join(', ')}${dupes.length>4?' …':''}.`);
 let eyes=0;for(const id of filled)eyes+=CARD_MAP[id]?.eyes||0;
 if(filled.length===32&&eyes!==120)errors.push(`Es ergeben sich nur ${eyes} statt 120 Augen.`);
 if(!validDate(p.date))errors.push('Bitte gültiges Spieldatum auswählen.');
 if(!['rufspiel','solo','wenz','geier','farbwenz','farbgeier','kreuzrunde','hochzeit','bettel','ramsch'].includes(p.type))errors.push('Unbekannte Spielart.');
 if(p.type==='rufspiel'&&p.declarerSeat===null)errors.push('Für Rufspiel fehlt der Ansager.');
 const ids=new Set(stitch.archive.map(g=>g.id));if(p.gameId.trim()&&ids.has('palast-'+p.gameId.trim()))errors.push('Die Spielnummer wurde bereits importiert.');
 if(filled.length===32&&!dupes.length&&eyes===120){
  const ts=palastBuildTricks(p);
  if(ts.length!==8)errors.push('Stichfolge konnte nicht rekonstruiert werden.');
  else{
   const nextLeaders=ts.map((t,i)=>t.leaderSeat).join(', ');
   notes.push('Vorschau der ermittelten Ausspieler: '+nextLeaders.toUpperCase());
   if(p.type==='rufspiel'){const ace=p.calledSuit+'-A',hasAce=ts.some(t=>t.cards.includes(ace));if(!hasAce)errors.push('Gerufenes Ass fehlt.');}
   // Detect violations using reconstructed hands and follow suit.
   const test=palastAsGame(p,ts);const stateHands=palastHandsBySeat(test);
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
 if(p.recognized){const low=p.scores.filter(n=>n>=55).length;notes.unshift(`${low} automatische Kartenvorschläge sind besonders unsicher. Bitte alle 32 anhand des Screenshots prüfen.`);}
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
function palastAsGame(p,tricks){return {id:'',type:p.type,calledSuit:p.calledSuit,trumpSuit:p.trumpSuit,partnerMode:'auto',role:'defender',firstSeat:p.firstSeat,mySeat:p.mySeat,declarerSeat:p.declarerSeat,partnerSeat:null,seatNames:p.seatNames,tricks};}
function palastHandsBySeat(g){
 const hands=Object.fromEntries(PALAST_SEATS.map(s=>[s,[]]));
 for(const t of g.tricks)for(let i=0;i<4;i++)hands[stitchPositionFromLeader(t.leaderSeat,i)].push(t.cards[i]);
 return PALAST_SEATS.every(s=>hands[s].length===8)?hands:null;
}
function palastImportUI(){
 const p=palastDraft;if(!p)return '';
 const valid=palastReview();const hasPicture=!!p.small;
 const last=p.selected;
 const controls=(id,value,options)=>`<label class="field">${id}<select data-palast-config="${options}">${value}</select></label>`;
 const fields=`<div class="palast-settings">
 <label>Spielnummer (optional)<input data-palast-config="gameId" maxlength="42" value="${esc(p.gameId)}" placeholder="z. B. 348.215.100"></label>
 <label>Datum<input data-palast-config="date" type="date" value="${esc(p.date)}"></label>
 <label>Spielart<select data-palast-config="type">${[['rufspiel','Rufspiel'],['solo','Farbsolo'],['wenz','Wenz'],['geier','Geier'],['farbwenz','Farbwenz'],['farbgeier','Farbgeier'],['hochzeit','Hochzeit'],['kreuzrunde','Kreuzrunde'],['bettel','Bettel'],['ramsch','Ramsch']].map(([k,l])=>`<option value="${k}" ${p.type===k?'selected':''}>${l}</option>`).join('')}</select></label>
 <label>${p.type==='rufspiel'?'Gerufene Farbe':'Trumpffarbe (falls relevant)'}<select data-palast-config="${p.type==='rufspiel'?'calledSuit':'trumpSuit'}">${(p.type==='rufspiel'?['eichel','gras','schell']:['eichel','gras','herz','schell']).map(id=>`<option value="${id}" ${(p.type==='rufspiel'?p.calledSuit:p.trumpSuit)===id?'selected':''}>${PALAST_SUIT_LABEL[id]}</option>`).join('')}</select></label>
 <label>Ansager<select data-palast-config="declarerSeat">${palastSeatSelect(p.declarerSeat)}</select></label>
 <label>Mein Platz<select data-palast-config="mySeat">${palastSeatSelect(p.mySeat)}</select></label>
 <label>Erster Ausspieler<select data-palast-config="firstSeat">${palastSeatSelect(p.firstSeat)}</select></label>
 </div><details class="palast-names"><summary>Spielernamen anpassen (optional)</summary><div class="palast-settings">${PALAST_SEATS.map(id=>`<label>${{vh:'Vorhand',mh:'Mittelhand',hh:'Hinterhand',g:'Geber'}[id]}<input data-palast-name="${id}" maxlength="28" value="${esc(p.seatNames[id])}"></label>`).join('')}</div></details>`;
 const review=valid.errors.map(s=>`<p class="palast-err">${esc(s)}</p>`).join('')+valid.notes.map(s=>`<p class="palast-note">${esc(s)}</p>`).join('');
 const renders=hasPicture?Array.from({length:8},(_,ti)=>{const [x,y]=PALAST_POSITIONS[ti];return `<section class="palast-trick" id="palast-trick-${ti}"><div class="palast-trick-h"><b>Stich ${ti+1}</b><span>${p.tricks.slice(ti*4,ti*4+4).filter(Boolean).length} / 4 Karten</span></div><label class="palast-lead">Erster Ausspieler <select data-palast-leader="${ti}" ${ti===0?'disabled':''}><option value="auto" ${p.leaders[ti]==='auto'?'selected':''}>${ti===0?'Wie oben festgelegt':'Automatisch aus dem vorherigen Stich'}</option>${PALAST_SEATS.map(v=>`<option value="${v}" ${p.leaders[ti]===v?'selected':''}>${{vh:'VH – Vorhand',mh:'MH – Mittelhand',hh:'HH – Hinterhand',g:'G – Geber'}[v]}</option>`).join('')}</select></label>
 <img loading="lazy" class="palast-crop" src="${palastImageSlice(p.small,x,y-11,162,118,324)}" alt="Bildauszug aus Stich ${ti+1}">
 <div class="palast-trick-grid">${Array.from({length:4},(_,ci)=>{const at=ti*4+ci,id=p.tricks[at],score=p.scores[at];return `<label class="palast-card-choice"><span>Karte ${ci+1}${p.recognized?` <small>${palastScoreLabel(score)}</small>`:''}</span><select data-palast-card="${at}" aria-label="Stich ${ti+1}, Karte ${ci+1}"><option value="">Bitte auswählen</option>${PALAST_CHOICE_ORDER.map(v=>`<option value="${v}" ${v===id?'selected':''}>${CARD_MAP[v].name}</option>`).join('')}</select>${id?`<img class="palast-mini" src="cards/${id}.webp" alt="${esc(CARD_MAP[id]?.name||id)}">`:''}</label>`;}).join('')}</div></section>`;}).join(''):'';
 return `<div class="content-page palast-import"><button type="button" class="btn ghost" id="palastCancel">← Zurück zu Wastl</button><div class="palast-hero"><h2>Schafkopf Palast importieren</h2><p>Alle Daten bleiben auf deinem Gerät. Die automatische Kartenerkennung liefert <b>Vorschläge</b>, keine garantierte Erkennung.</p></div>
 <section class="card palast-section"><label class="palast-upload"><span>📷 Geteiltes Spielbild auswählen</span><input id="palastFile" type="file" accept="image/png,image/jpeg,image/webp"></label>${!hasPicture?'<p class="help">Wähle das vollständige Hochformatbild aus Schafkopf Palast mit vier Spielerhänden und allen acht Stichen. Unterstützt wird vorerst die bekannte Bildaufteilung im Format ca. 600 × 1350.</p>':`<p class="palast-image-meta">${esc(p.fileName)} · ${Math.round(p.fileSize/1024)} KB</p><img class="palast-screenshot" src="${p.image}" alt="Importiertes Schafkopf-Palast-Bild"><div class="palast-actions"><button type="button" class="btn" id="palastRecognize">↻ Karten automatisch vorschlagen</button><button type="button" class="btn secondary" id="palastClearCards">Kartenzuordnung leeren</button></div>`}</section>
 ${hasPicture?`<section class="card palast-section"><h3>Spielangaben</h3>${fields}</section><section class="card palast-section"><div class="palast-section-title"><h3>Stiche und Karten kontrollieren</h3><span class="badge">${p.tricks.filter(Boolean).length}/32</span></div><p class="help">Links nach rechts: Reihenfolge, in der die Karten gespielt wurden. Vergleiche jeden Bildausschnitt mit den Vorschlägen und korrigiere Fehler. Der Stichgewinner wird aus den Karten berechnet.</p>${renders}</section><section class="card palast-section"><h3>Prüfergebnis</h3>${review}<button id="palastSave" class="btn" type="button" ${!valid.valid?'disabled':''}>✓ Geprüfte Partie bei Wastl speichern</button><p class="help">Erst nach deiner Bestätigung wird die Partie als Training gespeichert. Es werden keine Geldbeträge oder Spielabende verändert.</p></section>`:''}</div>`;
}
function palastRefresh(keepY=true){let y=window.scrollY;render();if(keepY)window.scrollTo(0,y);}
function palastLoad(file){
 if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)){alert('Bitte ein JPG-, PNG- oder WebP-Bild wählen.');return;}
 if(file.size>12*1024*1024){alert('Das Bild ist größer als 12 MB. Bitte als normales Screenshot-JPG exportieren.');return;}
 const reader=new FileReader();reader.onerror=()=>alert('Die Datei konnte nicht gelesen werden.');reader.onload=()=>{
  const img=new Image();img.onerror=()=>alert('Das Bild konnte nicht geöffnet werden.');img.onload=()=>{
   const ratio=img.width/img.height;if(Math.abs(ratio-600/1350)>.055){alert('Dieses Bild hat eine andere Aufteilung als die bekannten geteilten Palast-Spielbilder (ca. 600 × 1350). Der Import kann die Kartenbereiche eventuell nicht richtig finden.');}
   palastDraft.small=palastImageCanvas(img);palastDraft.image=reader.result;palastDraft.fileName=file.name;palastDraft.fileSize=file.size;palastDraft.recognized=false;
   // Let user intentionally trigger matching, since proposals must be reviewed.
   palastRefresh(false);window.scrollTo(0,0);
  };img.src=reader.result;
 };reader.readAsDataURL(file);
}
function palastSave(){
 const p=palastDraft,check=palastReview();if(!check.valid){alert('Bitte prüfe die Karten: '+check.errors.join(' '));palastRefresh();return;}
 if(!confirm('Hast du alle 32 Karten mit dem Screenshot verglichen? Die Partie wird nur lokal zu Wastls Training gespeichert.'))return;
 const ts=palastBuildTricks(p),id=p.gameId.trim()?'palast-'+p.gameId.trim():'palast-'+uid();if(stitch.archive.some(g=>g.id===id)){alert('Diese Partie ist bereits gespeichert.');return;}
 const game=palastAsGame(p,ts);game.id=id;game.started=p.date+'T12:00:00';game.finished=new Date().toISOString();game.fairPlay=true;game.partnerMode=p.type==='rufspiel'?'auto':'manual';
 game.partnerSeat=null;game.linkedGameId=null;game.role=stitchMyDeclarerTeam(game)?'declarer':'defender';
 for(const t of ts)t.winner=stitchTeamForSeat(t.winnerSeat,game)||'pending';
 const previousLength=stitch.archive.length;stitch.archive.push(game);
 if(!saveStitch()){stitch.archive.splice(previousLength);return;}
 const target=game.id;palastDraft=null;mentorGameId=target;mentorStep=0;mentorTab='tricks';switchTab('mentor');
 flash('Partie importiert ✓ · Wastl schaut mit dir drüber');
}
document.addEventListener('click',e=>{
 if(e.target.closest('#palastStart')){palastDraft=palastNew();mentorGameId='';palastRefresh(false);window.scrollTo(0,0);return;}
 if(e.target.closest('#palastCancel')){palastDraft=null;palastRefresh(false);window.scrollTo(0,0);return;}
 if(e.target.closest('#palastRecognize')){
  if(!palastDraft?.small)return;const button=e.target.closest('button');button.disabled=true;button.textContent='Erkennung läuft …';
  setTimeout(()=>{try{const got=palastRecognize(palastDraft.small);palastDraft.tricks=got.map(x=>x.id);palastDraft.scores=got.map(x=>x.score);palastDraft.recognized=true;palastRefresh();flash('32 Vorschläge erstellt · bitte vollständig kontrollieren');}catch(err){console.error(err);alert('Erkennung fehlgeschlagen. Bitte die Karten manuell auswählen.');button.disabled=false;}},50);return;
 }
 if(e.target.closest('#palastClearCards')){if(!confirm('Alle Kartenzuordnungen leeren?'))return;palastDraft.tricks.fill('');palastDraft.scores.fill(999);palastDraft.recognized=false;palastRefresh();return;}
 if(e.target.closest('#palastSave')){palastSave();return;}
},true);
document.addEventListener('change',e=>{
 if(e.target.id==='palastFile'){const file=e.target.files?.[0];if(file)palastLoad(file);return;}
 if(!palastDraft)return;
 const card=e.target.closest('[data-palast-card]');if(card){const at=Number(card.dataset.palastCard);palastDraft.tricks[at]=card.value;palastDraft.scores[at]=999;palastRefresh();return;}
 const leader=e.target.closest('[data-palast-leader]');if(leader){palastDraft.leaders[Number(leader.dataset.palastLeader)]=leader.value;palastRefresh();return;}
 const setting=e.target.closest('[data-palast-config]');if(setting){const key=setting.dataset.palastConfig;palastDraft[key]=setting.value;palastRefresh();return;}
 const name=e.target.closest('[data-palast-name]');if(name){palastDraft.seatNames[name.dataset.palastName]=name.value.trim().slice(0,28);palastRefresh();return;}
},true);
