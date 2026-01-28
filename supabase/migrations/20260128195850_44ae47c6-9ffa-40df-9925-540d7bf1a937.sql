-- Add column to control pipeline visibility for secondary negotiations
ALTER TABLE public.negotiations 
ADD COLUMN IF NOT EXISTS show_in_pipeline BOOLEAN DEFAULT true;

-- Update existing negotiations to show in pipeline
UPDATE public.negotiations SET show_in_pipeline = true WHERE show_in_pipeline IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.negotiations.show_in_pipeline IS 'Controls if negotiation appears in main pipeline view. Secondary negotiations from vehicle changes are hidden.';