-- ============================================================================
-- EMAIL ENERGY BUDGET TABLES
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.email_energy_ratings CASCADE;
DROP TABLE IF EXISTS public.energy_patterns CASCADE;

-- Create email energy ratings table
CREATE TABLE public.email_energy_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 3),
  energy_icon TEXT NOT NULL DEFAULT '😐',
  energy_label TEXT NOT NULL DEFAULT 'Neutral',
  subject TEXT,
  sender_email TEXT,
  sender_name TEXT,
  time_of_day INTEGER CHECK (time_of_day >= 0 AND time_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_read BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  thread_length INTEGER DEFAULT 0,
  estimated_reading_time INTEGER DEFAULT 0,
  notes TEXT,
  scheduled_suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

-- Create energy patterns table (for cached AI analysis)
CREATE TABLE public.energy_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  confidence_score DOUBLE PRECISION DEFAULT 0,
  suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_energy_user_id ON public.email_energy_ratings(user_id);
CREATE INDEX idx_energy_email_id ON public.email_energy_ratings(email_id);
CREATE INDEX idx_energy_level ON public.email_energy_ratings(energy_level);
CREATE INDEX idx_energy_time ON public.email_energy_ratings(time_of_day);
CREATE INDEX idx_energy_day ON public.email_energy_ratings(day_of_week);
CREATE INDEX idx_energy_created ON public.email_energy_ratings(created_at);
CREATE INDEX idx_energy_sender ON public.email_energy_ratings(sender_email);
CREATE INDEX idx_patterns_user ON public.energy_patterns(user_id);
CREATE INDEX idx_patterns_type ON public.energy_patterns(pattern_type);

-- Disable RLS for testing
ALTER TABLE public.email_energy_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_patterns DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE public.email_energy_ratings TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.energy_patterns TO postgres, anon, authenticated, service_role;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
