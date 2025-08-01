-- Mark the correct email as alpha tester
UPDATE public.profiles 
SET alpha_tester = true 
WHERE email = 'alancreator90@gmail.com';