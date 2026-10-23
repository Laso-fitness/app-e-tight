const {test}=require('node:test');const assert=require('node:assert/strict');
const {restoreSession}=require('../pilot/auth.js');
const saved={access_token:'test-token',refresh_token:'test-refresh',user:{id:'test-user'}};
for(const [name,error,retained] of [['offline',Error('offline'),true],['server unavailable',Object.assign(Error(),{status:503}),true],['expired credentials',Object.assign(Error(),{status:401}),false]])test(name,async()=>{let current;await restoreSession({read:()=>JSON.stringify(saved),verify:async()=>{throw error},remember:v=>current=v,onError:()=>{}});assert.deepEqual(current,retained?saved:null)});
test('successful verification preserves session',async()=>{let current;await restoreSession({read:()=>JSON.stringify(saved),verify:async()=>saved.user,remember:v=>current=v,onError:()=>assert.fail()});assert.deepEqual(current,saved)});
test('malformed storage is cleared',async()=>{let current;await restoreSession({read:()=>'{',verify:()=>assert.fail(),remember:v=>current=v,onError:()=>{}});assert.equal(current,null)});
