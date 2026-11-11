create or replace function public.nutrition_aura_participation_v1(p_timezone text default 'America/New_York')
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare who uuid := auth.uid(); zone text; today date; result jsonb;
begin
 if who is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select name into zone from pg_timezone_names where name=p_timezone limit 1;
 if zone is null then raise exception 'Choose a valid timezone' using errcode='22023'; end if;
 today := (now() at time zone zone)::date;
 with active as (
  select (d.created_at at time zone zone)::date as day from public.nutrition_diary_entries d where d.user_id=who and d.created_at<=now() and d.entry_type in ('meal','water')
  union
  select (b.created_at at time zone zone)::date from public.nutrition_behavior_events b where b.user_id=who and b.created_at<=now() and b.event_type='checkin'
 ) select jsonb_build_object('active_days',count(*),'active_today',coalesce(bool_or(day=today),false),'local_date',today,'basis','saved_participation_days','health_score',null) into result from active;
 return result;
end;
$$;
revoke all on function public.nutrition_aura_participation_v1(text) from public,anon;
grant execute on function public.nutrition_aura_participation_v1(text) to authenticated;
comment on function public.nutrition_aura_participation_v1(text) is 'Own-account participation only, at most one Spark per local active day. Not a wellbeing/health score. Invoker and explicit auth.uid scope preserve private records.';
