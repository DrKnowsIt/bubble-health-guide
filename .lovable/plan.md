# Full Site Health Check

## What I already found (static check)

- **Database is empty**: 0 conversations, 0 messages, 0 patients, 0 health_records. Nothing has been exercised end-to-end yet, so no runtime logs exist for `grok-chat` or any other function.
- **Subscription for `alancreator90@gmail.com` is NOT active** (`subscribed=false`, no tier). The earlier Pro upgrade did not stick — likely because there is no `auth.users` row for that email yet (user has not signed up), so the upsert had nothing to attach to. Needs to be re-applied **after** the account is created, or matched by email-only.
- Image analysis path **is wired** in `grok-chat` (`image_url` is forwarded to the model as an `image_url` content part) — looks functional but unverified.
- PDF export, conversation memory, and solutions were patched in the previous turn — not yet verified against real data.

## Audit Plan (what I'll verify, feature by feature)

| # | Feature | How I'll verify |
|---|---|---|
| 1 | AI chat works | Sign in as the test user, send a message, check `grok-chat` logs + `messages` table insert |
| 2 | History persists | Reload, confirm conversation + messages re-hydrate from DB |
| 3 | Forms / documents tracked by AI | Fill a health form, start a new chat, verify the form content appears in the AI's system context (via `grok-chat` logs) |
| 4 | Probable diagnoses with confidence | Trigger `analyze-conversation-diagnosis`, confirm `conversation_diagnoses` rows with `confidence` + `reasoning` |
| 5 | Multi-patient (family) sharing one account | Add a family member via `UserManagement`, switch patient, confirm conversations scope to `patient_id` |
| 6 | Subscription | Re-apply Pro to `alancreator90@gmail.com` (or by `user_id` once signed up), confirm gated features unlock |
| 7 | Doctor-ready PDF export | Run `exportComprehensivePDFForUser`, open the PDF, confirm it contains summaries, diagnoses, solutions, and recommended tests (this was the bug fixed last turn) |
| 8 | Image interpretation | Upload an image in chat, confirm `describe-image` or direct `image_url` path reaches the model and a relevant response comes back |
| 9 | Medical tone + uncertainty + mental-health framing | Inspect the system prompt in `grok-chat` and `config/ai-conversation-rules.json` to confirm it says "could be / might suggest", flags anxiety/overthinking, and always recommends a real doctor |

## Fixes I expect to apply during the audit

These are predicted from the static read — final list depends on what actually fails:

1. **Subscription upgrade**: re-run the Pro upgrade keyed on `user_id` after confirming the auth account exists (otherwise upsert by email only and backfill `user_id` on first `check-subscription` call).
2. **System prompt hardening** (item 9): if the prompt is missing the "you could be wrong / user might be overthinking / consider anxiety first" guardrails, add them to `grok-chat`'s system message (the rules already exist in `config/ai-conversation-rules.json` but I'll confirm they're actually loaded into the prompt).
3. **Image flow**: if `describe-image` is the intended entry point but the UI bypasses it, align the client to send `image_url` directly to `grok-chat` (which already handles it) OR route via `describe-image` consistently.
4. **PDF export**: re-test after last turn's fix; if any section still renders empty, query the right `user_id`/`patient_id` pair.
5. **Health-form context**: confirm `summarize-health-records` output is included in `grok-chat`'s context window without being over-truncated (last turn raised the limits — verify the values are actually used).
6. Any broken UI / console errors surfaced during the live walk-through.

## Deliverable

A short pass/fail report per feature (1–9) with a fix applied for anything that fails, plus the Pro subscription re-applied so you can keep testing.

## Note

I will need to drive the app as a logged-in user to fully verify 1–8. If you want me to skip live testing and just statically audit + fix predicted issues, say so — otherwise I'll run the audit against the test account and patch as I go.
