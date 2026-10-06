# App-E-Tight pilot

Separate nutrition app, using the LasO AI Trainer Supabase project and account identity. No seeded clients or nutrition data. Sign-in is required for all saves.

## Pilot features

- Email/password sign-in and new account request. New users confirm their email before signing in.
- Photo capture/upload, meal descriptions, optional label/estimated calories and macros, water, history, edit/delete, repeat meal and JSON export.
- User-set nutrition goals with a gauge that counts only logged amounts. No physiological readiness score or inferred intake.
- Explicit, revocable sharing with Reginald. Private coach view lists only clients who enabled sharing; coach reads, never edits, client records.
- Responsive layouts for phone, tablet and desktop. Native camera picker supported where the browser supports it.

## Data and access

Production backend: `elfmxffnkjfyshcyrvrb`. `config.js` contains only a public publishable key. Database RLS controls every journal, preference and photo read/write. Photos use a private bucket. No service credentials belong in the frontend.

`database/pilot_preferences.sql` and `database/pilot_sharing_authority.sql` record the additive pilot changes already applied to the existing database. They depend on the existing diary/photo and coach settings schema. Client preferences are authoritative for coach journal/photo access, including the earlier sharing API. Ordinary journal queries explicitly filter the signed-in owner.

## Testing

Core validation tests: `TZ=America/New_York node test-core.cjs` in the Sites source checkout. The pilot was also checked with isolated mocked browser flows and real transaction-rollback RLS tests for private/shared/revoked journals and photos. No test fixtures remain in the production database.

Physical iPhone/Android testing and actual delivery of a new user's confirmation email still require real-user acceptance. Email delivery is not mocked or auto-confirmed.

## Limits

Photo capture works; automatic food recognition is not wired into this release. Existing backend analysis code has not been verified with a configured AI provider. Text alerts require an SMS integration. Restaurant discovery, wearable detection, recovery scoring and legacy trial-session linkage are not in the pilot. Missing logs do not imply missed meals. New-client paid coaching capacity is 15; program terms remain in private coach settings.
