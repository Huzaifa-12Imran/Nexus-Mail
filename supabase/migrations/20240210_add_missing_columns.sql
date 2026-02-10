-- Add missing columns to attachments table
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS search_text TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Refresh the schema cache by resetting the table
NOTIFY pgrst, 'reload schema';
