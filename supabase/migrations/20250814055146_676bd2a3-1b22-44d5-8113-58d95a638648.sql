-- Remove alpha tester status from Alan Hourmand for testing purposes
UPDATE public.profiles 
SET alpha_tester = false 
WHERE email = 'alancreator90@gmail.com';