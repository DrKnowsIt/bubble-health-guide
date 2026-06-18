---
name: PHI Protection Architecture
description: Client-side encryption (AES-GCM + PBKDF2) of identifiers; server-side PHI scrubber strips names/dates/PII before every AI call
type: feature
---
Zero-knowledge model: data key generated in browser, wrapped twice (password + 24-word BIP39 recovery phrase) and stored in `user_encryption_keys`. Server never sees raw key. Losing both password and phrase = identifiers unrecoverable (clinical data still usable under opaque patient_token).

Crypto helper: `src/lib/phi-crypto.ts` (Web Crypto AES-GCM-256, PBKDF2 600k iters).
Recovery phrase: `src/lib/recovery-phrase.ts` (bip39 24 words).
Key lifecycle: `src/hooks/useEncryption.tsx` with `<EncryptionProvider>`.

Server scrubber: `supabase/functions/_shared/phi-scrubber.ts` — name-token swap from `patient_tokens`, ISO/US date → age bucket, regex sweep (email/phone/SSN/ZIP/street), optional Gemini Flash Lite NER pass for free-text >200 chars. MUST be applied to messages before any AI gateway call.

Encrypted columns added in migration 2026-06-18: `patients.identifiers_ciphertext`, `profiles.contact_ciphertext`, `messages.content_ciphertext`, `health_records.file_encryption_meta`. Plaintext columns kept temporarily during rollout.

Already wired: `grok-chat`. Pending wiring into: analyze-conversation-*, analyze-health-topics, analyze-health-insights, generate-final-medical-analysis, generate-comprehensive-health-report, summarize-health-records, describe-image. Pending client work: `<EncryptionProvider>` mount, unlock UI, encrypt-on-write in patient/profile forms, decrypt-on-read in display layer, storage file encryption.
