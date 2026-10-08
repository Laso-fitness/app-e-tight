(function(root){'use strict';
const fields=['calories','protein_g','carbs_g','fat_g'];
function normalize(value){
 if(!value||value.is_food!==true||!Array.isArray(value.items)||!value.items.length)throw Error('No identifiable food or drink was found. Add a description or choose another photo.');
 const items=value.items.slice(0,20).map(item=>{
  const row={name:String(item.name||'').slice(0,80),portion:String(item.portion||'').slice(0,80)};
  if(!row.name)throw Error('The estimate was incomplete. Please enter the meal manually.');
  for(const key of fields){const n=item[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>(key==='calories'?5000:500))throw Error('The estimate contained invalid amounts. Please enter the meal manually.');row[key]=n;}
  return row;
 });
 const totals=Object.fromEntries(fields.map(k=>[k,Math.round(items.reduce((n,i)=>n+i[k],0)*10)/10]));
 if(totals.calories>10000||fields.slice(1).some(k=>totals[k]>1000))throw Error('The estimated portion is too large. Enter a smaller portion manually.');
 return {items,totals,meal_title:String(value.meal_title||'Photo meal').slice(0,120),notes:String(value.notes||'').slice(0,400),confidence:['low','medium','high'].includes(value.confidence)?value.confidence:'low',is_food:true};
}
function message(code){return ({ai_not_configured:'Automatic estimates need the AI connection enabled. You can enter label amounts or save the photo without nutrition amounts.',daily_limit:'The daily estimate limit has been reached. You can still save your photo and enter amounts.',auth_required:'Sign in again to estimate this meal.',timeout:'The estimate took too long. Your photo is still here; retry or enter amounts.',service_unavailable:'The estimate service is unavailable. Your photo can still be saved.'})[code]||'Could not estimate this photo. Retry or save it with your own description and amounts.';}
root.NutritionPhoto={normalize,message};if(typeof module!=='undefined')module.exports=root.NutritionPhoto;
})(typeof window==='undefined'?globalThis:window);
