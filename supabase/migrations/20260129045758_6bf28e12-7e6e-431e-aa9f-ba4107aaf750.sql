-- Add tracking columns to vehicle_interest_alerts
ALTER TABLE public.vehicle_interest_alerts 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS response_message TEXT,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS conversion_sale_id UUID REFERENCES public.sales(id),
ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_notification_message TEXT;

-- Create function to detect response to vehicle interest notification
CREATE OR REPLACE FUNCTION public.detect_vehicle_interest_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_alert_id UUID;
  v_alert_record RECORD;
BEGIN
  -- Only check incoming messages
  IF NEW.direction != 'incoming' THEN
    RETURN NEW;
  END IF;
  
  -- Find alert for this contact's lead that was notified but not yet responded
  SELECT via.* INTO v_alert_record
  FROM vehicle_interest_alerts via
  JOIN whatsapp_contacts wc ON wc.lead_id = via.lead_id
  WHERE wc.id = NEW.contact_id
    AND via.status = 'notified'
    AND via.responded_at IS NULL
    AND via.notified_at IS NOT NULL
    AND NEW.created_at > via.notified_at
  ORDER BY via.notified_at DESC
  LIMIT 1;
  
  IF v_alert_record.id IS NOT NULL THEN
    -- Mark alert as responded
    UPDATE vehicle_interest_alerts
    SET responded_at = NEW.created_at,
        response_message = LEFT(NEW.content, 500),
        updated_at = now()
    WHERE id = v_alert_record.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to detect responses
DROP TRIGGER IF EXISTS detect_vehicle_interest_response_trigger ON whatsapp_messages;
CREATE TRIGGER detect_vehicle_interest_response_trigger
AFTER INSERT ON whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.detect_vehicle_interest_response();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_interest_alerts_status_responded 
ON vehicle_interest_alerts(status, notified_at) 
WHERE responded_at IS NULL;