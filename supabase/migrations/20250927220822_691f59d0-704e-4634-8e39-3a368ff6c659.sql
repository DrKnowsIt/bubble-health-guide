-- Reset current user's token count to 0
UPDATE user_token_limits 
SET current_tokens = 0
WHERE user_id = 'f6414ce1-8a66-40f0-b555-d0d1f34c1684';