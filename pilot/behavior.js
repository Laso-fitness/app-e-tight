/* App-E-Tight behavior context: opt-in, minimal, owner-only; no location or other-app monitoring. */
(function(){
'use strict';
function create({api,getSession,toast}){
 const $=id=>document.getElementById(id);
 const pane=$('behaviorPanel');
 if(!pane)return {sessionChanged(){},refresh:async()=>{}};
 const status=$('behaviorStatus'),checkins=$('behaviorCheckins'),usage=$('behaviorAppUsage');
 const form=$('behaviorForm'),insights=$('behaviorInsights'),history=$('behaviorHistory');
 let settings=null,events=[],owner=null,epoch=0,observingStart=null,busy=false;
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
   epoch++;settings=null;events=[];owner=validOwner();observingStart=null;
   checkins.checked=false;usage.checked=false;form.hidden=true;insights.replaceChildren();history.replaceChildren();
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
     const r=await api('/rest/v1/nutrition_behavior_events?select=event_type,recorded_at,hunger,craving,mood,context,trigger,action,minutes_visible&user_id=eq.'+encodeURIComponent(uid)+'&order=recorded_at.desc&limit=100');
     if(uid!==validOwner()||seq!==epoch)return;
     events=r||[];render();begin();
   }catch(e){detail('Behavior tracking is unavailable: '+e.message)}
 }
 function text(tag,content,cls){const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e}
 function render(){
  insights.replaceChildren();history.replaceChildren();
  const check=events.filter(e=>e.event_type==='checkin'),app=events.filter(e=>e.event_type==='app_session');
  if(!check.length){insights.append(text('p','Your first check-in is a starting point, not a score. Nothing is predicted until you have enough examples.','metadata'));return}
  const avg=k=>check.filter(x=>Number.isInteger(x[k])).length?(check.reduce((a,x)=>a+(Number.isInteger(x[k])?x[k]:0),0)/check.filter(x=>Number.isInteger(x[k])).length).toFixed(1):'unknown';
  insights.append(text('p',check.length+' self-reported check-in'+(check.length===1?'':'s')+' · average hunger '+avg('hunger')+'/10 · average craving '+avg('craving')+'/10.'));
  if(check.length>=3){
    const triggers=new Map();for(const e of check){if(!e.trigger||e.trigger==='unsure')continue;triggers.set(e.trigger,(triggers.get(e.trigger)||0)+1)}
    const top=[...triggers].sort((a,b)=>b[1]-a[1])[0];
    if(top){const label=top[0].replaceAll('_',' ');insights.append(text('p','Most reported context cue: '+label+' ('+top[1]+' of '+check.length+' check-ins). This is a description, not a diagnosis or a prediction.','behavior-highlight'))}
  }
  if(settings?.app_usage_enabled&&app.length){
    const total=app.reduce((a,x)=>a+(Number(x.minutes_visible)||0),0);
    insights.append(text('p','Optional App-E-Tight foreground time captured: '+Math.round(total)+' minutes across '+app.length+' recorded segments. This does not include other apps, background activity, or whole-phone Screen Time.','metadata'));
  }
  const list=document.createElement('ul');list.className='behavior-list';
  for(const row of check.slice(0,7)){
    const li=text('li',new Date(row.recorded_at).toLocaleString()+' · Hunger '+(row.hunger??'?')+'/10 · Craving '+(row.craving??'?')+'/10 · '+(row.trigger||'unsure').replaceAll('_',' '));
    list.append(li)
  }
  history.append(list)
 }
 async function updateSettings(){
   if(busy)return;const uid=validOwner();if(!uid){detail('Sign in first.');return}
   busy=true;$('behaviorSaveSettings').disabled=true;
   const updated={user_id:uid,checkins_enabled:checkins.checked,app_usage_enabled:usage.checked,updated_at:new Date().toISOString()};
   const previous=settings;
   try{
     if(previous?.app_usage_enabled&&!updated.app_usage_enabled)await finish();
     await api('/rest/v1/nutrition_behavior_settings?on_conflict=user_id',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(updated)});
     settings=updated;form.hidden=!updated.checkins_enabled;detail('Saved. No phone-wide Screen Time or location permission has been requested.');begin();await refresh();
   }catch(e){detail('Preferences not saved: '+e.message);if(previous){checkins.checked=!!previous.checkins_enabled;usage.checked=!!previous.app_usage_enabled}}
   finally{busy=false;$('behaviorSaveSettings').disabled=false}
 }
 function asInt(name){const value=Number($(name).value);if(!Number.isInteger(value)||value<0||value>10)throw Error('Choose a score from 0 to 10.');return value}
 const followUps={
  stress:'If stress is present, you can decide whether a short pause or a supportive routine would help.',
  boredom:'You might try a quick change of activity before deciding whether you want food.',
  visual_cue:'Noticing a food cue is useful context. You can decide what to do without judgment.',
  routine:'You noticed a routine cue. Would planning your next meal or snack be helpful?',
  physical_hunger:'Physical hunger is useful information. Consider responding with food that meets your needs.',
  social:'Social situations matter. Choose what fits your preferences and circumstances.'
 };
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  try{
   if(!settings?.checkins_enabled)throw Error('Turn on check-ins first.');const uid=validOwner();if(!uid)throw Error('Sign in.');
   const payload={user_id:uid,event_type:'checkin',hunger:asInt('behaviorHunger'),craving:asInt('behaviorCraving'),mood:$('behaviorMood').value,context:$('behaviorContext').value,trigger:$('behaviorTrigger').value,action:$('behaviorAction').value,source:'user_checkin'};
   busy=true;$('behaviorSaveCheckin').disabled=true;
   await api('/rest/v1/nutrition_behavior_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
   const advice=followUps[payload.trigger]||'Noticing the context is useful. You can choose a response that feels supportive.';
   $('behaviorSuggestion').textContent=advice+' This is not medical advice, and no food choices are labeled good or bad.';
   detail('Check-in saved. Thanks for sharing what was happening.');await refresh();
  }catch(err){detail('Check-in was not saved: '+err.message)}
  finally{busy=false;$('behaviorSaveCheckin').disabled=false}
 });
 $('behaviorSaveSettings').addEventListener('click',updateSettings);
 $('behaviorDelete').addEventListener('click',async()=>{
  if(!validOwner())return;
  if(!window.confirm('Permanently delete all your App-E-Tight behavior check-ins and optional app-use records? Your meal journal and preferences will stay.'))return;
  try{
   const uid=validOwner();await api('/rest/v1/nutrition_behavior_events?user_id=eq.'+encodeURIComponent(uid),{method:'DELETE',headers:{Prefer:'return=minimal'}});
   events=[];render();detail('All behavior records deleted. Your nutrition journal was preserved.');$('behaviorSuggestion').textContent='';
  }catch(e){detail('Could not delete behavior records: '+e.message)}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){finish()}else begin()});
 window.addEventListener('pagehide',()=>{finish()});
 setInterval(()=>{if(observingStart!==null){finish().finally(begin)}},60000);
 return {sessionChanged,refresh};
}
window.AppETightBehavior={create};
})();
