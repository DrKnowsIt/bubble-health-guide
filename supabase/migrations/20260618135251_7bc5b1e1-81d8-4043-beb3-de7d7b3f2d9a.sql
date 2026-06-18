
-- =========================================================
-- PHI Protection v1 — encrypted identifier blobs + key mgmt
-- =========================================================

-- 1) User key envelope: holds the password-wrapped data key and
--    the recovery-phrase-wrapped backup. Server never sees the
--    raw data key, only ciphertext + salts + iv.
CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Password-derived wrapping
  password_salt           TEXT NOT NULL,         -- base64, PBKDF2 salt
  password_kdf_iters      INTEGER NOT NULL DEFAULT 600000,
  wrapped_data_key        TEXT NOT NULL,         -- base64, AES-GCM ciphertext of data key
  wrapped_data_key_iv     TEXT NOT NULL,         -- base64
  -- Recovery-phrase-derived wrapping (BIP39 24 words)
  recovery_salt           TEXT NOT NULL,
  recovery_kdf_iters      INTEGER NOT NULL DEFAULT 600000,
  recovery_wrapped_key    TEXT NOT NULL,
  recovery_wrapped_iv     TEXT NOT NULL,
  -- Bookkeeping
  key_version       INTEGER NOT NULL DEFAULT 1,
  algorithm         TEXT NOT NULL DEFAULT 'AES-GCM-256',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_encryption_keys TO authenticated;
GRANT ALL ON public.user_encryption_keys TO service_role;

ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own encryption keys"
  ON public.user_encryption_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_encryption_keys_updated_at
  BEFORE UPDATE ON public.user_encryption_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Encrypted identifier columns on patients.
--    Plaintext columns kept temporarily so existing data still reads
--    until the client-side re-encryption migration runs. A follow-up
--    migration will null/drop them once all rows have ciphertext.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS identifiers_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS identifiers_iv          TEXT,
  ADD COLUMN IF NOT EXISTS identifiers_key_version INTEGER,
  ADD COLUMN IF NOT EXISTS encrypted_at            TIMESTAMPTZ,
  -- Non-sensitive coarse fields safe for the AI + server-side use
  ADD COLUMN IF NOT EXISTS age_range               TEXT,
  ADD COLUMN IF NOT EXISTS sex_coarse              TEXT;

-- 3) Encrypted contact fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_ciphertext      TEXT,
  ADD COLUMN IF NOT EXISTS contact_iv              TEXT,
  ADD COLUMN IF NOT EXISTS contact_key_version     INTEGER,
  ADD COLUMN IF NOT EXISTS encrypted_at            TIMESTAMPTZ;

-- 4) Encrypted message content. Plaintext column kept for back-compat
--    during rollout; scrub-before-AI still applies on the server.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS content_ciphertext      TEXT,
  ADD COLUMN IF NOT EXISTS content_iv              TEXT,
  ADD COLUMN IF NOT EXISTS content_key_version     INTEGER;

-- 5) Encrypted file metadata for health records / chat images.
--    Bytes themselves are encrypted client-side before upload; this
--    column stores the per-file wrapped key + iv so the browser can
--    decrypt on download.
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS file_encryption_meta JSONB;
