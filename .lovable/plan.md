# PHI Protection & HIPAA-Aligned Architecture

Goal: make personal health data unreadable to us (the operators) and never sent to Gemini in identifiable form — while keeping every existing chat, memory, analysis, and report feature working identically for the end user.

## The core idea: three layers

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — IDENTIFIERS (name, DOB, email, phone, address)    │
│   Encrypted client-side with a user-derived key.            │
│   Server stores ciphertext only. We cannot read it.         │
├─────────────────────────────────────────────────────────────┤
│ Layer 2 — CLINICAL DATA (symptoms, conditions, meds, labs)  │
│   Stored in plaintext under RLS so the AI + analysis        │
│   functions can use it. No names attached — linked only by  │
│   opaque patient_token (Patient_017).                       │
├─────────────────────────────────────────────────────────────┤
│ Layer 3 — AI BOUNDARY                                       │
│   Every payload to Gemini passes through a server-side      │
│   PHI scrubber: token-swap names, generalize dates → age    │
│   range, redact free-text PII with regex + NER pass.        │
└─────────────────────────────────────────────────────────────┘
```

Result: a database leak exposes "Patient_017, female, 40-49, asthma" — never "Jane Doe, born 1981-04-02, 5 Main St". Gemini sees the same de-identified view. The user's own browser is the only place the mapping `Patient_017 → Jane Doe` can be reconstructed.

## How conversations stay unchanged

The user still sees "Hi Jane, how's your asthma today?" because re-identification happens in the browser after the AI responds:

```text
User types  ──► browser encrypts identifiers, sends clinical text + patient_token
                                     │
                                     ▼
                          edge fn: scrub → Gemini
                                     │
                                     ▼
            AI reply with "Patient_017" ──► browser swaps token back to "Jane"
```

Memory works the same way: `conversation_memory` rows are stored against `patient_token`, never the real name. When the AI recalls "last week Patient_017 mentioned chest pain", the browser rewrites it to "Jane" before render.

## What changes vs. what stays

| Area | Today | After |
|---|---|---|
| Patient name / DOB / contact in `patients` | Plaintext | Encrypted blob + age_range + sex (plain) |
| `messages.content` | Plaintext, may contain names | Stored with names already token-swapped client-side |
| `conversation_memory`, `conversation_diagnoses`, `health_insights` | Plaintext, references patient by id | Same, but free-text fields scrubbed before insert |
| Edge fn → Gemini payload | Partial de-id (existing `de-identify-data`) | Mandatory scrubber on every AI call, deny-by-default |
| Chat UX, analysis UI, PDF export | — | Identical (re-identified in browser) |
| Admin/operator view of DB | Can read names + health | Can read clinical data only; identifiers are ciphertext |

## Cryptography (technical details)

- **Key derivation**: on login, derive a 256-bit data key via `PBKDF2(password, salt=user_id, 600k iters)` → AES-GCM key held only in memory (and IndexedDB wrapped by a session key). Never sent to server.
- **Recovery**: at signup, wrap the data key with a 24-word recovery phrase shown once. Without password or phrase, identifiers are unrecoverable — this is the compliance feature, not a bug. Surface this clearly in onboarding.
- **Password reset**: re-wrap data key using recovery phrase. If user loses both, identifiers are lost but clinical history remains usable under the opaque token.
- **Encrypted columns**: `patients.identifiers_ciphertext`, `profiles.contact_ciphertext`, plus `iv` and `wrapped_key_version`. Helper `src/lib/phi-crypto.ts` wraps Web Crypto API.

## PHI scrubber (server-side, mandatory)

New shared module `supabase/functions/_shared/phi-scrubber.ts`:

1. Replace known patient name(s) for the active `user_id` with `Patient_xxx` token (from existing `patient_tokens` table).
2. Generalize any ISO date within ±2y of patient DOB → age bucket.
3. Regex sweep: emails, phone numbers, SSNs, street addresses, ZIP+4.
4. Lightweight NER pass via Gemini Flash Lite ("extract any remaining person names, return JSON") — used only for free-text fields > 200 chars; result fed back into the regex pass.
5. Wrap the existing `fetch` to `ai.gateway.lovable.dev` in every edge function so it cannot be bypassed; any AI call that hasn't been scrubbed throws.

## Migration & rollout

1. New tables/columns + GRANTs + RLS (migration).
2. Ship `phi-crypto.ts` and a one-time migration banner: "Encrypting your records — enter password to continue." Encrypts existing `patients` rows in-browser, writes ciphertext back, nulls plaintext columns.
3. Add scrubber to `grok-chat`, `analyze-conversation-*`, `analyze-health-topics`, `analyze-health-insights`, `generate-final-medical-analysis`, `generate-comprehensive-health-report`, `summarize-health-records`.
4. Update read paths (`useProfile`, `usePatients`, chat render, PDF export) to decrypt + re-identify in the browser.
5. Add Settings → Privacy panel: show recovery phrase, re-encrypt, view what's stored encrypted.

## Open questions before I build

1. **Recovery model** — accept the "lose password + phrase = identifiers gone forever" trade-off (true zero-knowledge), or keep a server-held escrow key so support can recover (weaker, but no lockouts)?
2. **Scope of v1** — encrypt only `patients` + `profiles` identifier fields first, or include `health_records` file metadata + `messages` history in the same pass?
3. **NER pass cost** — OK to spend an extra Gemini Flash Lite call per long message for the name-sweep, or keep v1 regex-only and add NER later?
