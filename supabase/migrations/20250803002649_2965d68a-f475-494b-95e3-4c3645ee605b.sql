-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);

-- Create policies for chat images
CREATE POLICY "Chat images are accessible to authenticated users" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload chat images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own chat images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own chat images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

-- Add image_url column to messages table to store image references
ALTER TABLE messages ADD COLUMN image_url TEXT;