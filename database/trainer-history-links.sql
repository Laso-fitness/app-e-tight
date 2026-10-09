create schema if not exists app_e_tight_private;
revoke all on schema app_e_tight_private from public,anon;
create table public.trainer_history_links (
 id uuid primary key default gen_random_uuid(), coach_id uuid not null references auth.users(id),
 user_id uuid not null references auth.users(id), client_id uuid references public.clients(id) on delete cascade,
 invite_id uuid references public.remote_trial_invites(id) on delete cascade,
 label text not null, status text not null default 'pending' check(status in ('pending','accepted','revoked')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((client_id is null) <> (invite_id is null))
);
create unique index trainer_link_client_active on public.trainer_history_links(client_id) where status<>'revoked' and client_id is not null;
create unique index trainer_link_invite_active on public.trainer_history_links(invite_id) where status<>'revoked' and invite_id is not null;
create index trainer_link_account on public.trainer_history_links(user_id,status);
alter table public.trainer_history_links enable row level security;
create policy history_link_read on public.trainer_history_links for select to authenticated using(user_id=(select auth.uid()) or coach_id=(select auth.uid()));
revoke all on public.trainer_history_links from anon,authenticated;
grant select on public.trainer_history_links to authenticated;
-- The private function is a narrow authorization boundary: callers never gain access
-- to raw invite tokens, signaling data, internal notes, or other clients' records.
create or replace function app_e_tight_private.trainer_history_bridge(p_action text,p_input jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); recipient uuid; cid uuid; iid uuid; lid uuid; title text; item public.trainer_history_links; result jsonb; page_offset integer;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_action='catalog' then
  return jsonb_build_object(
   'is_coach',exists(select 1 from public.coach_program_settings where coach_id=actor),
   'accounts',coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'name',display_name) order by display_name) from public.nutrition_preferences where coach_id=actor and share_with_coach),'[]'::jsonb),
   'clients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',concat_ws(' ',first_name,last_name))) from public.clients where coach_id=actor),'[]'::jsonb),
   'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'created_at',created_at,'client_id',client_id) order by created_at desc) from public.remote_trial_invites where coach_id=actor),'[]'::jsonb),
   'links',coalesce((select jsonb_agg(to_jsonb(l) order by created_at desc) from public.trainer_history_links l where (coach_id=actor or user_id=actor) and status<>'revoked'),'[]'::jsonb));
 elsif p_action='propose' then
  recipient:=(p_input->>'user_id')::uuid; cid:=nullif(p_input->>'client_id','')::uuid; iid:=nullif(p_input->>'invite_id','')::uuid;
  if (cid is null)=(iid is null) then raise exception 'Choose one Trainer profile or session'; end if;
  if not exists(select 1 from public.coach_program_settings where coach_id=actor) or not exists(select 1 from public.nutrition_preferences where user_id=recipient and coach_id=actor and share_with_coach) then raise exception 'Client must enable journal sharing with this coach first' using errcode='42501'; end if;
  if cid is not null then select concat_ws(' ',first_name,last_name) into title from public.clients where id=cid and coach_id=actor;
  else select label into title from public.remote_trial_invites where id=iid and coach_id=actor; end if;
  if title is null then raise exception 'Trainer record not available' using errcode='42501'; end if;
  insert into public.trainer_history_links(coach_id,user_id,client_id,invite_id,label) values(actor,recipient,cid,iid,title) returning * into item;
  return to_jsonb(item);
 elsif p_action in ('accept','revoke') then
  lid:=(p_input->>'link_id')::uuid;
  select * into item from public.trainer_history_links where id=lid for update;
  if not found or (p_action='accept' and (item.user_id<>actor or item.status<>'pending')) or (p_action='revoke' and actor<>item.user_id and actor<>item.coach_id) then raise exception 'Link not available' using errcode='42501'; end if;
  update public.trainer_history_links set status=case when p_action='accept' then 'accepted' else 'revoked' end,updated_at=now() where id=lid returning * into item;
  return to_jsonb(item);
 elsif p_action='history' then
  recipient:=coalesce(nullif(p_input->>'user_id','')::uuid,actor);
  page_offset:=greatest(0,least(coalesce((p_input->>'offset')::integer,0),100000));
  with links as (
   select * from public.trainer_history_links where user_id=recipient and status='accepted' and (user_id=actor or coach_id=actor)
  ), records as (
   select 'remote'::text as kind,i.id,coalesce(e.started_at,i.created_at) as occurred_at,i.label as title,
    jsonb_build_object('status',i.status,'first_session_start',e.started_at,'last_session_end',e.ended_at,'recorded_events',e.events,'movement_batches',m.batches,'movement_samples',m.samples,'first_capture',m.first_capture,'last_capture',m.last_capture) as details
   from public.remote_trial_invites i
   left join lateral (select min(event_at) filter(where event_type='session_started') as started_at,max(event_at) filter(where event_type='session_ended') as ended_at,count(*) as events from public.remote_trial_events where invite_id=i.id and coach_id=i.coach_id) e on true
   left join lateral (select count(*) as batches,coalesce(sum(sample_count),0) as samples,min(window_start) as first_capture,max(window_end) as last_capture from public.remote_movement_exposure_batches where invite_id=i.id and coach_id=i.coach_id) m on true
   where exists(select 1 from links l where l.coach_id=i.coach_id and (l.invite_id=i.id or l.client_id=i.client_id))
   union all
   select 'workout',w.id,coalesce(w.session_date,w.created_at),coalesce(w.training_mode,'Workout'),jsonb_build_object('goal',w.goal,'status',w.status,'coach_approved',w.coach_approved)
   from public.workouts w where exists(select 1 from links l where l.coach_id=w.coach_id and l.client_id=w.client_id)
   union all
   select 'movement',m.id,m.created_at,m.exercise_name,jsonb_build_object('sample_count',m.sample_count,'capture_duration_ms',m.capture_duration_ms,'external_load_lb',m.external_load_lb,'summary',m.summary)
   from public.movement_signatures m where exists(select 1 from links l where l.coach_id=m.coach_id and l.client_id=m.client_id)
   union all
   select 'sensor',s.id,s.started_at,coalesce(s.purpose,'Sensor session'),jsonb_build_object('started_at',s.started_at,'ended_at',s.ended_at)
   from public.sensor_capture_sessions s where exists(select 1 from links l where l.coach_id=s.coach_id and l.client_id=s.client_id)
  ) select jsonb_build_object('records',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from records order by occurred_at desc,id desc limit 50 offset page_offset) r),'[]'::jsonb),'total',(select count(*) from records),'offset',page_offset,'source','Saved AI Trainer records; capture gaps are not active exercise time.') into result;
  return result;
 end if;
 raise exception 'Unknown history action';
end; $$;
revoke all on function app_e_tight_private.trainer_history_bridge(text,jsonb) from public,anon;
grant usage on schema app_e_tight_private to authenticated;
grant execute on function app_e_tight_private.trainer_history_bridge(text,jsonb) to authenticated;
create or replace function public.trainer_history_bridge(p_action text,p_input jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select app_e_tight_private.trainer_history_bridge(p_action,p_input); $$;
revoke all on function public.trainer_history_bridge(text,jsonb) from public,anon;
grant execute on function public.trainer_history_bridge(text,jsonb) to authenticated;
