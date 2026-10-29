(function(root){'use strict';
const split=v=>Array.isArray(v)?v:String(v||'').split(/[,;\n]/);
const clean=v=>split(v).map(x=>String(x).trim().toLowerCase()).filter(Boolean).slice(0,30);
const meals=[
{id:'chicken',name:'Chicken rice and vegetable bowl',foods:['chicken','rice','broccoli','olive oil'],tags:[],diet:['omnivore'],p:42,c:55,f:14},
{id:'tofu',name:'Tofu rice and vegetable bowl',foods:['tofu','rice','broccoli','olive oil'],tags:['soy'],diet:['omnivore','vegetarian','vegan'],p:25,c:56,f:18},
{id:'lentil',name:'Lentil and quinoa bowl',foods:['lentils','quinoa','spinach','olive oil'],tags:[],diet:['omnivore','vegetarian','vegan'],p:24,c:65,f:12},
{id:'salmon',name:'Salmon potato and greens plate',foods:['salmon','potato','spinach','olive oil'],tags:['fish'],diet:['omnivore'],p:38,c:40,f:22},
{id:'yogurt',name:'Plain Greek yogurt berries and oats',foods:['greek yogurt','berries','oats'],tags:['milk','gluten'],diet:['omnivore','vegetarian'],p:28,c:45,f:7},
{id:'eggs',name:'Eggs toast and avocado',foods:['eggs','whole wheat bread','avocado'],tags:['egg','wheat','gluten'],diet:['omnivore','vegetarian'],p:22,c:36,f:23},
{id:'beans',name:'Black bean corn and rice bowl',foods:['black beans','corn','rice','tomato','avocado'],tags:[],diet:['omnivore','vegetarian','vegan'],p:19,c:72,f:15}
].map(x=>({...x,calories:x.p*4+x.c*4+x.f*9}));
const aliases={dairy:['milk','yogurt','cheese'],milk:['milk','yogurt','cheese'],eggs:['egg'],egg:['egg'],soy:['soy','tofu'],wheat:['wheat','bread'],gluten:['gluten','wheat','bread','oats'],fish:['fish','salmon'],nuts:['nut','peanut','almond','cashew'],shellfish:['shellfish','shrimp'],sesame:['sesame','tahini']};
function matches(term,text){return [term,...(aliases[term]||[])].some(t=>text.includes(t));}
function remaining(t,g){return Object.fromEntries([['calories','calorie_goal'],['protein_g','protein_goal_g'],['carbs_g','carb_goal_g'],['fat_g','fat_goal_g']].map(([k,goal])=>[k,g?.[goal]>0&&Number.isFinite(t?.[k])?Math.max(0,Math.round((g[goal]-t[k])*10)/10):null]));}
function recommend(p,t){const likes=clean(p?.liked_foods),avoid=[...clean(p?.disliked_foods),...clean(p?.allergens)],diet=p?.dietary_pattern||'omnivore',r=remaining(t,p);return meals.filter(m=>m.diet.includes(diet)&&!avoid.some(a=>matches(a,[...m.foods,...m.tags].join(' ')))).map(m=>{const text=m.foods.join(' '),liked=likes.filter(a=>matches(a,text));let score=liked.length*20;if(r.protein_g>0)score+=Math.min(m.p/r.protein_g,1)*10;if(r.calories>0)score-=Math.abs(m.calories-Math.min(r.calories,650))/100;return {...m,liked,score};}).sort((a,b)=>b.score-a.score).slice(0,3);}
function distance(a,b){const r=Math.PI/180,p1=a.lat*r,p2=b.lat*r,dp=(b.lat-a.lat)*r,dl=(b.lon-a.lon)*r;const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
root.FoodCore={clean,remaining,recommend,distance};if(typeof module!=='undefined')module.exports=root.FoodCore;
})(typeof window==='undefined'?globalThis:window);
