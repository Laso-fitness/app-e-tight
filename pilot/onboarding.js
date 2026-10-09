(function(){'use strict';window.NutritionOnboarding={create({api,getSession,signIn}){
const $=id=>document.getElementById(id);let owner=null,epoch=0,step=0,pendingOpen=false,active=false;
const key=id=>'app-e-tight-setup-done:'+id;
const steps=[['Make it yours.','Add your age, height, weight and activity for estimated calorie needs. You can skip this and log meals right away.','Enter my stats','bodyEdit'],['Set your direction.','Review your calorie, protein and hydration goals. Sharing with Reginald is optional and starts off.','Set goals & sharing','preferencesBtn'],['Start with your next meal.','Take a food photo, request an estimate, check the portions and save. You can also type a meal or log water.','Open my journal',null]];
function paint(){const s=steps[step];$('setupStep').textContent='GETTING STARTED · '+(step+1)+' OF 3';$('setupTitle').textContent=s[0];$('setupText').textContent=s[1];$('setupAction').textContent=s[2];$('setupSkip').textContent=step===2?'Finish setup':'Skip for now';$('setupBack').hidden=step===0;}
function open(){if(!getSession())return;if($('setupDialog').open){paint();return;}if(document.querySelector('dialog[open]')){pendingOpen=true;return;}pendingOpen=false;active=true;paint();$('setupDialog').showModal();}
function finish(){active=false;try{localStorage.setItem(key(owner),'1');}catch{}pendingOpen=false;$('setupDialog').close();$('date').scrollIntoView({behavior:'smooth',block:'center'});}
function next(){if(step<2){step++;open();}else finish();}
$('welcomeStart').onclick=signIn;$('welcomeSignIn').onclick=signIn;$('setupBtn').onclick=()=>{step=0;open();};
$('setupBack').onclick=()=>{step--;paint();};$('setupSkip').onclick=next;$('setupClose').onclick=finish;
$('setupDialog').addEventListener('cancel',e=>{e.preventDefault();finish();});
$('setupAction').onclick=()=>{if(step===2){finish();return;}const target=steps[step][3];$('setupDialog').close();$(target).click();};
for(const [id,index]of [['bodyDialog',0],['preferencesDialog',1]])$(id).addEventListener('close',()=>{if(active&&step===index&&getSession()){step++;open();}});
$('accountDialog').addEventListener('close',()=>{if(pendingOpen)open();});
async function update(){const user=getSession()?.user.id||null;document.body.classList.toggle('is-authenticated',!!user);if(user===owner)return;owner=user;const n=++epoch;pendingOpen=false;active=false;if($('setupDialog').open)$('setupDialog').close();if(!user)return;try{if(localStorage.getItem(key(user)))return;}catch{}
try{const [p,g,m]=await Promise.all([api('/rest/v1/nutrition_body_profiles?user_id=eq.'+user+'&select=user_id&limit=1'),api('/rest/v1/nutrition_preferences?user_id=eq.'+user+'&select=user_id&limit=1'),api('/rest/v1/nutrition_diary_entries?user_id=eq.'+user+'&select=id&limit=1')]);if(n!==epoch||user!==getSession()?.user.id)return;if(!p.length&&!g.length&&!m.length){step=0;open();}}catch{/* Journal remains usable; setup can be reopened manually. */}}
return {update};
}};})();
