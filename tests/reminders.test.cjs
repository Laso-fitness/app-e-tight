const {test}=require('node:test'),assert=require('node:assert/strict');require('../pilot/reminder-core.js');const C=global.AppETightReminderCore,now=Date.parse('2026-11-11T15:00:00Z');
test('nudge is due after three days but not two',()=>{assert.equal(C.due({lastActivity:'2026-11-08T15:00:00Z',now}),true);assert.equal(C.due({lastActivity:'2026-11-09T15:00:00Z',now}),false)});
test('pause and weekly frequency cap suppress nudge',()=>{assert.equal(C.due({lastActivity:'2026-10-01',pausedUntil:'2026-11-12',now}),false);assert.equal(C.due({lastActivity:'2026-10-01',lastNudge:'2026-11-10',now}),false)});
test('missing and future activity do not invent absence',()=>{assert.equal(C.due({now}),false);assert.equal(C.due({lastActivity:'2027-01-01',now}),false)});
test('phone requires international E164 shape',()=>{assert.equal(C.validPhone('+12406881215'),true);for(const p of ['2406881215','+012345678','text',''])assert.equal(C.validPhone(p),false)});
test('message offers logging without asserting a missed meal',()=>{assert.match(C.message,/forgot to log/);assert.match(C.message,/No pressure/)});
