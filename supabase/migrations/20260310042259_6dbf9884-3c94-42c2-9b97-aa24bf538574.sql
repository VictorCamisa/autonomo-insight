
-- Fix tracking records that were created with wrong started_at (set to last_message_at of negotiation)
UPDATE lead_follow_up_tracking t
SET started_at = n.last_message_at
FROM negotiations n
WHERE t.negotiation_id = n.id
AND t.status = 'active'
AND t.current_step = 0
AND t.started_at > NOW() - interval '5 minutes'
