## De-identify the comprehensive health report prompt

Strip the patient's real name and PHI from the payload sent to Gemini in `generate-comprehensive-health-report`. Report quality, UI, and storage stay the same — only what reaches the AI changes.

### What changes

In `supabase/functions/generate-comprehensive-health-report/index.ts`:

1. Import the existing scrubber: `import { scrubText } from "../_shared/phi-scrubber.ts"`.
2. Look up the opaque token for this patient from `patient_tokens` (e.g. `Patient_017`); fall back to `Patient` if none.
3. Replace `patientContext.name` with the token — never send `first_name` / `last_name` to the model.
4. Run the JSON-stringified `healthSummary` (record titles + `data` blobs) through `scrubText({ userId, patientId, supabase, useNER: false })` before it's interpolated into `userPrompt`. This catches any stray names, emails, phones, SSNs, addresses, and generalizes dates to age buckets.
5. Keep the system prompt unchanged — it has no PHI.
6. Storage path stays as-is: the saved report row still has no name, and `demographics_summary` still keeps the exact age (per user choice).

### What does NOT change

- The PDF / on-screen report still shows "Jane's Health Report" — that's rendered from `patients` in the browser, never from the AI response.
- All clinical detail (conditions, meds, lab values, record types, recommendations, suggested tests) is preserved.
- No schema migration, no UI change, no new dependencies.

### Verification

After the edit, redeploy the function and run it for a test patient; confirm the saved report still contains the same fields and that edge-function logs show the token (not the real name) in the prompt body.
