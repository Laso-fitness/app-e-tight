create or replace function public.nutrition_aura_participation_v1(p_timezone text default 'America/New_York')
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare who uuid := auth.uid(); zone text; today date; result jsonb;
begin
 if who is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select name into zone from pg_timezone_names where name=p_timezone limit 1;
 if zone is null then raise exception 'Choose a valid timezone' using errcode='22023'; end if;
 today := (now() at time zone zone)::date;
 with journal as (
  select (d.created_at at time zone zone)::date as day from public.nutrition_diary_entries d where d.user_id=who and d.created_at<=now() and d.entry_type in ('meal','water')
  union
  select (b.created_at at time zone zone)::date from public.nutrition_behavior_events b where b.user_id=who and b.created_at<=now() and b.event_type='checkin'
 ), tasks as (select created_at,completed_on from public.nutrition_aura_task_completions where user_id=who and created_at<=now()), active as (select day from journal union select (created_at at time zone zone)::date from tasks)
 select jsonb_build_object('active_days',(select count(*) from active),'participation_days',(select count(*) from journal),'task_points',(select count(*) from tasks),'breathing_completed_today',exists(select 1 from tasks where completed_on=current_date),'active_today',exists(select 1 from active where day=today),'local_date',today,'basis','participation_plus_self_reported_tasks','health_score',null) into result;
 return result;
end;
$$;
revoke all on function public.nutrition_aura_participation_v1(text) from public,anon;
grant execute on function public.nutrition_aura_participation_v1(text) to authenticated;
comment on function public.nutrition_aura_participation_v1(text) is 'Own-account participation only, at most one Spark per local active day. Not a wellbeing/health score. Invoker and explicit auth.uid scope preserve private records.';
