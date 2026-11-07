/* App-E-Tight Personal Rhythms v1 — opt-in research, not clinical advice. */
(function(){
'use strict';
function create({api,getSession}){
 const $=id=>document.getElementById(id),model=window.AppETightRhythmCore;
 const panel=$('rhythmPanel');
 if(!panel||!model)return {sessionChanged(){},refresh:async()=>{}};
 const ids={hunger:'rhythmHungerConsent',sound:'rhythmSoundConsent',digest:'rhythmDigestConsent'};
 let owner=null,settings=null,meals=[],checkins=[],reports=[],digestion=[],forecast=null,seq=0,audioCtx=null,busy=false,activeResponse=false,lastRefresh=0,armed=false;
 const status=s=>$('rhythmStatus').textContent=s;
 const current=()=>getSession()?.user?.id||null;
 const visible=()=>!document.hidden&&!!current();
 const t=()=>Date.now();
 const defaultSettings={hunger_forecast_enabled:false,growl_enabled:false,digestive_tracking_enabled:false};
 function setVisibility(){
  panel.hidden=!owner;
  $('rhythmHungerArea').hidden=!settings?.hunger_forecast_enabled;
  $('rhythmDigestArea').hidden=!settings?.digestive_tracking_enabled;
  $('rhythmDataControls').hidden=!(settings?.hunger_forecast_enabled||settings?.digestive_tracking_enabled);
  $(ids.hunger).checked=!!settings?.hunger_forecast_enabled;
  $(ids.sound).checked=!!settings?.growl_enabled;
  $(ids.sound).disabled=!$(ids.hunger).checked;
  $(ids.digest).checked=!!settings?.digestive_tracking_enabled;
 }
 function sessionChanged(){
   seq++;owner=current();settings=null;meals=[];checkins=[];reports=[];digestion=[];forecast=null;armed=false;activeResponse=false;
   $('rhythmHungerFeedback').textContent='';$('rhythmWhyPanel').hidden=true;panel.hidden=!owner;
   if(owner)refresh();
 }
 async function getRows(table,cols,timecol,limit,where=''){
   const uid=current();if(!uid)return [];
   const path='/rest/v1/'+table+'?select='+cols+'&user_id=eq.'+encodeURIComponent(uid)+(where?'&'+where:'')+'&order='+timecol+'.desc&limit='+limit;
   return await api(path)||[];
 }
 async function refresh(){
   const uid=current(),key=++seq;
   if(!uid){sessionChanged();return}
   owner=uid;panel.hidden=false;
   try{
     const opts=await getRows('nutrition_behavior_settings','user_id,hunger_forecast_enabled,growl_enabled,digestive_tracking_enabled','user_id',1);
     if(uid!==current()||key!==seq)return;
     settings=opts[0]||{...defaultSettings};
     setVisibility();
     const jobs=[];
     if(settings.hunger_forecast_enabled){
       jobs.push(Promise.all([
         getRows('nutrition_diary_entries','id,entry_type,logged_at,calories,protein_g,carbs_g,fat_g','logged_at',300,'entry_type=eq.meal'),
         getRows('nutrition_behavior_events','event_type,recorded_at,hunger','recorded_at',200,'event_type=eq.checkin'),
         getRows('nutrition_hunger_observations','id,observed_at,predicted_for,response,reason','observed_at',200)
       ]).then(([a,b,c])=>{meals=a;checkins=b;reports=c}));
     }else{meals=[];checkins=[];reports=[];forecast=null}
     if(settings.digestive_tracking_enabled){
       jobs.push(getRows('nutrition_digestive_events','id,happened_at,bristol_type','happened_at',150).then(x=>{digestion=x}));
     }else{digestion=[]}
     await Promise.all(jobs);
     if(uid!==current()||key!==seq)return;
     lastRefresh=t();render();checkGrowl();
     status('Your rhythm data is private and optional. No system sensors or other apps are monitored.');
   }catch(e){status('Rhythm data unavailable: '+e.message)}
 }
 function output(id,content){$(id).textContent=content}
 function render(){
   setVisibility();
   if(settings?.hunger_forecast_enabled){
     const hungerFromResponses=reports.filter(r=>r.response==='hungry').map(r=>({event_type:'checkin',recorded_at:r.observed_at,hunger:8}));
     forecast=model.hungerForecast(meals,[...checkins,...hungerFromResponses]);
     if(forecast.ready){
       const approx=new Date(forecast.predicted_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
       output('rhythmHungerForecast','Your logged patterns suggest hunger may return around '+approx+' (very approximate, ±'+forecast.uncertainty_minutes+' minutes). Based on '+forecast.paired_observations+' prior meal-to-hunger intervals. This is a hypothesis, never a reason to delay food.');
     }else{
       output('rhythmHungerForecast',(forecast.needed||'Not enough information yet.')+' '+forecast.paired_observations+' paired observations collected.');
     }
     if(settings.growl_enabled&&!armed)status('The growl is opted in. Tap “Hear sample growl” each time you reopen the page to enable audio in this tab. It cannot sound while closed.');
   }
   if(settings?.digestive_tracking_enabled){
     const data=model.digestivePattern(digestion);
     output('rhythmDigestSummary',data.ready
       ? 'Your reported bowel movements have most often occurred during '+data.window_local+' ('+data.observations_in_window+' of '+data.total+' entries). This is a broad observed routine, not a prediction of when you must have a bowel movement.'
       : data.needed);
     const list=$('rhythmDigestHistory');list.replaceChildren();
     for(const d of digestion.slice(0,6)){
       const li=document.createElement('li');li.textContent=new Date(d.happened_at).toLocaleString()+(d.bristol_type?' · Stool form '+d.bristol_type:'');list.append(li);
     }
   }
 }
 async function armAudio(){
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)throw Error('This browser does not support the sample sound.');
   if(!audioCtx)audioCtx=new Audio();
   if(audioCtx.state==='suspended')await audioCtx.resume();
   armed=audioCtx.state==='running';
   if(!armed)throw Error('Audio was not enabled. Tap the sample again.');
   return audioCtx;
 }
 function playGrowl(ctx){
   // Quiet, short synth rumble generated locally; no external audio files.
   if(!ctx||ctx.state!=='running')return;
   const start=ctx.currentTime,volume=ctx.createGain();
   volume.gain.setValueAtTime(0.0001,start);
   volume.gain.exponentialRampToValueAtTime(.025,start+.15);
   volume.gain.exponentialRampToValueAtTime(.015,start+.42);
   volume.gain.exponentialRampToValueAtTime(.0001,start+.95);
   volume.connect(ctx.destination);
   for(const base of [65,92]){
     const osc=ctx.createOscillator();
     osc.type='sine';osc.frequency.setValueAtTime(base,start);
     osc.frequency.linearRampToValueAtTime(base*.63,start+.9);
     osc.connect(volume);osc.start(start);osc.stop(start+.96);
   }
 }
 $('rhythmPreviewGrowl').addEventListener('click',async()=>{
   try{const ctx=await armAudio();playGrowl(ctx);status('Growl demo played. Future in-app cues still require your separate sound consent and sufficient personal data.')}
   catch(e){status(e.message)}
 });
 $(ids.hunger).addEventListener('change',()=>{$(ids.sound).disabled=!$(ids.hunger).checked;if(!$(ids.hunger).checked)$(ids.sound).checked=false});
 $('rhythmSaveSettings').addEventListener('click',async()=>{
   if(busy||!current())return;busy=true;$('rhythmSaveSettings').disabled=true;
   const enabled=$(ids.hunger).checked,growl=enabled&&$(ids.sound).checked,digest=$(ids.digest).checked;
   try{
     // Saving choices never starts a phone-wide permission flow.
     const uid=current();
     await api('/rest/v1/nutrition_behavior_settings?on_conflict=user_id',{
       method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
       body:JSON.stringify({user_id:uid,hunger_forecast_enabled:enabled,growl_enabled:growl,digestive_tracking_enabled:digest,updated_at:new Date().toISOString()})
     });
     settings={...settings,hunger_forecast_enabled:enabled,growl_enabled:growl,digestive_tracking_enabled:digest};
     if(growl){try{await armAudio()}catch{/* Always tolerate browsers that block audio. */}}
     await refresh();
     status('Preferences saved. Automatic cues require enough verified observations and the app to remain open. No background tracking is active.');
   }catch(e){status('Settings were not saved: '+e.message);await refresh()}
   finally{busy=false;$('rhythmSaveSettings').disabled=false}
 });
 async function logResponse(response,reason=null){
   if(busy||!settings?.hunger_forecast_enabled||!current())return;
   const last=reports[0];
   if(last&&t()-Date.parse(last.observed_at)<45*60000){status('A hunger check-in was already saved recently. You can check again later.');return}
   busy=true;
   try{
     const uid=current();
     await api('/rest/v1/nutrition_hunger_observations',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
       body:JSON.stringify({user_id:uid,response,reason,predicted_for:forecast?.ready?forecast.predicted_at:null})});
     $('rhythmWhyPanel').hidden=true;
     output('rhythmHungerFeedback',response==='not_yet'
       ? 'Not hungry is useful feedback. It does not mean anything is wrong. A recent meal, busy day, normal variation or many other factors could explain it.'
       : response==='hungry'?'Thanks. This helps identify *your* appetite rhythm; it does not dictate when to eat.':'Thanks. Uncertain is a perfectly valid answer.');
     await refresh();
   }catch(e){status('Your response was not saved: '+e.message)}
   finally{busy=false}
 }
 $('rhythmHungry').addEventListener('click',()=>logResponse('hungry'));
 $('rhythmUnsure').addEventListener('click',()=>logResponse('unsure'));
 $('rhythmNotYet').addEventListener('click',()=>{$('rhythmWhyPanel').hidden=false;$('rhythmWhy').focus()});
 $('rhythmSaveWhy').addEventListener('click',()=>logResponse('not_yet',$('rhythmWhy').value));
 $('rhythmSkipWhy').addEventListener('click',()=>logResponse('not_yet'));
 $('rhythmLogBowel').addEventListener('click',async()=>{
   if(busy||!settings?.digestive_tracking_enabled||!current())return;
   busy=true;$('rhythmLogBowel').disabled=true;
   try{
     const uid=current(),raw=$('rhythmBristol').value;
     await api('/rest/v1/nutrition_digestive_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
       body:JSON.stringify({user_id:uid,bristol_type:raw?Number(raw):null})});
     $('rhythmBristol').value='';
     await refresh();status('Bowel-movement time saved as your voluntary observation. This is not a diagnostic measurement.');
   }catch(e){status('Digestive entry not saved: '+e.message)}
   finally{busy=false;$('rhythmLogBowel').disabled=false}
 });
 function checkGrowl(){
   if(!visible()||!settings?.hunger_forecast_enabled||!settings?.growl_enabled||!armed||!audioCtx||!forecast?.ready)return;
   if(!model.withinCueWindow(forecast))return;
   const uid=current(),day=new Date().toLocaleDateString('en-CA'),key='appetight_growl_'+uid;
   try{
     if(localStorage.getItem(key)===day)return;
     localStorage.setItem(key,day);
     playGrowl(audioCtx);
     status('You may be approaching a commonly reported hunger window. Are you actually hungry? You decide.');
   }catch{/* Avoid frequent sound when browser storage is blocked. */}
 }
 setInterval(()=>{checkGrowl();if(visible()&&settings?.hunger_forecast_enabled&&t()-lastRefresh>10*60000)refresh()},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkGrowl()});
 $('rhythmExport').addEventListener('click',async()=>{
   if(!current())return;
   try{
     const uid=current(),all={};
     for(const [table,col] of [['nutrition_hunger_observations','observed_at'],['nutrition_digestive_events','happened_at']]){
       all[table]=[];let offset=0;
       while(true){
         const chunk=await api('/rest/v1/'+table+'?select=*&user_id=eq.'+encodeURIComponent(uid)+'&order='+col+'.desc&limit=500&offset='+offset);
         all[table].push(...chunk);if(chunk.length<500)break;offset+=chunk.length;if(offset>20000)throw Error('Export too large; contact support.');
       }
     }
     const blob=new Blob([JSON.stringify({schema:'appetight.rhythms.v1',exported_at:new Date().toISOString(),settings:{hunger_forecast_enabled:!!settings?.hunger_forecast_enabled,growl_enabled:!!settings?.growl_enabled,digestive_tracking_enabled:!!settings?.digestive_tracking_enabled},...all},null,2)],{type:'application/json'});
     const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='appetight-private-rhythm-data.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
     status('Your private data export is prepared. Store it securely.');
   }catch(e){status('Could not export: '+e.message)}
 });
 $('rhythmDelete').addEventListener('click',async()=>{
   if(!current()||!window.confirm('Turn OFF hunger forecasts, growls and digestive tracking, and PERMANENTLY delete all saved hunger answers and bowel-movement records? Existing meals and general check-ins will stay.'))return;
   try{
     const uid=current();
     await api('/rest/v1/nutrition_behavior_settings?user_id=eq.'+encodeURIComponent(uid),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({...defaultSettings,updated_at:new Date().toISOString()})});
     settings={...settings,...defaultSettings};armed=false;
     await Promise.all([
       api('/rest/v1/nutrition_hunger_observations?user_id=eq.'+encodeURIComponent(uid),{method:'DELETE',headers:{Prefer:'return=minimal'}}),
       api('/rest/v1/nutrition_digestive_events?user_id=eq.'+encodeURIComponent(uid),{method:'DELETE',headers:{Prefer:'return=minimal'}})
     ]);
     reports=[];digestion=[];forecast=null;render();
     status('Rhythm tracking stopped and rhythm records deleted. Meal journal and general behavior check-ins were preserved.');
   }catch(e){status('Deletion or permission update failed: '+e.message+'. Check status before closing.');await refresh()}
 });
 return {sessionChanged,refresh};
}
window.AppETightRhythm={create};
})();
