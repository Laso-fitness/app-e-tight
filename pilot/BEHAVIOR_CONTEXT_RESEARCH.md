# App-E-Tight — Behavior & Context Intelligence
Date: 2026-11-07
Status: live opt-in research instrument; predictive performance NOT validated.

## Source-of-truth audit (before feature rollout)
- Shared LasO Supabase project: 11 authenticated accounts in total, 0 created within the last seven days, most recently created 2026-10-25.
- 3 unique user IDs have 17 self-reported nutrition diary entries (last entry 2026-11-01).
- 3 have nutrition preferences; 1 has a body profile. No AI analysis outcomes or wearable measurements were recorded in those tables.
- Shared auth accounts are **not** the same as App-E-Tight active users; there is no historically reliable app launch event stream.
- Old App-E-Tight Supabase project `omacnuxopfkdcnyfzztc` was INACTIVE, with DB inaccessible. This report does not assert anything about its historical user counts.

## What is being collected NOW, only after an individual opts in
1. Brief check-in: hunger/craving (0-10), mood category, situation category, perceived trigger, intended response, timestamp. These are **user-reported** and are not verified physiological states. Defaults disabled.
2. App-E-Tight foreground duration, only on this page while visible, measured with Performance API and saved as short duration segments. Defaults disabled. This does **not** reveal whole-phone Screen Time, messaging, other apps, or background activity. Sessions that end abruptly may be undercounted.
3. Private owner-only read access under RLS; insert requires the matching consent setting; users can delete their behavior records independently of the nutrition diary.
4. Behavioral summaries reflect data in this app only; they are descriptions of self-reports, not validated predictions or medical guidance.
5. No new historical data was reconstructed or generated as examples; production behavior rows begin empty.

## Critical collection boundaries
- **Never** obtain a user's phone-wide screen activity, other-app use, contacts, GPS, browser history, camera feed, or food source proximity without specific, informed permission and technically supported integration.
- Do not infer food consumption from nearby food venues, home/work presence, routine device movement, or missed diary entries.
- Do not expose individual behavioral data in the coach panel or to advertisers; separate affirmative opt-in is required for each future sharing or research purpose.
- Use short retention windows for any future high-sensitivity telemetry. Allow per-category access revocation, inspect, export, and delete.
- Rule-based coaching prompts should be supportive and optional, not push people toward restriction, guilt, or frequent monitoring.

## What we can build next — only with genuine user permission
**Phase 1 — better outcomes from manual signals**
- Associate self-reported trigger and context with meal time while keeping uncertainty. Ask whether an intervention was helpful, not whether the person was "good".
- Personalize the prompt frequency; use fewer prompts when unanswered or distress is reported.
- Distinguish habit/routine from physical hunger without treating either as undesirable.
- Add controlled tests for whether reminders, planning and supportive coping strategies help a specific user. Model effect and uncertainty.

**Phase 2 — system-source bridges (requires native or trusted integration)**
- iPhone HealthKit: sleep duration, steps, workouts and resting HR/HRV at coarse daily granularity, with separate per-type permission. Web-only App-E-Tight cannot directly read the HealthKit store.
- iOS Core Motion: activity state and walking metrics from a native client (subject to hardware and authorization), preferably daily summaries.
- Apple Screen Time DeviceActivity / FamilyControls: separate app entitlements, explicit user permission and support constraints; do not promise web access to whole-phone usage.
- Garmin, Oura, Fitbit, WHOOP, Apple Health, and other providers: actual OAuth/API agreements and granular permissions; never scrape their accounts or treat data-source availability as an automatic grant.
- Location: if specifically requested, a foreground one-time location check with explicit consent and minimal coarse categories. No persistent routes or raw coordinate retention; food POI services are a separate paid and privacy-sensitive integration.

## Behavioral-science design
- Keep the interaction very short and self-determined; never label food as "bad" or "cheating".
- Use ecological momentary assessment to record what people report near a decision, rather than retrospective assumptions.
- Add just-in-time optional suggestions only when signal quality supports them; delay and silence prompts after repeated dismissals.
- Check for eating-disorder safety and potential harm before deploying frequent food-related nudges. Do not optimize for maximum app engagement at the expense of wellbeing.
- In experiments, measure user-rated helpfulness, annoyance, and meaningful adherence alongside usage; never manipulate craving or guilt to increase engagement.
- Evidence: 2026 JMIR systematic review of just-in-time adaptive interventions in dietary health (https://www.jmir.org/2026/1/e92139/) found more consistent proximal than long-term clinical improvements. Apple developer docs for HealthKit, Core Motion and Screen Time outline authorization and entitlement constraints.

## Evaluation plan
- Consent-first cohort, baseline 2 weeks of check-ins with no unsolicited behavior prompts; no inferred past information.
- Time-based split per person (not random records), model abstains with insufficient data.
- User-centric metrics: whether suggestions were welcome and useful, fewer unwanted prompts, coverage and bias, non-harm.
- Data protection tests: anonymous blocked, cross-user blocked, inserts without category consent blocked, deletion works and no associated diary entries removed.
- Pilot app link: https://app-e-tight.netlify.app/pilot/
- Linked private body engine: separate application with shared auth, not an automatic data source.
