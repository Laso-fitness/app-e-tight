-- The client preference is authoritative, including for the earlier share API.
-- No active legacy shares existed at this change.
alter policy diary_select_shared_coach on public.nutrition_diary_entries using (exists (select 1 from public.nutrition_preferences p where p.user_id = nutrition_diary_entries.user_id and p.share_with_coach and p.coach_id = (select auth.uid())));
alter policy diary_photos_select_shared_coach on storage.objects using (bucket_id = 'nutrition-diary-photos' and exists (select 1 from public.nutrition_preferences p where p.user_id::text = (storage.foldername(name))[1] and p.share_with_coach and p.coach_id = (select auth.uid())));
