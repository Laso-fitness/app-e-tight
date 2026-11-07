/* App-E-Tight behavior context: opt-in, minimal, owner-only; no location or other-app monitoring. */
(function(){
'use strict';
function create({api,getSession,toast}){
 const $=id=>document.getElementById(id);
 const pane=$('behaviorPanel');
 if(!pane)return {sessionChanged(){},refresh:async()=>{}};
 const status=$('behaviorStatus'),checkins=$('behaviorCheckins'),usage=$('behaviorAppUsage');
 const form=$('behaviorForm'),insights=$('behaviorInsights'),history=$('behaviorHistory'),Core=window.AppETightBehaviorCore;
 let settings=null,events=[],owner=null,epoch=0,observingStart=null,busy=false,lastCheckinId=null;
 const detail=msg=>{status.textContent=msg};
 const validOwner=()=>getSession()?.user?.id||null;
 const now=()=>performance.now();
 function active(){return !!owner&&!!settings?.app_usage_enabled&&!document.hidden}
 function begin(){if(active()&&observingStart===null)observingStart=now()}
 async function finish(){
   if(observingStart===null)return;
   const elapsed=Math.max(0,Math.min(24*60,(now()-observingStart)/60000));
   observingStart=null;
   if(elapsed<.2||!owner||!settings?.app_usage_enabled||owner!==validOwner())return;
   // Foreground time spent on App-E-Tight, not phone-wide screen time.
   try{await api('/rest/v1/nutrition_behavior_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({user_id:owner,event_type:'app_session',minutes_visible:+elapsed.toFixed(2),source:'opted_in_app_foreground'})})}
   catch{detail('Could not store optional in-app time. No other phone activity is being monitored.')}
 }
 function sessionChanged(){
   epoch++;settings=null;events=[];owner=validOwner();observingStart=null;lastCheckinId=null;$('behaviorFeedback').hidden=true;
   checkins.checked=false;usage.checked=false;form.hidden=true;insights.replaceChildren();history.replaceChildren();$('behaviorMeal').replaceChildren();$('behaviorOutcomePanel').hidden=true;
   pane.hidden=!owner;if(owner)refresh();
 }
 async function refresh(){
   const uid=validOwner(),seq=++epoch;
   if(!uid){sessionChanged();return}
   owner=uid;pane.hidden=false;
   try{
     const p=await api('/rest/v1/nutrition_behavior_settings?select=*&user_id=eq.'+encodeURIComponent(uid));
     if(uid!==validOwner()||seq!==epoch)return;
     settings=p?.[0]||{checkins_enabled:false,app_usage_enabled:false};
     checkins.checked=!!settings.checkins_enabled;usage.checked=!!settings.app_usage_enabled;
     form.hidden=!settings.checkins_enabled;
     detail(!settings.checkins_enabled&&!settings.app_usage_enabled?'Off by default. Choose precisely what to record.':'Your choices are private. You can turn them off or delete entries any time.');
     const r=await api('/rest/v1/nutrition_behavior_events?select=id,event_type,recorded_at,hunger,craving,mood,context,trigger,action,minutes_visible,suggestion_helpful,sleep_hours,movement_minutes,phone_screen_minutes_reported,linked_meal_id,outcome&user_id=eq.'+encodeURIComponent(uid)+'&order=recorded_at.desc&limit=200');
     if(uid!==validOwner()||seq!==epoch)return;
     events=r||[];render();begin();if(settings.checkins_enabled)loadMeals();
   }catch(e){detail('Behavior tracking is unavailable: '+e.message)}
 }
 function text(tag,content,cls){const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e}
 function render(){
  insights.replaceChildren();history.replaceChildren();
  const summary=Core.describe(events);
  if(!summary.count){
    insights.append(text('p','Your first check-in is a starting point—not a score. Nothing is predicted from incomplete information.','metadata'));
    $('behaviorOutcomePanel').hidden=true;
    return;
  }
  insights.append(text('p',summary.count+' voluntary check-ins over '+summary.days+' recorded day'+(summary.days===1?'':'s')+'.','behavior-highlight'));
  if(summary.scores.hunger&&summary.scores.craving)insights.append(text('p','Average reported hunger '+summary.scores.hunger.mean.toFixed(1)+'/10 and craving '+summary.scores.craving.mean.toFixed(1)+'/10. These are your own reports, not health diagnoses.','metadata'));
  if(summary.frequent_trigger)insights.append(text('p','Most frequently reported cue so far: '+Core.safeLabel(summary.frequent_trigger[0])+' ('+summary.frequent_trigger[1]+' of '+summary.count+' check-ins). This is an observation, not a prediction.','behavior-highlight'));
  if(summary.frequent_context)insights.append(text('p','Common self-reported setting: '+Core.safeLabel(summary.frequent_context[0])+'. Your surroundings are not being tracked by GPS.','metadata'));
  if(summary.scores.sleep_hours?.n>=3)insights.append(text('p','Sleep was reported in '+summary.scores.sleep_hours.n+' check-ins (average '+summary.scores.sleep_hours.mean.toFixed(1)+' hours). These are not wearable measurements.','metadata'));
  if(summary.scores.movement_minutes?.n>=3)insights.append(text('p','Movement minutes reported on '+summary.scores.movement_minutes.n+' check-ins; this is self-reported, not a motion sensor reading.','metadata'));
  if(summary.scores.phone_screen_minutes_reported?.n>=3)insights.append(text('p','Optional self-reported phone time appears in '+summary.scores.phone_screen_minutes_reported.n+' check-ins. The app does not read your device-wide Screen Time.','metadata'));
  const rated=summary.feedback.helpful+summary.feedback.notHelpful;
  if(rated)insights.append(text('p','Suggestions rated: '+summary.feedback.helpful+' helpful, '+summary.feedback.notHelpful+' not helpful. Feedback helps reduce unwanted suggestions; it does not prove behavior change.','metadata'));
  if(summary.outcomeCount)insights.append(text('p',summary.outcomeCount+' check-ins also include a later self-reported action.','metadata'));
  if(settings?.app_usage_enabled){
    const tracked=events.filter(e=>e.event_type==='app_session'),mins=tracked.reduce((a,e)=>a+(Number(e.minutes_visible)||0),0);
    if(tracked.length)insights.append(text('p','App-E-Tight foreground time: '+Math.round(mins)+' minutes over '+tracked.length+' partial segments (recent history only). This excludes other apps and background time.','metadata'));
  }
  if(summary.count<5)insights.append(text('p','Still collecting voluntary examples. Personalized patterns will only appear after enough check-ins; you can skip any question.','metadata'));
  const list=document.createElement('ul');list.className='behavior-list';
  const check=events.filter(e=>e.event_type==='checkin');
  for(const row of check.slice(0,7)){
    const parts=[new Date(row.recorded_at).toLocaleString(),'Hunger '+(row.hunger??'?')+'/10','Craving '+(row.craving??'?')+'/10',Core.safeLabel(row.trigger)];
    if(row.linked_meal_id)parts.push('meal linked');if(row.outcome)parts.push('later: '+Core.safeLabel(row.outcome));
    list.append(text('li',parts.join(' · ')));
  }
  history.append(list);
  const pending=check.find(e=>!e.outcome&&Date.now()-new Date(e.recorded_at).getTime()<48*3600000);
  // A new check-in has priority; otherwise offer follow-up for the latest incomplete one.
  if(!lastCheckinId&&pending)lastCheckinId=pending.id;
  $('behaviorOutcomePanel').hidden=!lastCheckinId;
 }
 async function loadMeals(){
   const user=validOwner();if(!user||!settings?.checkins_enabled)return;
   try{
     const data=await api('/rest/v1/nutrition_diary_entries?select=id,logged_at,description,meal_type&entry_type=eq.meal&user_id=eq.'+encodeURIComponent(user)+'&order=logged_at.desc&limit=12');
     if(user!==validOwner()||!settings?.checkins_enabled)return;
     const sel=$('behaviorMeal');sel.replaceChildren();
     const empty=document.createElement('option');empty.value='';empty.textContent='No meal linked';sel.append(empty);
     for(const row of data||[]){
       const o=document.createElement('option');o.value=row.id;
       o.textContent=new Date(row.logged_at).toLocaleDateString()+' · '+String(row.meal_type||row.description||'Meal').slice(0,55);
       sel.append(o);
     }
   }catch(err){detail('Meal linking unavailable. You can still save a check-in: '+err.message)}
 }
 function optionalNumber(id,min,max,integer=false){
   const raw=$(id).value.trim();if(raw==='')return null;const n=Number(raw);
   if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error('Check the optional number in '+$(id).labels?.[0]?.textContent+'.');
   return n;
 }
 async function updateSettings(){
   if(busy)return;const uid=validOwner();if(!uid){detail('Sign in first.');return}
   busy=true;$('behaviorSaveSettings').disabled=true;
   const updated={user_id:uid,checkins_enabled:checkins.checked,app_usage_enabled:usage.checked,updated_at:new Date().toISOString()};
   const previous=settings;
   try{
     if(previous?.app_usage_enabled&&!updated.app_usage_enabled)await finish();
     await api('/rest/v1/nutrition_behavior_settings?on_conflict=user_id',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(updated)});
     settings=updated;form.hidden=!updated.checkins_enabled;if(!updated.checkins_enabled){lastCheckinId=null;$('behaviorOutcomePanel').hidden=true;}detail('Saved. No phone-wide Screen Time or location permission has been requested.');begin();await refresh();
   }catch(e){detail('Preferences not saved: '+e.message);if(previous){checkins.checked=!!previous.checkins_enabled;usage.checked=!!previous.app_usage_enabled}}
   finally{busy=false;$('behaviorSaveSettings').disabled=false}
 }
 function asInt(name){const value=Number($(name).value);if(!Number.isInteger(value)||value<0||value>10)throw Error('Choose a score from 0 to 10.');return value}
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  try{
   if(!settings?.checkins_enabled)throw Error('Turn on check-ins first.');const uid=validOwner();if(!uid)throw Error('Sign in.');
   const payload={user_id:uid,event_type:'checkin',hunger:asInt('behaviorHunger'),craving:asInt('behaviorCraving'),mood:$('behaviorMood').value,context:$('behaviorContext').value,trigger:$('behaviorTrigger').value,action:$('behaviorAction').value,sleep_hours:optionalNumber('behaviorSleepHours',0,24),movement_minutes:optionalNumber('behaviorMovementMinutes',0,1440,true),phone_screen_minutes_reported:optionalNumber('behaviorPhoneMinutes',0,1440,true),linked_meal_id:$('behaviorMeal').value||null,source:'user_checkin'};
   busy=true;$('behaviorSaveCheckin').disabled=true;
   const saved=await api('/rest/v1/nutrition_behavior_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
   lastCheckinId=saved?.[0]?.id||null;
   $('behaviorFeedback').hidden=!lastCheckinId;
   const advice=Core.guidance(payload.trigger,events);
   $('behaviorSuggestion').textContent=advice.text+' Support is optional. No food choices are labeled good or bad.';
   detail('Check-in saved. Thanks for sharing what was happening.');await refresh();
  }catch(err){detail('Check-in was not saved: '+err.message)}
  finally{busy=false;$('behaviorSaveCheckin').disabled=false}
 });
 $('behaviorSaveSettings').addEventListener('click',updateSettings);
 async function feedback(value){
  if(!lastCheckinId||!validOwner()||!settings?.checkins_enabled)return;
  const id=lastCheckinId;
  try{
   await api('/rest/v1/nutrition_behavior_events?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(validOwner()),{
    method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({suggestion_helpful:value})
   });
   $('behaviorFeedback').hidden=true;
   $('behaviorOutcomePanel').hidden=false;
   detail('Feedback saved. Your choices help us learn whether suggestions are genuinely useful.');
  }catch(e){detail('Could not save feedback: '+e.message)}
 }
 async function saveOutcome(){
   if(!lastCheckinId||!validOwner())return;
   const outcome=$('behaviorOutcome').value;
   if(!outcome){detail('Choose an action or leave this for later.');return}
   const id=lastCheckinId;
   try{
     await api('/rest/v1/nutrition_behavior_events?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(validOwner()),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({outcome})});
     lastCheckinId=null;$('behaviorOutcomePanel').hidden=true;$('behaviorOutcome').value='';
     detail('Later action saved. It is your report, not an inferred outcome.');
     await refresh();
   }catch(e){detail('Could not save the later action: '+e.message)}
 }
 $('behaviorSaveOutcome').addEventListener('click',saveOutcome);
 $('behaviorHelpful').addEventListener('click',()=>feedback(true));
 $('behaviorNotHelpful').addEventListener('click',()=>feedback(false));
 $('behaviorExport').addEventListener('click',async()=>{
  if(!validOwner()){detail('Sign in to export your own records.');return}
  const uid=validOwner();try{
   // Export all records with keyset pagination; do not expose this data to another service.
   const rows=[];let offset=0;
   while(true){
    const batch=await api('/rest/v1/nutrition_behavior_events?select=*&user_id=eq.'+encodeURIComponent(uid)+'&order=recorded_at.desc&limit=500&offset='+offset);
    rows.push(...batch);
    if(batch.length<500)break;
    offset+=batch.length;if(offset>20000)throw Error('Too many records to export in one file. Contact support.');
   }
   const payload={schema:'app-e-tight.behavior.v1',exported_at:new Date().toISOString(),settings:{checkins_enabled:!!settings?.checkins_enabled,app_usage_enabled:!!settings?.app_usage_enabled},records:rows};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='app-e-tight-my-behavior-records-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
   detail('Export prepared on your device. Treat the downloaded file as private.');
  }catch(e){detail('Export failed: '+e.message)}
 });
 $('behaviorDelete').addEventListener('click',async()=>{
  if(!validOwner())return;
  if(!window.confirm('Permanently delete all your App-E-Tight behavior check-ins and optional app-use records? Your meal journal and preferences will stay.'))return;
  try{
   const uid=validOwner();await api('/rest/v1/nutrition_behavior_events?user_id=eq.'+encodeURIComponent(uid),{method:'DELETE',headers:{Prefer:'return=minimal'}});
   events=[];lastCheckinId=null;$('behaviorOutcomePanel').hidden=true;$('behaviorFeedback').hidden=true;render();detail('All behavior records deleted. Your nutrition journal was preserved.');$('behaviorSuggestion').textContent='';
  }catch(e){detail('Could not delete behavior records: '+e.message)}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){finish()}else begin()});
 window.addEventListener('pagehide',()=>{finish()});
 setInterval(()=>{if(observingStart!==null){finish().finally(begin)}},60000);
 return {sessionChanged,refresh};
}
window.AppETightBehavior={create};
})();
