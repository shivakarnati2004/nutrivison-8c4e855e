
-- Stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text DEFAULT 'image',
  caption text,
  music_name text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view non-expired stories" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can create own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- Story views
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see story views" ON public.story_views FOR SELECT USING (true);
CREATE POLICY "Users can mark as viewed" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Reels table
CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  caption text,
  music_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reels" ON public.reels FOR SELECT USING (true);
CREATE POLICY "Users can create own reels" ON public.reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reels" ON public.reels FOR DELETE USING (auth.uid() = user_id);

-- Reel likes
CREATE TABLE public.reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel likes" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Users can like reels" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Reel comments
CREATE TABLE public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel comments" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment on reels" ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reel comments" ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);

-- Saved posts
CREATE TABLE public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own saved posts" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- Saved reels
CREATE TABLE public.saved_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reel_id)
);

ALTER TABLE public.saved_reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own saved reels" ON public.saved_reels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save reels" ON public.saved_reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave reels" ON public.saved_reels FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for stories and reels media
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true);

-- Storage policies for stories
CREATE POLICY "Anyone can view story media" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Users can upload story media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own story media" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for reels
CREATE POLICY "Anyone can view reel media" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "Users can upload reel media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own reel media" ON storage.objects FOR DELETE USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
