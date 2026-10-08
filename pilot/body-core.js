(function(root){'use strict';
function estimate(p){
 if(!p||p.special_care)return null;
 const a=Number(p.age_years),h=Number(p.height_cm),w=Number(p.weight_kg),f=Number(p.activity_factor),s=p.equation_sex;
 if(!Number.isInteger(a)||a<18||a>100||h<100||h>250||w<30||w>350||![1.2,1.375,1.55,1.725].includes(f)||!['male','female'].includes(s)||![a,h,w,f].every(Number.isFinite))throw Error('Check age, height, weight and activity.');
 const rest=10*w+6.25*h-5*a+(s==='male'?5:-161),maintenance=rest*f;
 const target=maintenance+(p.goal==='lose'?-250:p.goal==='gain'?250:0);
 return {rest:Math.round(rest),maintenance:Math.round(maintenance),target:target<1200||w/((h/100)**2)<18.5?null:Math.round(target/50)*50};
}
const elapsed=(start,now=Date.now())=>Math.max(0,now-new Date(start).getTime());
function clock(ms){const m=Math.floor(Math.max(0,ms)/60000);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';}
root.BodyCore={estimate,elapsed,clock};if(typeof module!=='undefined')module.exports=root.BodyCore;
})(typeof window==='undefined'?globalThis:window);
