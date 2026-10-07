/* Google OAuth: per-tab PKCE verifier, verified callback, no cross-app redirect. */
(function(root){'use strict';
function create({config,store,crypto,location,history,raw}){
 const key='app-e-tight-google-pkce-v1';
 const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const callback=()=>location.origin+(location.pathname.startsWith('/pilot')?'/pilot/':'/');
 const clean=()=>{const url=new URL(location.href);for(const k of ['code','error','error_code','error_description','sb_flow_id'])url.searchParams.delete(k);url.hash='';history.replaceState(null,'',url.pathname+url.search);};
 async function beginGoogle(){
  if(!config.googleReady)throw Error('Google sign-in needs its App-E-Tight return address enabled. Email/password sign-in is available.');
  if(!crypto?.subtle)throw Error('Open App-E-Tight in Safari or Chrome over a secure connection.');
  const verifier=b64(crypto.getRandomValues(new Uint8Array(32))),challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const returnTo=callback();
  try{store.setItem(key,JSON.stringify({verifier,startedAt:Date.now(),returnTo}));}catch{throw Error('Allow browser storage to continue with Google.');}
  const url=new URL(config.url+'/auth/v1/authorize');url.search=new URLSearchParams({provider:'google',redirect_to:returnTo,code_challenge:challenge,code_challenge_method:'s256',prompt:'select_account'}).toString();
  return url.toString();
 }
 async function consumeCallback(){
  const query=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.replace(/^#/,''));
  if(query.has('error')||hash.has('error')){clean();store.removeItem(key);throw Error('Sign-in was canceled or could not finish. Please try again.');}
  const code=query.get('code');
  if(code){
   let pending;try{pending=JSON.parse(store.getItem(key)||'null');}catch{}clean();
   if(!pending?.verifier||pending.returnTo!==callback()||Date.now()-pending.startedAt>15*60000){store.removeItem(key);throw Error('This sign-in expired or opened in a different browser tab. Start Google sign-in again here.');}
   try{const data=await raw('/auth/v1/token?grant_type=pkce',{method:'POST',body:JSON.stringify({auth_code:code,code_verifier:pending.verifier})});if(!data?.access_token||!data?.refresh_token||!data?.user?.id)throw Error('Sign-in could not be confirmed. Please retry.');return data;}finally{store.removeItem(key);}
  }
  // Email-confirmation links use the provider's implicit flow. Verify the user
  // with Auth before saving any session delivered through the callback.
  if(hash.has('access_token')){
   const access=hash.get('access_token'),refresh=hash.get('refresh_token'),seconds=Number(hash.get('expires_in'));clean();
   if(!access||!refresh||!Number.isFinite(seconds)||seconds<=0)throw Error('This sign-in link is incomplete. Sign in again.');
   const user=await raw('/auth/v1/user',{headers:{Authorization:'Bearer '+access}});if(!user?.id)throw Error('This sign-in link is invalid.');
   return {access_token:access,refresh_token:refresh,expires_in:seconds,user};
  }
  return null;
 }
 return {beginGoogle,consumeCallback,callback};
}
root.AppETightAuth={create};if(typeof module!=='undefined')module.exports={create};
})(typeof window!=='undefined'?window:globalThis);
