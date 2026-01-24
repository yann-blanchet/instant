-- Add pdf_url field to visits table
-- This field stores the URL to the generated PDF for a finalized visit
-- It remains NULL until the visit is finalized (ended_at is set)

ALTER TABLE visits
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN visits.pdf_url IS 'URL to the generated PDF document. NULL until visit is finalized (ended_at is set).';
