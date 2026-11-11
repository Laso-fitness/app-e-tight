(function(root){'use strict';
const notes=[
 "Whatever today is holding, you deserve care too. A meal, a sip of water, or one honest check-in is enough to begin. You don't have to get everything right.",
 "This is your space, without judgment. Your needs matter. Tell us how you're doing—even if the answer is that today is difficult.",
 "You don't have to make up for time away. We're glad you're here. Take one small step that feels supportive today.",
 "Some days ask a lot of us. Be gentle with yourself. A small check-in can be a way to care for yourself, not another thing to get perfect."
];
function participation(value){const days=Math.max(0,Math.floor(Number(value?.active_days)||0));return {sparks:Math.max(0,Math.floor(Number(value?.participation_days??days)||0))+Math.max(0,Math.floor(Number(value?.task_points)||0)),breathingCompleted:value?.breathing_completed_today===true,activeToday:value?.active_today===true,milestones:[3,7].map(target=>({target,earned:days>=target})),next:days<3?3:days<7?7:null};}
function note(index=0){return notes[Math.abs(Math.trunc(Number(index)||0))%notes.length];}
root.AppETightAuraCore={participation,note};
})(typeof window!=='undefined'?window:globalThis);
