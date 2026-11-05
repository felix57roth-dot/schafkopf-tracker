/* Wastl 8.2: gepaarter Vergleich der Live-KI mit und ohne Wenz-/Rufspiel-Taktik.
 * node tests/wastl-tactics-study.js --cases=72 --samples=12
 * Dieselben Anfangshaende, Ansagen, Sitzplaetze, Referenzgegner und Seeds.
 * Kein Benchmark gegen echte menschliche Spieler.
 */
'use strict';
const T=require('./wastl-bot-tournament.js');
function average(xs){return xs.reduce((a,b)=>a+b,0)/Math.max(xs.length,1);}
function stats(rows){
 const n=rows.length;
 const win=rows.map(x=>x.deltaWin),eyes=rows.map(x=>x.deltaEyes);
 const margin=values=>{
  if(values.length<2)return null;
  const mean=average(values);
  const varr=values.reduce((n,v)=>n+(v-mean)**2,0)/(values.length-1);
  return 1.96*Math.sqrt(varr/values.length);
 };
 return {cases:n,winDiff:average(win),winMargin95:margin(win),
  eyeDiff:average(eyes),eyeMargin95:margin(eyes),
  changedDecisions:rows.reduce((n,x)=>n+x.changedDecisions,0),
  fallbacks:rows.reduce((n,x)=>n+x.fallbacks,0)};
}
function study({cases=72,samples=12}={}){
 cases=Math.max(6,Math.min(400,Math.trunc(cases)));
 samples=Math.max(8,Math.min(90,Math.trunc(samples)));
 const rows=[],errors=[];
 for(let i=0;i<cases;i++){
  try{
   const scenario=T.scenario(i);
   if(!scenario)continue;
   const classic=T.playGame(scenario,'classic',samples);
   const tactical=T.playGame(scenario,'tactical',samples);
   rows.push({index:i,type:scenario.type,seat:scenario.seat,
    role:classic.attack?'ansagerteam':'gegenspieler',
    deltaWin:tactical.win-classic.win,deltaEyes:tactical.eyes-classic.eyes,
    changedDecisions:tactical.disagreements,
    fallbacks:tactical.fallbacks});
  }catch(error){errors.push({index:i,reason:String(error?.message||error)});}
 }
 const types=['rufspiel','wenz','solo'];
 return {version:'8.2.0',requested:cases,samples,usable:rows.length,
  games:2*rows.length,summary:stats(rows),
  byType:Object.fromEntries(types.map(type=>[type,stats(rows.filter(x=>x.type===type))])),
  byRole:Object.fromEntries(['ansagerteam','gegenspieler'].map(role=>
   [role,stats(rows.filter(x=>x.role===role))])),
  errors,rows,
  disclaimer:'Reproduzierbarer synthetischer Test gegen unveraenderte Policy-Gegner. Positive Differenzen belegen keine menschliche Spielstaerke; Konfidenzintervalle schliessen Modellfehler nicht ein.'};
}
if(typeof require==='function'&&require.main===module){
 const arg=(name,def)=>{const q=process.argv.find(s=>s.startsWith('--'+name+'='));return q?Number(q.slice(name.length+3)):def;};
 console.log(JSON.stringify(study({cases:arg('cases',72),samples:arg('samples',12)}),null,2));
}
module.exports={study};
