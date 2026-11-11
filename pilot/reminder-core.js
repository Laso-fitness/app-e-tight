(function(root){'use strict';
const message="Reggie / App-E-Tight: Life can ask a lot of you. You deserve care too. No pressure to catch up—one honest check-in is enough: https://app-e-tight.netlify.app/pilot/";
function validPhone(value){return /^\+[1-9]\d{7,14}$/.test(String(value||''));}
function due({lastActivity,delayDays=3,pausedUntil,lastNudge,now=Date.now()}){
 const last=Date.parse(lastActivity);if(!Number.isFinite(last)||last>now)return false;
 if(pausedUntil&&Date.parse(pausedUntil)>now)return false;
 if(lastNudge&&now-Date.parse(lastNudge)<7*86400000)return false;
 return now-last>=Math.max(3,Number(delayDays)||3)*86400000;
}
root.AppETightReminderCore={message,validPhone,due};
})(typeof window!=='undefined'?window:globalThis);
