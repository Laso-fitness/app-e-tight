import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../pilot/rhythm-core.js',import.meta.url),'utf8');
const sandbox={window:{},Date};vm.runInNewContext(code,sandbox);
const {hungerForecast,digestivePattern,withinCueWindow}=sandbox.window.AppETightRhythmCore;
const meal=(id,dt)=>({id,entry_type:'meal',logged_at:dt});
const hungry=(dt)=>({event_type:'checkin',recorded_at:dt,hunger:8});
test('No hunger prediction with no data',()=>{
 const x=hungerForecast([],[],new Date('2026-11-07T16:00:00Z'));assert.equal(x.ready,false);assert.equal(x.paired_observations,0);
});
test('Requires at least five paired, personally reported examples over multiple days',()=>{
 const m=[],h=[];
 for(let day=1;day<=5;day++){const dt='2026-11-0'+day;m.push(meal('m'+day,dt+'T09:00:00Z'));h.push(hungry(dt+'T12:00:00Z'))}
 m.push(meal('newest','2026-11-06T09:00:00Z'));
 const pred=hungerForecast(m,h,new Date('2026-11-06T11:00:00Z'));

 assert.equal(pred.ready,true);assert.equal(pred.central_minutes,180);assert.equal(pred.paired_observations,5);
 assert.equal(pred.predicted_at,'2026-11-06T12:00:00.000Z');
});
test('Does not predict when individual data are highly variable',()=>{
 const meals=[],hunger=[];
 [90,150,260,410,510].forEach((delta,i)=>{
   const day='2026-11-0'+(i+1),base=Date.parse(day+'T09:00:00Z');
   meals.push(meal('m'+i,new Date(base).toISOString()));
   hunger.push(hungry(new Date(base+delta*60000).toISOString()));
 });
 meals.push(meal('latest','2026-11-06T09:00:00Z'));
 const p=hungerForecast(meals,hunger,new Date('2026-11-06T10:00:00Z'));
 assert.equal(p.ready,false);assert.equal(p.variable,true);
});
test('Does not use future appetite reports or schedule stale reminders',()=>{
 const meals=[],reports=[];
 for(let i=1;i<=5;i++){const d='2026-11-0'+i;meals.push(meal('m'+i,d+'T09:00:00Z'));reports.push(hungry(d+'T12:00:00Z'))}
 assert.equal(hungerForecast(meals,reports,new Date('2026-11-05T11:00:00Z')).ready,false);
 assert.equal(hungerForecast(meals,reports,new Date('2026-11-05T18:00:00Z')).ready,false);
});

test('Two explicit reports of not being hungry pause the automatic hypothesis',()=>{
 const meals=[],hungryReports=[];
 for(let i=1;i<=5;i++){const d='2026-11-0'+i;meals.push(meal('history'+i,d+'T09:00:00Z'));hungryReports.push(hungry(d+'T12:00:00Z'))}
 meals.push(meal('newest','2026-11-06T09:00:00Z'));
 const feedback=[1,2].map(i=>({response:'not_yet',observed_at:'2026-11-0'+i+'T12:05:00Z',predicted_for:'2026-11-0'+i+'T12:00:00Z'}));
 const x=hungerForecast(meals,hungryReports,new Date('2026-11-06T10:00:00Z'),feedback);
 assert.equal(x.ready,false);assert.equal(x.conflicting_feedback,true);
});

test('Cannot play cue with insufficient forecast or during quiet hours',()=>{
 assert.equal(withinCueWindow({ready:false,predicted_at:'2026-11-07T16:00:00Z'},new Date('2026-11-07T16:00:00Z')),false);
 const date=new Date(2026,10,7,8,55);
 assert.equal(withinCueWindow({ready:true,predicted_at:date.toISOString()},date),false);
});
test('Bowel rhythm is descriptive only and requires voluntary records',()=>{
 const x=digestivePattern([{happened_at:'2026-11-01T09:00:00Z'}]);
 assert.equal(x.ready,false);assert.match(x.needed,/8 voluntary/);
});
test('No cross-app monitoring appears in independent core',()=>{
 assert.doesNotMatch(code,/navigator\.geolocation|ScreenTime|DeviceActivity|requestPermission/);
});
