
-- Delete whatsapp messages for Victor Camisa
DELETE FROM whatsapp_messages WHERE contact_id = '18551f19-7489-4946-8a6b-30a95204697c';

-- Delete whatsapp contact
DELETE FROM whatsapp_contacts WHERE id = '18551f19-7489-4946-8a6b-30a95204697c';

-- Delete lead interactions
DELETE FROM lead_interactions WHERE lead_id = '82a88eb1-d325-4efd-bb42-74223cc44c56';

-- Delete lead assignments
DELETE FROM lead_assignments WHERE lead_id = '82a88eb1-d325-4efd-bb42-74223cc44c56';

-- Delete negotiations
DELETE FROM negotiations WHERE lead_id = '82a88eb1-d325-4efd-bb42-74223cc44c56';

-- Delete the lead
DELETE FROM leads WHERE id = '82a88eb1-d325-4efd-bb42-74223cc44c56';
