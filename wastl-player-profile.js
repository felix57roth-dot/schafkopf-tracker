/* Wastl 5.4: dauerhaftes, offlinefaehiges Spielerprofil.
 * Einzelne Simulationen bleiben im kurzlebigen Analyse-Cache; dieses Modul
 * speichert nur kompakte Bewertungen. Keine fremden Bibliotheken/Netzwerkdaten.
 * Sterne: experimenteller Wastl-Modellindex, KEIN TrueSkill oder Expertenrating.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const Analysis=node?require('./wastl-match-analysis.js'):root.WastlMatchAnalysis;
 const api=factory(root,Analysis);
 if(node)module.exports=api;
 if(root)root.WastlPlayerProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root,Analysis){
 'use strict';
 const VERSION='5.4.0',STORAGE='wastl-player-profile-v1',FORMAT=1;
 const ENGINE='5.1.0',QUALITY='5.2.0',MAX_IMPORT=30000;
 const MIN_GAMES=5,MIN_DECISIONS=12;
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 function hash(input,seed){
  let h=seed>>>0;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0');
 }
 function fingerprint(game){
  if(!game||!Array.isArray(game.tricks)||game.tricks.length!==8)return null;
  const serial=JSON.stringify({
   type:game.type,trumpSuit:game.trumpSuit||null,calledSuit:game.calledSuit||null,
   mySeat:game.mySeat,declarerSeat:game.declarerSeat||null,partnerSeat:game.partnerSeat||null,
   tricks:game.tricks.map(t=>({leaderSeat:t.leaderSeat,cards:t.cards}))
  });
  return hash(serial,2166136261)+hash(serial,0x9e3779b9)+'-'+serial.length;
 }
 function sourceOf(game){
  if(game?.source==='bot'||String(game?.id||'').startsWith('bots-'))return 'bot';
  if(game?.source==='palast'||String(game?.id||'').startsWith('palast-'))return 'palast';
  return 'tracked';
 }
 function validRecord(r){
  if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.fingerprint!=='string'
   ||!/^[0-9a-f]{16}-\d{1,5}$/.test(r.fingerprint))return null;
  if(r.score!==null&&(!Number.isInteger(r.score)||r.score<0||r.score>100))return null;
  if(!Number.isInteger(r.informative)||r.informative<0||r.informative>8)return null;
  if(!Number.isFinite(r.savedAt)||r.savedAt<=0||r.savedAt>4102444800000)return null;
  const source=['palast','tracked','bot'].includes(r.source)?r.source:null;
  if(!source)return null;
  return {id:String(r.id||'').slice(0,120),fingerprint:r.fingerprint,
   source,type:String(r.type||'').slice(0,32),score:r.score,
   informative:r.informative,forced:clamp(Math.round(Number(r.forced)||0),0,8),
   evidence:['mittel','gering','ungenuegend'].includes(r.evidence)?r.evidence:'ungenuegend',
   engineVersion:String(r.engineVersion||'').slice(0,24),
   qualityVersion:String(r.qualityVersion||'').slice(0,24),
   savedAt:r.savedAt,updatedAt:Number.isFinite(r.updatedAt)&&r.updatedAt>=r.savedAt?r.updatedAt:r.savedAt,
   analysisAt:Number.isFinite(r.analysisAt)?r.analysisAt:null};
 }
 function normalize(records,strict=false){
  if(!Array.isArray(records)||records.length>MAX_IMPORT)throw Error('Ungueltige oder zu grosse Wastl-Bewertungshistorie.');
  const unique=[];
  for(const value of records){
   const r=validRecord(value);
   if(!r){if(strict)throw Error('Fehlerhafter Eintrag in der Wastl-Bewertungshistorie.');continue;}
   const index=unique.findIndex(x=>x.fingerprint===r.fingerprint||(r.id&&x.id===r.id));
   if(index>=0){
    const old=unique[index];
    if(r.updatedAt>old.updatedAt)unique[index]={...r,savedAt:Math.min(old.savedAt,r.savedAt)};
   }else unique.push(r);
  }
  return unique.sort((a,b)=>a.savedAt-b.savedAt||a.fingerprint.localeCompare(b.fingerprint));
 }
 function read(){
  try{
   const saved=JSON.parse(root.localStorage?.getItem(STORAGE)||'null');
   return saved?.version===FORMAT?normalize(saved.records||[]):[];
  }catch{return [];}
 }
 function write(rows){
  try{
   if(!root.localStorage)return false;
   root.localStorage.setItem(STORAGE,JSON.stringify({version:FORMAT,records:rows}));
   return true;
  }catch{return false;}
 }
 function record(game,analysis){
  const fp=fingerprint(game);
  if(!fp||!analysis||!Array.isArray(analysis.reports)||analysis.reports.length!==8)
   return {ok:false,reason:'Vollstaendige Partie und Analyse erforderlich.'};
  const model=Analysis?.quality(analysis,game.type);
  if(!model)return {ok:false,reason:'Bewertungsmodell fehlt.'};
  const versions=[...new Set(analysis.reports.filter(r=>r?.version).map(r=>r.version))];
  const old=read(),found=old.find(x=>x.fingerprint===fp||(game.id&&x.id===String(game.id)));
  const now=Date.now(),at=Number.isFinite(analysis.finished)?analysis.finished:now;
  const entry=validRecord({id:String(game.id||''),fingerprint:fp,source:sourceOf(game),
   type:game.type,score:model.score??null,informative:model.informative||0,
   forced:model.forced||0,evidence:model.evidence||'ungenuegend',
   engineVersion:versions.length===1?versions[0]:'unknown',
   qualityVersion:model.version||'unknown',
   savedAt:found?.savedAt||at,updatedAt:now,analysisAt:at});
  if(!entry)return {ok:false,reason:'Analyseergebnis ungueltig.'};
  if(found&&['fingerprint','source','type','score','informative','forced','evidence','engineVersion','qualityVersion','analysisAt'].every(k=>found[k]===entry[k]))
   return {ok:true,changed:false,record:found};
  const cleaned=old.filter(x=>x.fingerprint!==fp&&(!entry.id||x.id!==entry.id));
  const next=normalize([...cleaned,entry]);
  if(!write(next))return {ok:false,reason:'Speichern fehlgeschlagen; bitte freien Geraetespeicher pruefen.'};
  return {ok:true,changed:true,record:entry};
 }
 function validImport(data){
  if(data==null)return null; // Alte Backups enthalten noch kein Wastl-Spielerprofil.
  if(!data||data.version!==FORMAT||!Array.isArray(data.records))
   throw Error('Wastl-Spielerprofil im Backup ist ungueltig.');
  return {version:FORMAT,records:normalize(data.records,true)};
 }
 function exportData(){return {version:FORMAT,records:read()};}
 function restore(data,mode='merge'){
  if(data==null)return {ok:true,changed:false,reason:'Alte Sicherung ohne Spielerprofil: vorhandene Wastl-Werte bleiben erhalten.'};
  const incoming=validImport(data);
  const previous=read();
  const merged=mode==='replace'?incoming.records:normalize([...previous,...incoming.records]);
  if(!write(merged))return {ok:false,reason:'Wastl-Bewertungshistorie konnte nicht gespeichert werden.'};
  return {ok:true,changed:true,imported:incoming.records.length,total:merged.length};
 }
 function syncArchived(archive){
  if(!Array.isArray(archive))return 0;
  let added=0;
  for(const game of archive){
   if(!game||!fingerprint(game))continue;
   const data=Analysis?.get(game);
   if(!data)continue;
   const result=record(game,data);
   if(result.ok&&result.changed)added++;
  }
  return added;
 }
 const isCurrent=r=>r.score!==null&&r.engineVersion===ENGINE&&r.qualityVersion===QUALITY;
 const eligible=r=>isCurrent(r)&&r.source!=='bot';
 function estimate(rows){
  const q=rows.filter(eligible);
  const decisions=q.reduce((n,r)=>n+r.informative,0);
  const weighted=q.map(r=>({score:r.score,weight:clamp(r.informative/3,0.67,1.6)*(r.evidence==='mittel'?1:0.85)}));
  const weights=weighted.reduce((n,x)=>n+x.weight,0);
  const average=weights?weighted.reduce((n,x)=>n+x.score*x.weight,0)/weights:null;
  const enough=q.length>=MIN_GAMES&&decisions>=MIN_DECISIONS;
  // Die Partiezahl ist nur Mindestvoraussetzung, kein Punktebonus.
  // Konstante durchschnittliche Spielqualitaet ergibt konstante Sterne.
  const points=enough?Math.round(clamp((average-45)*0.6,0,40)*10)/10:null;
  const stars=points===null?0:points>=30?5:points>=20?4:points>=10?3:points>=5?2:1;
  return {games:q.length,decisions,average:average===null?null:Math.round(average*10)/10,
   points,stars,provisional:points!==null&&(q.length<15||decisions<40),
   neededGames:Math.max(0,MIN_GAMES-q.length),neededDecisions:Math.max(0,MIN_DECISIONS-decisions)};
 }
 function stats(){
  const records=read(),eligibleRecords=records.filter(eligible);
  const summary=estimate(eligibleRecords);
  const bot=records.filter(r=>r.source==='bot'),uncertain=records.filter(r=>r.source!=='bot'&&!isCurrent(r));
  const history=[];
  for(let i=1;i<=eligibleRecords.length;i++){
   const prefix=estimate(eligibleRecords.slice(0,i));
   if(prefix.points!==null){
    const entry=eligibleRecords[i-1];
    history.push({index:i,at:entry.savedAt,points:prefix.points,stars:prefix.stars});
   }
  }
  return {...summary,history,allAnalyzed:records.length,botAnalyzed:bot.length,
   botRated:bot.filter(isCurrent).length,unrated:uncertain.length,
   counts:{palast:eligibleRecords.filter(x=>x.source==='palast').length,tracked:eligibleRecords.filter(x=>x.source==='tracked').length},
   currentEngine:ENGINE,currentQuality:QUALITY};
 }
 function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function chart(history){
  if(history.length<2)return '<p class="wpp-empty">Die Entwicklungskurve erscheint nach mehreren gewerteten Partien.</p>';
  const W=320,H=115,left=22,right=8,top=10,bottom=22;
  const xs=i=>left+(W-left-right)*i/(history.length-1);
  const ys=p=>top+(H-top-bottom)*(1-p/40);
  const points=history.map((p,i)=>xs(i).toFixed(1)+','+ys(p.points).toFixed(1)).join(' ');
  const lines=[0,10,20,30,40].map(n=>'<line x1="'+left+'" x2="'+(W-right)+'" y1="'+ys(n)+'" y2="'+ys(n)+'" stroke="currentColor" stroke-opacity=".12"/><text x="1" y="'+(ys(n)+3)+'" fill="currentColor" font-size="9">'+n+'</text>').join('');
  const first=history[0],last=history[history.length-1];
  return '<svg class="wpp-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Verlauf deiner experimentellen Wastl-Wertung von '+first.points+' auf '+last.points+' Punkte in '+history.length+' Wertungsschritten">'+lines
   +'<polyline points="'+points+'" fill="none" stroke="#21895c" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>'
   +'<circle cx="'+xs(history.length-1)+'" cy="'+ys(last.points)+'" r="4" fill="#21895c" stroke="currentColor" stroke-width=".7"/>'
   +'<text x="'+left+'" y="'+(H-2)+'" fill="currentColor" font-size="10">Partie '+first.index+'</text>'
   +'<text x="'+(W-right)+'" y="'+(H-2)+'" text-anchor="end" fill="currentColor" font-size="10">Partie '+last.index+'</text></svg>';
 }
 function render(){
  const s=stats(),value=s.points===null?'–':s.points.toLocaleString('de-DE',{maximumFractionDigits:1});
  const level=s.stars||0;
  const rating=s.points===null
   ?'Noch keine verlässliche Langzeitwertung. Es fehlen '+s.neededGames+' Partien und '+s.neededDecisions+' bewertbare Entscheidungen.'
   :s.provisional?'Vorläufige Wertung: Für eine stabilere Einschätzung sind weitere unterschiedliche Partien nötig.'
    :'Experimentelle Langzeitwertung aus vielen analysierten Entscheidungen.';
  const stars=level?'<span class="wpp-stars" aria-label="'+level+' von 5 Sternen">'+('★'.repeat(level))+'<span>'+'☆'.repeat(5-level)+'</span></span>'
   :'<span class="wpp-stars pending" aria-label="Noch keine Sterne">☆☆☆☆☆</span>';
  return '<section class="wpp-card" aria-label="Wastls Spielerprofil">'
   +'<div class="wpp-title"><span class="wpp-icon" aria-hidden="true">★</span><div><h2>Deine Spielerstärke</h2><small>Experimenteller Wastl-Index · kein Palast-Rating</small></div></div>'
   +'<div class="wpp-main"><div>'+stars+'<p class="wpp-points"><strong>'+value+'</strong><span> / 40 Wertungspunkte</span></p></div><span class="wpp-status">'+(s.points===null?'Noch im Aufbau':s.provisional?'Vorläufig':'Langzeitwert')+'</span></div>'
   +'<p class="wpp-note">'+escape(rating)+'</p>'
   +'<div class="wpp-metrics"><div><b>'+s.games+'</b><small>Gewertete Partien</small></div><div><b>'+s.decisions+'</b><small>Bewertbare Entscheidungen</small></div><div><b>'+(s.average===null?'–':s.average.toLocaleString('de-DE',{maximumFractionDigits:1})+' / 100')+'</b><small>Ø Spielqualität</small></div><div><b>'+s.botAnalyzed+'</b><small>Bot-Trainingspartien</small></div></div>'
   +'<div class="wpp-history"><h3>Entwicklung deiner Wertung</h3>'+chart(s.history)+'</div>'
   +'<p class="wpp-disclaimer">Sterne ab 5 / 10 / 20 / 30 Punkten. Nur gewertete echte Partien zählen; Bot-Training ist getrennt. Mehr Spiele allein bringen keine Punkte. Die Wertung ist nicht mit TrueSkill oder Expertenbewertungen kalibriert.</p>'
   +'</section>';
 }
 return Object.freeze({VERSION,STORAGE,ENGINE,QUALITY,fingerprint,record,read,exportData,validImport,restore,syncArchived,stats,estimate,render});
});
