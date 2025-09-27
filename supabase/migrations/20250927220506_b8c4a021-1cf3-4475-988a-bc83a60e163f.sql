-- Reset token timeout for current user to allow chat again
UPDATE user_token_limits 
SET can_chat = true, 
    limit_reached_at = NULL 
WHERE user_id = 'f6414ce1-8a66-40f0-b555-d0d1f34c1684';