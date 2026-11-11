(function(){'use strict';
function create({api,getSession,toast}){
 const Core=window.AppETightAuraCore,$=id=>document.getElementById(id),section=document.createElement('section');section.id='auraPanel';section.className='panel';section.hidden=true;
 section.innerHTML=`<div class="panel-head"><div><p class="eyebrow">AURA / SMALL STEPS</p><h2>Care counts.</h2></div><span class="behavior-private">YOUR OWN PROGRESS</span></div>
<p id="auraNote"></p><div class="two"><div><strong id="auraSparks">—</strong><p class="metadata">Aura Sparks · one per active day</p></div><div><strong id="auraToday">Checking your progress…</strong><p class="metadata">A saved meal, water entry, or optional check-in counts equally.</p></div></div>
<p id="auraMilestones"></p><p class="metadata muted">No consecutive-day requirement. No penalty for a break. Extra entries do not earn extra daily Sparks. Sparks recognize participation; they are not a mental or physical health score, money, or a measure of your worth.</p>
<div class="actions"><button type="button" class="primary" id="auraCheckin">How are you doing?</button><button type="button" id="auraMeal">Log a meal</button><button type="button" id="auraQuiet">Hide encouragement for now</button></div><p id="auraStatus" role="status" class="metadata"></p>`;
 $('behaviorPanel').before(section);let epoch=0,last=null;
 function sessionChanged(){epoch++;last=null;section.hidden=true;$('auraSparks').textContent='—';$('auraToday').textContent='Checking your progress…';$('auraMilestones').textContent='';$('auraNote').textContent='';$('auraStatus').textContent='';}
 function owner(){return getSession()?.user?.id||null;}
 async function refresh(celebrate=false){const id=owner();if(!id){sessionChanged();return;}const seq=++epoch;section.hidden=false;const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York';
 try{const data=await api('/rest/v1/rpc/nutrition_aura_participation_v1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_timezone:zone})});if(seq!==epoch||owner()!==id)return;
 const progress=Core.participation(data);$('auraSparks').textContent=progress.sparks+' '+(progress.sparks===1?'Spark':'Sparks');$('auraToday').textContent=progress.activeToday?'Your small step counts today.':'One small step is enough.';
 $('auraMilestones').textContent=progress.milestones.map(m=>(m.earned?'✦ ':'○ ')+m.target+' active days'+(m.earned?' · recognized':'')).join('   ');
 const day=data.local_date||new Date().toISOString().slice(0,10);$('auraNote').textContent=Core.note(Number(day.replaceAll('-','')));try{$('auraNote').hidden=sessionStorage.getItem('aura-quiet-'+id)==='yes';}catch{}
 const crossed=last&&progress.milestones.find(m=>m.earned&&!last.milestones.find(x=>x.target===m.target)?.earned);
 if(celebrate&&progress.activeToday&&(!last?.activeToday||crossed)){const message=crossed?`${crossed.target} active days. You've made space for yourself, one small step at a time.`:'One Aura Spark for showing up today. An honest check-in counts.';toast(message);$('auraStatus').textContent=message;}else $('auraStatus').textContent=progress.next?`Your next recognition is at ${progress.next} active days. Take them at your own pace.`:'Seven active days recognized. Keep going at your own pace.';last=progress;
 }catch(e){if(seq===epoch){$('auraStatus').textContent='Progress is temporarily unavailable. Your journal still works. '+e.message;$('auraNote').textContent=Core.note(0);}}}
 $('auraCheckin').onclick=()=>{const panel=$('behaviorPanel');panel.scrollIntoView({behavior:'smooth',block:'start'});const check=$('behaviorCheckins');if(check?.checked)$('behaviorHunger')?.focus();else check?.focus();};
 $('auraMeal').onclick=()=>{$('addMeal').click();};
 $('auraQuiet').onclick=()=>{$('auraNote').hidden=true;try{sessionStorage.setItem('aura-quiet-'+owner(),'yes')}catch{};$('auraStatus').textContent='Encouragement hidden for this visit. Your choices still count.';};
 for(const event of ['appetight:checkin-saved','appetight:journal-saved'])window.addEventListener(event,()=>{refresh(true);});
 return {refresh,sessionChanged};
}
window.AppETightAura={create};
})();
