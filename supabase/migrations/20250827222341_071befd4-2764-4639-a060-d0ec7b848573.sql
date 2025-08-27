-- Remove the "check_results" option from the root Easy Chat question
-- This option is inappropriate for a new health assessment
UPDATE easy_chat_questions 
SET response_leads_to = jsonb_delete_path(response_leads_to, ARRAY['check_results'])
WHERE id = 'root_start' AND is_root = true;