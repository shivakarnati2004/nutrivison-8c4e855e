-- Create nutrition_entries table
CREATE TABLE IF NOT EXISTS public.nutrition_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL(10, 2) NOT NULL DEFAULT 0,
  carbs DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fat DECIMAL(10, 2) NOT NULL DEFAULT 0,
  serving_size TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own nutrition entries"
  ON public.nutrition_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition entries"
  ON public.nutrition_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition entries"
  ON public.nutrition_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition entries"
  ON public.nutrition_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_id ON public.nutrition_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_created_at ON public.nutrition_entries(created_at DESC);