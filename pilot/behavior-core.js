/* App-E-Tight behavioral intelligence v2: descriptive and consent-first. No predictive/medical claims. */
(function(root){
  'use strict';
  const LIMIT=200;
  const allowed=new Set(['stress','boredom','routine','visual_cue','physical_hunger','social','other','unsure']);
  const normalize=entries=>Array.isArray(entries)?entries.filter(e=>e&&e.event_type==='checkin').slice(0,LIMIT):[];
  function describe(entries){
    const rows=normalize(entries);
    const count=rows.length;
    const triggers={};const contexts={};const scores={};const feedback={helpful:0,notHelpful:0,unrated:0};
    let outcomeCount=0;const recordedDays=new Set();
    for(const r of rows){
      if(r.trigger&&r.trigger!=='unsure')triggers[r.trigger]=(triggers[r.trigger]||0)+1;
      if(r.context&&r.context!=='unsure')contexts[r.context]=(contexts[r.context]||0)+1;
      if(r.suggestion_helpful===true)feedback.helpful++;
      else if(r.suggestion_helpful===false)feedback.notHelpful++;
      else feedback.unrated++;
      if(r.outcome)outcomeCount++;
      if(typeof r.recorded_at==='string')recordedDays.add(r.recorded_at.slice(0,10));
    }
    for(const field of ['hunger','craving','sleep_hours','movement_minutes','phone_screen_minutes_reported']){
      const vals=rows.map(r=>r[field]).filter(v=>typeof v==='number'&&Number.isFinite(v));
      if(vals.length)scores[field]={n:vals.length,mean:vals.reduce((a,b)=>a+b,0)/vals.length};
    }
    const frequent=Object.entries(triggers).sort((a,b)=>b[1]-a[1])[0]||null;
    const context=Object.entries(contexts).sort((a,b)=>b[1]-a[1])[0]||null;
    // We never manufacture a "risk score" with insufficient or optional missing data.
    return {count,days:recordedDays.size,frequent_trigger:count>=5&&frequent&&frequent[1]>=3?frequent:null,frequent_context:count>=5&&context&&context[1]>=3?context:null,
      scores,feedback,outcomeCount,stage:count<5?'collecting':count<15?'exploring':'describing'};
  }
  function guidance(trigger,rows){
    if(!allowed.has(trigger))trigger='unsure';
    const base={
      physical_hunger:'Your body may be asking for nourishment. Consider a satisfying meal or snack that suits you.',
      routine:'You noticed a familiar time or routine. Planning food ahead might help if you want to.',
      stress:'You noticed stress. Consider what support would feel useful; you can still eat if you are hungry.',
      boredom:'If you feel bored, you could switch activities for a moment or simply choose to eat.',
      visual_cue:'Seeing food can influence interest. Notice it without judging the feeling.',
      social:'Social eating can be enjoyable. Choose what feels right for you.',
      other:'You noticed a situation that matters to you. What could make this moment easier?',
      unsure:'It is fine not to know the reason. You can check in again whenever you want.'
    };
    const relevant=normalize(rows).filter(r=>r.trigger===trigger);
    const rated=relevant.filter(r=>typeof r.suggestion_helpful==='boolean');
    const negative=rated.filter(r=>r.suggestion_helpful===false).length;
    // Respect feedback: suppress *repeated* scripted tips after at least two negative ratings.
    if(negative>=2&&negative>rated.length/2)return {text:'You have indicated that these suggestions have not been useful. I will not repeat them. Your observations remain yours.',suppressed:true,reason:'user_feedback'};
    return {text:base[trigger],suppressed:false,reason:'user_reported_context'};
  }
  function safeLabel(label){return String(label||'unspecified').replaceAll('_',' ')}
  root.AppETightBehaviorCore={describe,guidance,safeLabel};
})(typeof window!=='undefined'?window:globalThis);
