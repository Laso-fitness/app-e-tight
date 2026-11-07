import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../pilot/behavior-core.js',import.meta.url),'utf8');
const sandbox={window:{}};vm.runInNewContext(source,sandbox,{filename:'behavior-core.js'});
const {describe,guidance,safeLabel}=sandbox.window.AppETightBehaviorCore;
const row=(day,opts={})=>({event_type:'checkin',recorded_at:'2026-11-'+day+'T13:00:00.000Z',trigger:'routine',context:'home',hunger:5,craving:4,...opts});

test('does not invent risk or personalized patterns with no data',()=>{
  const d=describe([]);assert.equal(d.count,0);assert.equal(d.frequent_trigger,null);assert.equal(d.stage,'collecting');
});
test('excludes app-use sessions from behavioral summaries',()=>{
 const d=describe([row('01'),{event_type:'app_session',recorded_at:'2026-11-02T13:00:00Z',minutes_visible:4}]);
 assert.equal(d.count,1);assert.equal(d.scores.hunger.mean,5);
});
test('needs at least five check-ins and three observations for frequent cue',()=>{
 assert.equal(describe([row('01'),row('02'),row('03'),row('04')]).frequent_trigger,null);
 const found=describe([row('01'),row('02'),row('03'),row('04'),row('05')]).frequent_trigger;
 assert.equal(found[0],'routine');assert.equal(found[1],5);
});
test('counts optional fields only when reported',()=>{
 const d=describe([row('01',{sleep_hours:7}),row('02',{sleep_hours:null}),row('03',{sleep_hours:8,phone_screen_minutes_reported:125})]);
 assert.equal(d.scores.sleep_hours.n,2);assert.equal(d.scores.sleep_hours.mean,7.5);
 assert.equal(d.scores.phone_screen_minutes_reported.n,1);
});
test('stops repeating same suggestion after repeated negative feedback',()=>{
 const history=[row('01',{trigger:'stress',suggestion_helpful:false}),row('02',{trigger:'stress',suggestion_helpful:false})];
 assert.equal(guidance('stress',history).suppressed,true);
 assert.equal(guidance('routine',history).suppressed,false);
});
test('handles unknown trigger without coercive or fabricated confidence',()=>{
 const advice=guidance('made_up_trigger',[]);assert.equal(advice.suppressed,false);assert.match(advice.text,/fine not to know/);
 assert.equal(safeLabel('physical_hunger'),'physical hunger');
});
test('does not confuse intent with subsequent action',()=>{
 const d=describe([row('01',{action:'eat'}),row('02',{action:'eat',outcome:'ate'})]);
 assert.equal(d.outcomeCount,1);
});
