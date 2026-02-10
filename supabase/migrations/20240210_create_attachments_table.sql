-- Create attachments table for Smart Attachment Intelligence
CREATE TABLE IF NOT EXISTS public.attachments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id TEXT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_url TEXT,
  extracted_text TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  similar_to JSONB DEFAULT '[]'::jsonb,
  is_duplicate BOOLEAN DEFAULT FALSE,
  search_text TEXT,
  file_hash TEXT,
  embedding JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on attachments table
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own attachments
CREATE POLICY "Users can view their own attachments"
  ON public.attachments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own attachments
CREATE POLICY "Users can insert their own attachments"
  ON public.attachments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own attachments
CREATE POLICY "Users can update their own attachments"
  ON public.attachments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
  ON public.attachments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON public.attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON public.attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_attachments_category ON public.attachments(category);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON public.attachments(created_at DESC);

-- Create full-text search index on search_text
CREATE INDEX IF NOT EXISTS idx_attachments_search_text ON public.attachments USING gin(to_tsvector('english', COALESCE(search_text, '')));
