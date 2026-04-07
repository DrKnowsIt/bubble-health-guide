ALTER TABLE public.health_record_summaries
  ADD CONSTRAINT health_record_summaries_health_record_id_fkey
  FOREIGN KEY (health_record_id) REFERENCES public.health_records(id) ON DELETE CASCADE;