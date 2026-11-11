create table public.nutrition_aura_task_completions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task_key text not null check(task_key='breathing_pause_30s'),
 completed_on date not null default current_date,
 created_at timestamptz not null default now(),
 evidence text not null default 'self_reported' check(evidence='self_reported'),
 unique(user_id,task_key,completed_on)
);
alter table public.nutrition_aura_task_completions enable row level security;
revoke all on public.nutrition_aura_task_completions from public,anon,authenticated;
grant select on public.nutrition_aura_task_completions to authenticated;
grant insert(user_id,task_key) on public.nutrition_aura_task_completions to authenticated;
create policy own_aura_tasks_read on public.nutrition_aura_task_completions for select to authenticated using((select auth.uid())=user_id);
create policy own_aura_tasks_insert on public.nutrition_aura_task_completions for insert to authenticated with check((select auth.uid())=user_id);
create or replace function public.nutrition_complete_aura_task_v1(p_task_key text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare who uuid:=auth.uid(); inserted uuid;
begin
 if who is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_task_key<>'breathing_pause_30s' or p_task_key is null then raise exception 'Unknown care task' using errcode='22023'; end if;
 insert into public.nutrition_aura_task_completions(user_id,task_key) values(who,p_task_key) on conflict(user_id,task_key,completed_on) do nothing returning id into inserted;
 return jsonb_build_object('earned_points',case when inserted is null then 0 else 1 end,'completed',true,'evidence','self_reported');
end;
$$;
revoke all on function public.nutrition_complete_aura_task_v1(text) from public,anon;
grant execute on function public.nutrition_complete_aura_task_v1(text) to authenticated;
comment on table public.nutrition_aura_task_completions is 'Self-reported optional care tasks; one point per task per UTC date. Timestamps and reward dates are server defaults and not client-writable. Not proof of breathing performance or health improvement.';
