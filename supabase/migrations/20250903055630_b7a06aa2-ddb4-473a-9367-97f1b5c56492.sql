-- Enable real-time updates for conversation_solutions table
-- Set replica identity to FULL to capture complete row data
ALTER TABLE public.conversation_solutions REPLICA IDENTITY FULL;

-- Add table to realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_solutions;