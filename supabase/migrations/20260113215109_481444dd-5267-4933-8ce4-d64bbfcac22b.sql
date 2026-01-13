-- Table to link users to WhatsApp instances (without changing instance ownership)
CREATE TABLE public.user_whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, instance_id)
);

-- Enable RLS
ALTER TABLE public.user_whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view their instance links"
  ON public.user_whatsapp_instances
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create instance links"
  ON public.user_whatsapp_instances
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete instance links"
  ON public.user_whatsapp_instances
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Index for faster lookups
CREATE INDEX idx_user_whatsapp_instances_user_id ON public.user_whatsapp_instances(user_id);
CREATE INDEX idx_user_whatsapp_instances_instance_id ON public.user_whatsapp_instances(instance_id);