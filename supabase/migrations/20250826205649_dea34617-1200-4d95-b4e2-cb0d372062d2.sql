-- Remove none_above from all easy_chat_questions response_leads_to mappings

-- Update root_start question
UPDATE easy_chat_questions 
SET response_leads_to = jsonb_delete_path(response_leads_to, ARRAY['none_above'])
WHERE id = 'root_start';

-- Update symptoms_main question  
UPDATE easy_chat_questions
SET response_leads_to = jsonb_delete_path(response_leads_to, ARRAY['none_above'])
WHERE id = 'symptoms_main';

-- Update pain_location question
UPDATE easy_chat_questions
SET response_leads_to = jsonb_delete_path(response_leads_to, ARRAY['none_above'])
WHERE id = 'pain_location';

-- Update wellness_main question
UPDATE easy_chat_questions
SET response_leads_to = jsonb_delete_path(response_leads_to, ARRAY['none_above'])
WHERE id = 'wellness_main';

-- Update concerns_main question
UPDATE easy_chat_questions
SET response_leads_to = jsonb_delete_path(response_leads_to, ARRAY['none_above'])
WHERE id = 'concerns_main';