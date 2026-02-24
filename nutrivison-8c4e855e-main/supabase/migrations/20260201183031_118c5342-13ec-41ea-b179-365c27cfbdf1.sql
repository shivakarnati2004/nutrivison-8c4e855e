-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
CREATE POLICY "Profile photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add workout_type column to exercises table for gym/home filtering
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS workout_type text DEFAULT 'both';

-- Update existing exercises with appropriate workout_type based on category
UPDATE exercises SET workout_type = 'gym' WHERE category IN ('Strength');
UPDATE exercises SET workout_type = 'home' WHERE category IN ('HIIT', 'Core');
UPDATE exercises SET workout_type = 'both' WHERE category IN ('Cardio');

-- Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  post_type text DEFAULT 'general',
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create reactions table
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create fitness_groups table (renamed from 'groups' which is a reserved word)
CREATE TABLE public.fitness_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.fitness_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_posts table
CREATE TABLE public.group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.fitness_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1 uuid, user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((requester_id = user1 AND addressee_id = user2) OR (requester_id = user2 AND addressee_id = user1))
  )
$$;

-- Function to check if user is group member
CREATE OR REPLACE FUNCTION public.is_group_member(p_user_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = p_user_id AND group_id = p_group_id
  )
$$;

-- Friendships policies
CREATE POLICY "Users can view friendships they're part of"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships where they're the addressee"
ON public.friendships FOR UPDATE
USING (auth.uid() = addressee_id);

CREATE POLICY "Users can delete friendships they're part of"
ON public.friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Posts policies
CREATE POLICY "Users can view posts from friends or their own"
ON public.posts FOR SELECT
USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id));

CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
USING (auth.uid() = user_id);

-- Reactions policies
CREATE POLICY "Users can view reactions on visible posts"
ON public.reactions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id))));

CREATE POLICY "Users can add reactions"
ON public.reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
ON public.reactions FOR DELETE
USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments on visible posts"
ON public.comments FOR SELECT
USING (EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id))));

CREATE POLICY "Users can add comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Fitness groups policies
CREATE POLICY "Anyone can view groups"
ON public.fitness_groups FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create groups"
ON public.fitness_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update group"
ON public.fitness_groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Group creator can delete group"
ON public.fitness_groups FOR DELETE
USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view group members"
ON public.group_members FOR SELECT
USING (true);

CREATE POLICY "Users can join groups or admins can add members"
ON public.group_members FOR INSERT
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_members.group_id AND user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can leave groups"
ON public.group_members FOR DELETE
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

-- Group posts policies
CREATE POLICY "Group members can view group posts"
ON public.group_posts FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create posts"
ON public.group_posts FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can delete their own group posts"
ON public.group_posts FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for social tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;

-- Trigger for friendships updated_at
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();