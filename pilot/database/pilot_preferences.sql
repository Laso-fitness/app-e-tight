create table public.nutrition_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  calorie_goal numeric check (calorie_goal > 0 and calorie_goal <= 10000),
  protein_goal_g numeric check (protein_goal_g > 0 and protein_goal_g <= 1000),
  water_goal_oz numeric check (water_goal_oz > 0 and water_goal_oz <= 256),
  coach_id uuid references public.coach_program_settings(coach_id),
  share_with_coach boolean not null default false,
  updated_at timestamptz not null default now(),
  check (not share_with_coach or coach_id is not null)
);
alter table public.nutrition_preferences enable row level security;
revoke all on public.nutrition_preferences from anon;
grant select,insert,update,delete on public.nutrition_preferences to authenticated;
grant all on public.nutrition_preferences to service_role;
create policy nutrition_preferences_read on public.nutrition_preferences for select to authenticated using ((select auth.uid()) = user_id or (share_with_coach and coach_id = (select auth.uid())));
create policy nutrition_preferences_insert on public.nutrition_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy nutrition_preferences_update on public.nutrition_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy nutrition_preferences_delete on public.nutrition_preferences for delete to authenticated using ((select auth.uid()) = user_id);
create index nutrition_preferences_coach_idx on public.nutrition_preferences(coach_id) where share_with_coach;
create policy nutrition_coach_read on public.nutrition_diary_entries for select to authenticated using (exists (select 1 from public.nutrition_preferences p where p.user_id = nutrition_diary_entries.user_id and p.share_with_coach and p.coach_id = (select auth.uid())));
create policy nutrition_photo_coach_read on storage.objects for select to authenticated using (bucket_id = 'nutrition-diary-photos' and exists (select 1 from public.nutrition_preferences p where p.user_id::text = (storage.foldername(name))[1] and p.share_with_coach and p.coach_id = (select auth.uid())));
