const SUPABASE='https://elfmxffnkjfyshcyrvrb.supabase.co';
const KEY='sb_publishable_3dORQkwVHSWGrwGWQRrGWQ_A8EG4ABw';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const cache=new Map();
export function productEstimate(product){
 const n=product.nutriments||{};
 // Use the declared serving only when all four values are present on that basis.
 // Otherwise expose the standardized 100 g/ml basis explicitly; never mix bases.
 const names=['energy-kcal','proteins','carbohydrates','fat'];
 const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const serving=!!product.serving_size&&names.every(k=>valid(n[k+'_serving']));
 const suffix=serving?'_serving':'_100g',keys=['calories','protein_g','carbs_g','fat_g'];
 const values=Object.fromEntries(names.map((k,i)=>[keys[i],valid(n[k+suffix])?n[k+suffix]:null]));
 if(keys.every(k=>values[k]===null))throw Error('no_nutrition');
 if(keys.some(k=>values[k]>(k==='calories'?5000:500)))throw Error('no_nutrition');
 const portion=serving?String(product.serving_size).slice(0,80):'100 g / 100 ml — check package basis';
 return {is_food:true,source:'barcode',meal_title:String(product.product_name||'Packaged food').slice(0,120),confidence:'medium',notes:'Open Food Facts is community-contributed. Compare with your package and adjust the serving eaten. '+(serving?'Amounts are for one declared serving.':'Amounts are for 100 g (or 100 ml for liquids), not the whole package. Missing nutrients remain unknown.'),items:[{name:String(product.product_name||'Packaged food').slice(0,80),portion,...values}]};
}
export default async function handler(req){
 if(req.method!=='POST')return json({ok:false,code:'method_not_allowed'},405);
 const bearer=req.headers.get('authorization')||'';if(!/^Bearer \S+$/.test(bearer))return json({ok:false,code:'auth_required'},401);
 try{
 const auth=await fetch(SUPABASE+'/auth/v1/user',{headers:{apikey:KEY,authorization:bearer},signal:AbortSignal.timeout(8000)});if(!auth.ok||!(await auth.json()).id)return json({ok:false,code:'auth_required'},401);
 const text=await req.text();if(text.length>200)return json({ok:false},413);let body;try{body=JSON.parse(text);}catch{return json({ok:false},400);}
 const code=String(body?.barcode||'');if(!/^(?:\d{8}|\d{12,14})$/.test(code))return json({ok:false,message:'Enter the 8, 12, 13 or 14 digits printed under the barcode.'},400);
 let item=cache.get(code);if(!item||item.expires<Date.now()){
 const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+code+'.json?fields=product_name,serving_size,nutriments',{headers:{'User-Agent':'App-E-Tight/1.1 (https://app-e-tight.netlify.app)'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('unavailable');const data=await response.json();if(data.status!==1||!data.product)return json({ok:false,message:'Product not found. Choose Nutrition facts label and photograph the label instead.'},404);
 item={estimate:productEstimate(data.product),expires:Date.now()+3600000};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(code,item);
 }
 return json({ok:true,estimate:item.estimate});
 }catch(e){return json({ok:false,message:e.message==='no_nutrition'?'Nutrition is missing for this product. Scan its nutrition label instead.':'Product lookup is unavailable. Scan the nutrition label or enter amounts.'},503);}
}
export const config={path:'/api/food-product',rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:10}};
