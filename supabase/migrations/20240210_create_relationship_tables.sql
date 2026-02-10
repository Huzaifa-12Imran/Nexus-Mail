-- ============================================================================
-- RELATIONSHIP HEALTH TRACKING TABLES
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.relationship_interactions CASCADE;
DROP TABLE IF EXISTS public.relationship_contacts CASCADE;

-- Create relationship contacts table
CREATE TABLE public.relationship_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  health_score INTEGER DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  total_emails INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  last_contact_at TIMESTAMP WITH TIME ZONE,
  last_email_id TEXT,
  recency_score INTEGER DEFAULT 0,
  response_score INTEGER DEFAULT 0,
  initiation_score INTEGER DEFAULT 0,
  sentiment_score INTEGER DEFAULT 0,
  commitment_score INTEGER DEFAULT 0,
  sentiment_trend TEXT DEFAULT 'stable',
  avg_sentiment DOUBLE PRECISION DEFAULT 0,
  commitments_made INTEGER DEFAULT 0,
  commitments_kept INTEGER DEFAULT 0,
  suggested_action TEXT,
  action_suggested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Create relationship interactions table
CREATE TABLE public.relationship_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.relationship_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL,
  email_id TEXT,
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  was_response BOOLEAN DEFAULT FALSE,
  response_time_minutes DOUBLE PRECISION,
  sentiment DOUBLE PRECISION,
  sentiment_label TEXT,
  tone TEXT,
  has_commitment BOOLEAN DEFAULT FALSE,
  commitment_met BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rc_user_id ON public.relationship_contacts(user_id);
CREATE INDEX idx_rc_health ON public.relationship_contacts(health_score);
CREATE INDEX idx_rc_last_contact ON public.relationship_contacts(last_contact_at);
CREATE INDEX idx_ri_relationship_id ON public.relationship_interactions(relationship_id);

-- Disable RLS for testing
ALTER TABLE public.relationship_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_interactions DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE public.relationship_contacts TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.relationship_interactions TO postgres, anon, authenticated, service_role;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
