create table public.nutrition_reminder_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 in_app_enabled boolean not null default true,
 sms_requested boolean not null default false,
 phone_e164 text check(phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 delay_days integer not null default 3 check(delay_days in(3,5,7)),
 timezone text not null default 'America/New_York' check(length(timezone) between 1 and 80),
 paused_until timestamptz,
 consent_version text,
 consented_at timestamptz,
 updated_at timestamptz not null default now(),
 check(not sms_requested or (phone_e164 is not null and consented_at is not null and consent_version='sms-request-v1'))
);
alter table public.nutrition_reminder_preferences enable row level security;
revoke all on public.nutrition_reminder_preferences from public,anon;
grant select,insert,update on public.nutrition_reminder_preferences to authenticated;
grant select on public.nutrition_reminder_preferences to service_role;
create policy own_reminder_read on public.nutrition_reminder_preferences for select to authenticated using((select auth.uid())=user_id);
create policy own_reminder_insert on public.nutrition_reminder_preferences for insert to authenticated with check((select auth.uid())=user_id);
create policy own_reminder_update on public.nutrition_reminder_preferences for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create table private.nutrition_reminder_watch(
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_notified_at timestamptz,
 last_activity_at timestamptz,
 delivery_status text not null default 'not_sent' check(delivery_status in('not_sent','setup_required','sent','failed')),
 last_sent_at timestamptz
);
alter table private.nutrition_reminder_watch enable row level security;
revoke all on private.nutrition_reminder_watch from public,anon,authenticated;
comment on table public.nutrition_reminder_preferences is 'Own-account optional reminder choices. sms_requested is a request, NOT verified enrollment. SMS requires trusted phone verification, an approved sender and STOP support before activation.';
