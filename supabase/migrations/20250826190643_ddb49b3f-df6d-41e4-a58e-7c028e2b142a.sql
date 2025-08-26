-- Set Joseph Stella as an alpha tester
UPDATE public.profiles 
SET alpha_tester = true, updated_at = now()
WHERE email = 'joe@josephstella.com';