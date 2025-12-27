-- Enable full row data for realtime payloads
ALTER TABLE public.conversation_diagnoses REPLICA IDENTITY FULL;
ALTER TABLE public.health_topics_for_discussion REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_solutions REPLICA IDENTITY FULL;

-- Add missing tables to supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_diagnoses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_diagnoses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'health_topics_for_discussion'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_topics_for_discussion;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversation_solutions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_solutions;
  END IF;
END $$;