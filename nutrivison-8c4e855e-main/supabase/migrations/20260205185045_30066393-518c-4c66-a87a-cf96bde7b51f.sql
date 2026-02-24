-- Add message_type to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';

-- Add message_type to group_posts table
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';