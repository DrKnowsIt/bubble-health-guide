-- Update hardcoded questions to use "symptoms" instead of "concerns"
UPDATE easy_chat_questions 
SET question_text = 'What type of health symptoms do you have?'
WHERE id = 'concerns_main';

-- Also update any other questions that might contain "concerns"
UPDATE easy_chat_questions 
SET question_text = REPLACE(question_text, 'concern', 'symptom')
WHERE question_text ILIKE '%concern%';

UPDATE easy_chat_questions 
SET question_text = REPLACE(question_text, 'Concern', 'Symptom')
WHERE question_text ILIKE '%concern%';