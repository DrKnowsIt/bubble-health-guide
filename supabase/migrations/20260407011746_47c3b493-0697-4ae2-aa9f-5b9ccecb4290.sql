
INSERT INTO storage.buckets (id, name, public) VALUES ('health-records', 'health-records', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false);

-- Storage policies for health-records
CREATE POLICY "Users can upload their own health records"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own health records"
ON storage.objects FOR SELECT
USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own health records"
ON storage.objects FOR UPDATE
USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own health records"
ON storage.objects FOR DELETE
USING (bucket_id = 'health-records' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for chat-images
CREATE POLICY "Users can upload their own chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own chat images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own chat images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);
