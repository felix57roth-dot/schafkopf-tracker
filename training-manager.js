/* Schafkopftracker 3.9 - local archive management and simpler Palast review.
   No network requests, no changes to financial ledger, no new storage format. */
let trainingEditing=null,trainingEditingStep=0,trainingMessage='',palastOpenTricks=new Set();
const TRAINING_EDIT_TYPES=[['rufspiel','Rufspiel'],['solo','Farbsolo'],['wenz','Wenz'],['geier','Geier'],['farbwenz','Farbwenz'],['farbgeier','Farbgeier'],['hochzeit','Hochzeit'],['kreuzrunde','Kreuzrunde'],['bettel','Bettel'],['ramsch','Ramsch'],['tout','Tout']];
const TRAINING_EDIT_SUITS=[['eichel','Eichel'],['gras','Gras'],['herz','Herz'],['schell','Schell']];
const TRAINING_EDIT_SEATS=[['vh','Vorhand'],['mh','Mittelhand'],['hh','Hinterhand'],['g','Geber']];
function trainingSelect(options,value,attr,includeBlank=false){return `<select ${attr}>${includeBlank?'<option value="">Bitte auswählen</option>':''}${options.map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`).join('')}</select>`;}
function trainingStartEdit(id){
 const g=stitch.archive.find(g=>String(g.id)===id);if(!g)return;
 trainingEditing=JSON.parse(JSON.stringify(g));trainingEditingStep=0;trainingMessage='';
 palastDraft=null;mentorGameId='';switchTab('mentor');
}
function trainingRebuild(g){
 if(!TRAINING_EDIT_TYPES.some(([t])=>t===g.type))throw Error('Bitte eine gültige Spielart wählen.');
 if(!TRAINING_EDIT_SEATS.some(([s])=>s===g.mySeat))throw Error('Deinen Platz auswählen.');
 if(!TRAINING_EDIT_SEATS.some(([s])=>s===g.declarerSeat))throw Error('Den Ansager auswählen.');
 if(g.type==='rufspiel'&&!['eichel','gras','schell'].includes(g.calledSuit))throw Error('Beim Rufspiel muss die gerufene Farbe angegeben werden.');
 if(['solo','farbwenz','farbgeier','tout'].includes(g.type)&&!TRAINING_EDIT_SUITS.some(([s])=>s===g.trumpSuit))throw Error('Bitte die Trumpffarbe auswählen.');
 if(!Array.isArray(g.tricks)||g.tricks.length!==8||g.tricks.some(t=>t.cards?.length!==4||t.cards.some(id=>!CARD_MAP[id])))throw Error('Die Partie benötigt acht vollständige Stiche.');
 const all=g.tricks.flatMap(t=>t.cards);if(new Set(all).size!==32)throw Error('Jede der 32 Karten darf nur einmal vorkommen.');
 if(all.reduce((s,id)=>s+CARD_MAP[id].eyes,0)!==120)throw Error('Die Karten müssen zusammen 120 Augen ergeben.');
 const first=g.firstSeat||g.tricks[0].leaderSeat;
 if(!TRAINING_EDIT_SEATS.some(([s])=>s===first))throw Error('Der erste Ausspieler fehlt.');
 let leader=first;const copy={...g,firstSeat:first,tricks:[]};
 for(let i=0;i<8;i++){
  const cards=[...g.tricks[i].cards];const winnerIndex=stitchWinnerIndex(cards,g.type,g.trumpSuit||'herz');
  if(winnerIndex<0)throw Error(`Stich ${i+1} konnte nicht berechnet werden.`);
  const winnerSeat=stitchPositionFromLeader(leader,winnerIndex);
  copy.tricks.push({cards,leaderSeat:leader,winnerSeat,eyes:cards.reduce((x,id)=>x+CARD_MAP[id].eyes,0),winner:'pending'});
  leader=winnerSeat;
 }
 if(copy.type==='rufspiel'){
  const hands=Object.fromEntries(TRAINING_EDIT_SEATS.map(([s])=>[s,[]]));
  for(const t of copy.tricks)t.cards.forEach((cardId,i)=>hands[stitchPositionFromLeader(t.leaderSeat,i)].push(cardId));
  copy.partnerSeat=TRAINING_EDIT_SEATS.map(([s])=>s).find(s=>s!==copy.declarerSeat&&hands[s].includes(copy.calledSuit+'-A'))||null;
  if(!copy.partnerSeat)throw Error('Das gerufene Ass konnte keinem Partner zugeordnet werden.');
 }else{copy.partnerSeat=null;}
 copy.role=stitchMyDeclarerTeam(copy)?'declarer':'defender';
 copy.tricks.forEach(t=>{t.winner=stitchTeamForSeat(t.winnerSeat,copy)||'pending';});
 return copy;
}
function trainingSaveEdit(){
 const before=stitch.archive.findIndex(g=>String(g.id)===String(trainingEditing?.id));if(before<0)return;
 let updated;try{updated=trainingRebuild(trainingEditing);}catch(err){trainingMessage=err.message;render();return;}
 // A single invalid card can change the whole reconstructed hand: warn, not silently fix.
 const check=mentorStichEvidence(updated),issues=check.tricks.flatMap(t=>t.notes).filter(x=>x.heading==='Bedienpflicht prüfen');
 if(issues.length&&!confirm(`${issues.length} mögliche Bedienpflicht-Widersprüche. Möchtest du trotzdem speichern und die Partie später weiter korrigieren?`))return;
 if(updated.type!==trainingEditing.type){trainingMessage='Spielart nicht übernommen. Bitte erneut versuchen.';render();return;}
 const original=stitch.archive[before];stitch.archive[before]=updated;
 if(!saveStitch()){stitch.archive[before]=original;return;}
 // Verify persistence before closing, so a Solo cannot silently turn back into Rufspiel.
 let verified=false;try{const saved=JSON.parse(localStorage.getItem(STITCH_KEY)||'{}');verified=!!saved.archive?.some(g=>String(g.id)===String(updated.id)&&g.type===updated.type);}catch{}
 if(!verified){stitch.archive[before]=original;saveStitch();trainingMessage='Die Spielart wurde nicht korrekt gespeichert. Bitte erneut versuchen.';render();return;}
 trainingEditing=null;trainingMessage='';mentorGameId='';render();flash('Partie aktualisiert ✓');
}
function trainingDelete(id){
 const idx=stitch.archive.findIndex(g=>String(g.id)===id);if(idx<0)return;
 const g=stitch.archive[idx];
 if(!confirm(`Trainingspartie vom ${new Date(g.started).toLocaleDateString('de-DE')} wirklich löschen? Das betrifft nur den Wastl-Verlauf, nicht deine Abende oder Finanzen.`))return;
 stitch.archive.splice(idx,1);if(!saveStitch()){stitch.archive.splice(idx,0,g);return;}
 if(mentorGameId===id)mentorGameId='';trainingEditing=null;render();flash('Trainingspartie gelöscht');
}
function trainingEditUI(){
 const g=trainingEditing;if(!g)return '';
 const index=trainingEditingStep, t=g.tricks[index],name=TRAINING_EDIT_TYPES.find(([x])=>x===g.type)?.[1]||'Unbekannt';
 const suit=TRAINING_EDIT_SUITS.find(([x])=>x===g.trumpSuit)?.[1];
 const colors=TRAINING_EDIT_SUITS.map(([s])=>s);
 return `<div class="training-edit-page"><div class="training-edit-head"><button type="button" class="btn ghost" data-training-cancel>← Partien</button><div><h2>Partie bearbeiten</h2><p>${esc(name)}${['solo','tout','farbwenz','farbgeier'].includes(g.type)?' '+esc(suit||''):''} · ${new Date(g.started).toLocaleDateString('de-DE')}</p></div></div>
 <div class="training-edit-card"><h3>Spielangaben korrigieren</h3><p>Bei einem falsch übernommenen Solo genügt es, hier die Spielart und Trumpffarbe zu ändern und zu speichern. Du musst den Screenshot nicht erneut importieren.</p>
 <div class="training-edit-grid"><label>Spielart ${trainingSelect(TRAINING_EDIT_TYPES,g.type,'data-training-field="type"')}</label>
 ${['solo','tout','farbwenz','farbgeier'].includes(g.type)?`<label>Trumpffarbe ${trainingSelect(TRAINING_EDIT_SUITS,g.trumpSuit,'data-training-field="trumpSuit"')}</label>`:''}
 ${g.type==='rufspiel'?`<label>Gerufene Farbe ${trainingSelect(TRAINING_EDIT_SUITS.filter(([s])=>s!=='herz'),g.calledSuit,'data-training-field="calledSuit"')}</label>`:''}
 <label>Mein Platz ${trainingSelect(TRAINING_EDIT_SEATS,g.mySeat,'data-training-field="mySeat"')}</label>
 <label>Ansager ${trainingSelect(TRAINING_EDIT_SEATS,g.declarerSeat,'data-training-field="declarerSeat"')}</label>
 <label>Erster Ausspieler ${trainingSelect(TRAINING_EDIT_SEATS,g.firstSeat||g.tricks[0].leaderSeat,'data-training-field="firstSeat"')}</label></div>
 <details class="training-names"><summary>Spielernamen bearbeiten</summary><div class="training-edit-grid">${TRAINING_EDIT_SEATS.map(([id,label])=>`<label>${label}<input data-training-name="${id}" maxlength="28" value="${esc(g.seatNames?.[id]||'')}"></label>`).join('')}</div></details></div>
 <div class="training-edit-card"><div class="training-edit-stitch"><h3>Stich ${index+1} von 8</h3><div><button type="button" data-training-step="${index-1}" ${index===0?'disabled':''}>‹</button><button type="button" data-training-step="${index+1}" ${index===7?'disabled':''}>›</button></div></div><p>Nur fehlerhafte Karten ändern. Wenn du eine bereits verwendete Karte wählst, tauscht die App sie automatisch aus.</p>
 <div class="training-edit-cards">${t.cards.map((id,at)=>`<label><span>${at+1}. Karte</span><img src="cards/${id}.webp" alt="${esc(CARD_MAP[id]?.name||'')}"/><select data-training-card="${index*4+at}">${PALAST_CHOICE_ORDER.map(x=>`<option value="${x}" ${x===id?'selected':''}>${esc(CARD_MAP[x].name)}</option>`).join('')}</select></label>`).join('')}</div></div>
 ${trainingMessage?`<p class="training-error" role="alert">${esc(trainingMessage)}</p>`:''}
 <div class="training-edit-actions"><button type="button" class="btn" data-training-save>Änderungen speichern</button><button type="button" class="btn ghost" data-training-cancel>Abbrechen</button></div></div>`;
}
// Enhance the existing Wastl archive, without changing existing game data.
const _mentorUIv38=mentorUI;
mentorUI=function(){
 if(trainingEditing)return trainingEditUI();
 const html=_mentorUIv38();
 if(mentorGameId||palastDraft)return html;
 return html.replace(/<button class="mentor-game-row"[\s\S]*?<\/button>/g,match=>{
  const id=match.match(/data-mentor-open="([^"]+)"/)?.[1];
  if(!id)return match;
  return `<div class="training-item">${match}<div class="training-item-actions"><button type="button" data-training-edit="${id}" aria-label="Partie bearbeiten">✎ Bearbeiten</button><button type="button" data-training-delete="${id}" aria-label="Partie löschen">× Löschen</button></div></div>`;
 });
};
// Use a short, collapsible review on imported screenshot: one trick at a time.
const _palastImportUIv38=palastImportUI;
palastImportUI=function(){
 const html=_palastImportUIv38();if(!palastDraft?.small)return html;
 const wrapper=document.createElement('div');wrapper.innerHTML=html;
 const page=wrapper.querySelector('.palast-import');if(!page)return html;
 page.classList.add('palast-quick');
 const hero=page.querySelector('.palast-hero');if(hero){hero.innerHTML='<h2>Partie importieren</h2><p>1. Spielart und deinen Platz wählen · 2. nur auffällige Karten prüfen · 3. speichern. Die Bilderkennung ist eine Hilfe, keine Garantie.</p>';}
 const screenshot=page.querySelector('img.palast-screenshot');
 if(screenshot){const d=document.createElement('details');d.className='palast-optional-image';d.innerHTML='<summary>Originalbild vollständig ansehen</summary>';screenshot.parentNode.insertBefore(d,screenshot);d.appendChild(screenshot);}
 const players=page.querySelector('.palast-player-names');if(players){const d=document.createElement('details');d.className='palast-optional-names';d.innerHTML='<summary>Spielernamen zuordnen (optional)</summary>';players.parentNode.insertBefore(d,players);d.appendChild(players);}
 const handCompare=page.querySelector('.palast-hand-compare');if(handCompare){const d=document.createElement('details');d.className='palast-optional-image';d.innerHTML='<summary>Original-Handkarten zum Vergleich aufklappen</summary>';handCompare.parentNode.insertBefore(d,handCompare);d.appendChild(handCompare);}
 const trickSections=[...page.querySelectorAll('.palast-trick')];
 let doubtful=0;
 trickSections.forEach((section,ti)=>{
  const uncertain=palastDraft.uncertain.slice(ti*4,ti*4+4).filter((value,i)=>value&&!palastDraft.userEdited[ti*4+i]).length;
  if(uncertain)doubtful++;
  const d=document.createElement('details');d.className='palast-quick-trick';d.id=`palast-trick-${ti}`;
  if(palastOpenTricks.has(ti))d.open=true;
  d.innerHTML=`<summary>Stich ${ti+1} <span>${uncertain?`${uncertain} unsichere Karte${uncertain===1?'':'n'}`:'Karten ansehen'} ▾</span></summary>`;
  section.parentNode.insertBefore(d,section);section.removeAttribute('id');d.appendChild(section);
 });
 // An error indicator always remains visible; clicking it opens the corresponding trick.
 const suspect=page.querySelector('.palast-suspects');
 if(suspect){suspect.classList.add('palast-quick-suspects');suspect.querySelectorAll('a[href^="#palast-card-"]').forEach(a=>a.dataset.quickSuspect='1');}
 const sectionTitle=page.querySelector('.palast-section-title');
 if(sectionTitle){const hint=document.createElement('p');hint.className='palast-quick-hint';hint.textContent=`${doubtful} von 8 Stichen haben unsichere Vorschläge. Klappe zunächst nur diese Stiche auf; bei Unstimmigkeiten weitere Stiche prüfen.`;sectionTitle.after(hint);}
 return wrapper.innerHTML;
};
// A screenshot import must never silently change its declared game type.
const _palastSavev38=palastSave;
palastSave=function(){
 const requested=palastDraft?.type||'',number=palastDraft?.gameId?.trim()||'';
 _palastSavev38();
 if(!requested||palastDraft)return;
 const record=mentorSelected();
 if(record&&record.type!==requested){alert('Die gespeicherte Spielart stimmt nicht mit deiner Auswahl überein. Bitte korrigiere sie über Bearbeiten.');}
};
document.addEventListener('click',e=>{
 const edit=e.target.closest('[data-training-edit]');if(edit){trainingStartEdit(edit.dataset.trainingEdit);return;}
 const del=e.target.closest('[data-training-delete]');if(del){trainingDelete(del.dataset.trainingDelete);return;}
 if(e.target.closest('[data-training-cancel]')){trainingEditing=null;trainingMessage='';mentorGameId='';render();return;}
 if(e.target.closest('[data-training-save]')){trainingSaveEdit();return;}
 const step=e.target.closest('[data-training-step]');if(step&&trainingEditing){trainingEditingStep=Math.max(0,Math.min(7,Number(step.dataset.trainingStep)));render();return;}
 const suspect=e.target.closest('[data-quick-suspect]');if(suspect){const i=Number(suspect.getAttribute('href')?.match(/\d+/)?.[0]);if(Number.isFinite(i)){palastOpenTricks.add(Math.floor(i/4));render();document.getElementById(`palast-card-${i}`)?.scrollIntoView({block:'center',behavior:'smooth'});}e.preventDefault();}
},true);
document.addEventListener('change',e=>{
 if(!trainingEditing)return;
 const field=e.target.closest('[data-training-field]');
 if(field){trainingEditing[field.dataset.trainingField]=field.value;trainingMessage='';render();return;}
 const card=e.target.closest('[data-training-card]');if(card){const idx=Number(card.dataset.trainingCard),other=trainingEditing.tricks.flatMap(x=>x.cards).indexOf(card.value),old=trainingEditing.tricks[Math.floor(idx/4)].cards[idx%4];
  if(other>=0&&other!==idx)trainingEditing.tricks[Math.floor(other/4)].cards[other%4]=old;
  trainingEditing.tricks[Math.floor(idx/4)].cards[idx%4]=card.value;trainingMessage='';render();return;
 }
},true);
document.addEventListener('input',e=>{
 if(trainingEditing&&e.target.matches('[data-training-name]')){
  if(!trainingEditing.seatNames)trainingEditing.seatNames={vh:'',mh:'',hh:'',g:''};
  trainingEditing.seatNames[e.target.dataset.trainingName]=e.target.value.slice(0,28);
 }
},true);
document.addEventListener('toggle',e=>{
 const d=e.target.closest?.('.palast-quick-trick');if(!d)return;
 const i=Number(d.id?.replace('palast-trick-',''));
 if(Number.isFinite(i)){if(d.open)palastOpenTricks.add(i);else palastOpenTricks.delete(i);}
},true);
