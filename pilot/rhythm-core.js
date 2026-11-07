/* App-E-Tight Rhythm Model — deterministic, low-claim, opt-in. No medical prediction. */
(function(root){
'use strict';
const minutes=ms=>ms/60000;
const median=a=>{const x=[...a].sort((p,q)=>p-q);return x.length?(x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2):null};
function hungerForecast(mealRows,hungerRows,now=new Date()){
 const meals=(mealRows||[]).filter(m=>m.entry_type==='meal'&&Number.isFinite(Date.parse(m.logged_at))).sort((a,b)=>Date.parse(a.logged_at)-Date.parse(b.logged_at));
 const reports=(hungerRows||[]).filter(e=>e.event_type==='checkin'&&Number(e.hunger)>=6&&Number.isFinite(Date.parse(e.recorded_at))).sort((a,b)=>Date.parse(a.recorded_at)-Date.parse(b.recorded_at));
 const pairs=new Map();
 for(const e of reports){
   const at=Date.parse(e.recorded_at);
   let prior=null;
   for(const meal of meals){if(Date.parse(meal.logged_at)>at)break;prior=meal}
   if(!prior)continue;
   const diff=minutes(at-Date.parse(prior.logged_at));
   if(diff>=75&&diff<=540){const key=prior.id||prior.logged_at;if(!pairs.has(key)||diff<pairs.get(key).delay)pairs.set(key,{at,delay:diff,meal:key})}
 }
 const vals=[...pairs.values()];
 const days=new Set(vals.map(x=>new Date(x.at).toISOString().slice(0,10)));
 const insufficient={ready:false,paired_observations:vals.length,distinct_days:days.size,needed:'At least 5 voluntary high-hunger reports linked by time to prior meals across 3 days. Not necessarily a clinical appetite measure.'};
 if(vals.length<5||days.size<3||!meals.length)return insufficient;
 const intervals=vals.map(x=>x.delay);
 const center=median(intervals);
 const deviation=median(intervals.map(x=>Math.abs(x-center)));
 // Highly variable observations do not justify timing a notification.
 if(deviation>90)return {...insufficient,needed:'Your reports vary too much to justify a timed hunger cue. Continue observing; no cue will play.',variable:true};
 const last=meals[meals.length-1],mealTime=Date.parse(last.logged_at),today=now.getTime();
 if(!Number.isFinite(mealTime)||mealTime>today||today-mealTime>12*3600000)return {...insufficient,ready:false,needed:'No recent logged meal to anchor a forecast. We will not guess.'};
 const suggestedAt=new Date(mealTime+center*60000);
 return {ready:true,paired_observations:vals.length,distinct_days:days.size,central_minutes:Math.round(center),uncertainty_minutes:Math.max(45,Math.round(deviation*2)),predicted_at:suggestedAt.toISOString(),last_meal_at:last.logged_at,method:'observed interval from logged meal to voluntarily reported hunger ≥6/10, with median absolute deviation; hypothesis only'};
}
function digestivePattern(rows){
 const entries=(rows||[]).filter(e=>Number.isFinite(Date.parse(e.happened_at))).sort((a,b)=>Date.parse(a.happened_at)-Date.parse(b.happened_at));
 const days=new Set(entries.map(e=>new Date(e.happened_at).toLocaleDateString('en-CA')));
 const data={ready:false,total:entries.length,days:days.size,note:'Broad self-reported rhythm only, not a bowel-movement prediction.'};
 if(entries.length<8||days.size<6)return {...data,needed:'At least 8 voluntary bowel-movement entries across 6 different days are required before showing a routine pattern.'};
 const buckets=[0,0,0,0,0,0];for(const e of entries){const h=new Date(e.happened_at).getHours();buckets[Math.floor(h/4)]++}
 const count=Math.max(...buckets),idx=buckets.indexOf(count);
 if(count<4||count/entries.length<.35)return {...data,needed:'No consistent four-hour window is evident yet. A variable routine is normal.'};
 const start=String(idx*4).padStart(2,'0'),end=String((idx+1)*4).padStart(2,'0');
 return {...data,ready:true,window_local:start+':00–'+end+':00',observations_in_window:count,share:count/entries.length};
}
function withinCueWindow(forecast,now=new Date()){
 if(!forecast?.ready)return false;
 const t=Date.parse(forecast.predicted_at);if(!Number.isFinite(t))return false;
 const hour=now.getHours();if(hour<9||hour>=20)return false;
 return Math.abs(now.getTime()-t)<=8*60000;
}
root.AppETightRhythmCore={hungerForecast,digestivePattern,withinCueWindow};
})(typeof window!=='undefined'?window:globalThis);
