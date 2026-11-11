(function(){'use strict';
function create({api,getSession,toast}){
 const $=id=>document.getElementById(id),Core=window.AppETightReminderCore;
 const section=document.createElement('section');section.className='panel';section.id='remindersPanel';section.hidden=true;
 section.innerHTML=`<div class="panel-head"><div><p class="eyebrow">YOUR CHECK-INS</p><h2>A friendly nudge.</h2><p class="metadata muted">A missing log does not mean you missed a meal. Choose whether you want reminders.</p></div></div>
<p id="reminderNudge" role="status" hidden></p>
<form id="reminderForm"><label class="check"><input id="reminderInApp" type="checkbox" checked> Show a friendly reminder when I return after a break.</label>
<label>After no saved journal entries or check-ins for<select id="reminderDays"><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label>
<label>Pause until (optional)<input id="reminderPause" type="date"></label>
<details><summary>Request text check-ins</summary><p class="metadata muted">Text delivery is not active yet. Save this request if you would like it once texting is available and your number is verified. There is no charge to save a request.</p>
<label>Mobile number with country code<input id="reminderPhone" type="tel" autocomplete="tel" placeholder="+1…" maxlength="16"></label>
<label class="check"><input id="reminderSms" type="checkbox"> I want optional App-E-Tight inactivity check-in texts at this number once delivery is available. At most one per week. I can turn this off here; texts will include STOP instructions. Message/data rates may apply.</label>
<p class="metadata muted" id="reminderPreview"></p></details>
<button class="primary" id="reminderSave" type="submit">Save reminder preferences</button><p id="reminderStatus" role="status" class="metadata"></p></form>`;
 $('behaviorPanel').before(section);$('reminderPreview').textContent='Example: '+Core.message;
 let epoch=0,settings=null,owner=null,busy=false;
 function sessionChanged(){epoch++;owner=getSession()?.user?.id||null;settings=null;section.hidden=!owner;$('reminderForm').reset();$('reminderNudge').hidden=true;$('reminderStatus').textContent='';}
 async function refresh(){const id=getSession()?.user?.id;if(!id){sessionChanged();return;}const seq=++epoch;owner=id;section.hidden=false;
 try{const [prefs,entries,events,fasts]=await Promise.all([
 api('/rest/v1/nutrition_reminder_preferences?user_id=eq.'+encodeURIComponent(id)+'&select=*'),
 api('/rest/v1/nutrition_diary_entries?user_id=eq.'+encodeURIComponent(id)+'&select=created_at&order=created_at.desc&limit=1'),
 api('/rest/v1/nutrition_behavior_events?user_id=eq.'+encodeURIComponent(id)+'&select=created_at&order=created_at.desc&limit=1'),
 api('/rest/v1/nutrition_fasts?user_id=eq.'+encodeURIComponent(id)+'&ended_at=is.null&select=id&limit=1')]);
 if(seq!==epoch||id!==getSession()?.user?.id)return;settings=prefs?.[0]||null;
 $('reminderInApp').checked=settings?.in_app_enabled!==false;$('reminderDays').value=String(settings?.delay_days||3);$('reminderPause').value=settings?.paused_until?.slice(0,10)||'';$('reminderPhone').value=settings?.phone_e164||'';$('reminderSms').checked=!!settings?.sms_requested;
 const last=[entries?.[0]?.created_at,events?.[0]?.created_at].filter(Boolean).sort().at(-1);let lastNudge=null;try{lastNudge=localStorage.getItem('appetight-nudge-'+id)}catch{}
 if(!fasts?.length&&$('reminderInApp').checked&&Core.due({lastActivity:last,delayDays:settings?.delay_days,pausedUntil:settings?.paused_until,lastNudge})){$('reminderNudge').textContent="Welcome back. Whatever today is holding, you deserve care too. No pressure to catch up or explain your time away. A meal, a sip of water, or one honest check-in is enough to begin.";$('reminderNudge').hidden=false;try{localStorage.setItem('appetight-nudge-'+id,new Date().toISOString())}catch{}}
 $('reminderStatus').textContent=settings?.sms_requested?'Text request saved. No texts are being sent yet; delivery and phone verification are pending.':'Text reminders are off. In-app reminders follow your saved choices.';
 }catch(e){if(seq===epoch)$('reminderStatus').textContent='Could not load reminder preferences: '+e.message;}}
 $('reminderForm').onsubmit=async e=>{e.preventDefault();if(busy)return;const id=getSession()?.user?.id;if(!id||id!==owner){toast('Sign in again before saving.');return;}const phone=$('reminderPhone').value.trim(),sms=$('reminderSms').checked;if(phone&&!Core.validPhone(phone)){ $('reminderStatus').textContent='Use a country code and number, e.g. +1 followed by ten digits.';return;}if(sms&&!phone){$('reminderStatus').textContent='Enter your mobile number to request text check-ins.';return;}
 const pause=$('reminderPause').value,body={user_id:id,in_app_enabled:$('reminderInApp').checked,sms_requested:sms,phone_e164:phone||null,delay_days:Number($('reminderDays').value),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York',paused_until:pause?pause+'T23:59:59'+timezoneOffset(new Date(pause+'T12:00:00')):null,consent_version:sms?'sms-request-v1':null,consented_at:sms?new Date().toISOString():null,updated_at:new Date().toISOString()};busy=true;$('reminderSave').disabled=true;
 try{const had=settings;await api('/rest/v1/nutrition_reminder_preferences'+(had?'?user_id=eq.'+encodeURIComponent(id):''),{method:had?'PATCH':'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});if(id!==getSession()?.user?.id)return;settings=body;$('reminderStatus').textContent=sms?'Saved. Text request pending delivery setup and phone verification; no SMS sent.':'Saved. Text reminders are off.';if(!body.in_app_enabled)$('reminderNudge').hidden=true;}catch(e){if(id===getSession()?.user?.id)$('reminderStatus').textContent='Not saved: '+e.message;}finally{busy=false;$('reminderSave').disabled=false;}};
 function timezoneOffset(date){const m=-date.getTimezoneOffset(),sign=m>=0?'+':'-';return sign+String(Math.floor(Math.abs(m)/60)).padStart(2,'0')+':'+String(Math.abs(m)%60).padStart(2,'0');}
 for(const event of ['appetight:checkin-saved','appetight:journal-saved'])window.addEventListener(event,()=>{$('reminderNudge').hidden=true;});
 return {refresh,sessionChanged};
}
window.AppETightReminders={create};
})();
