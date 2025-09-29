-- Add products column to messages table to store Amazon product recommendations
ALTER TABLE messages 
ADD COLUMN products JSONB;