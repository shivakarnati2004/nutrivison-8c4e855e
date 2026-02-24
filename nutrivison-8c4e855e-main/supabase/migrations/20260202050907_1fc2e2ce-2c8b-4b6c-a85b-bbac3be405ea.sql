-- Messages table for DMs
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages to friends"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.are_friends(sender_id, receiver_id));

CREATE POLICY "Users can delete their sent messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Fix storage policy for post uploads
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload to their folders" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos' AND (
      (auth.uid())::text = (storage.foldername(name))[1] OR
      ((storage.foldername(name))[1] = 'posts' AND (auth.uid())::text = (storage.foldername(name))[2])
    )
  );

-- Add media_type column to posts for video detection
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image';

-- Update user_profiles RLS to allow viewing other users' basic info (for search/profiles)
CREATE POLICY "Users can view other users basic profile info"
  ON public.user_profiles FOR SELECT
  USING (true);