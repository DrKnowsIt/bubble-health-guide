
-- 1) Ensure a single upsertable AI Health Report per (user_id, patient_id, note_type)
--    This supports patient-report-agent's upsert logic reliably.
CREATE UNIQUE INDEX IF NOT EXISTS doctor_notes_unique_report
ON public.doctor_notes (user_id, patient_id, note_type);

-- 2) Performance indexes for analyzer agents
-- Speed up the "latest health record change" check
CREATE INDEX IF NOT EXISTS idx_health_records_user_patient_updated
ON public.health_records (user_id, patient_id, updated_at DESC);

-- Speed up chat sidebar queries for diagnoses by conversation/patient
CREATE INDEX IF NOT EXISTS idx_conversation_diagnoses_conv_patient
ON public.conversation_diagnoses (conversation_id, patient_id);
