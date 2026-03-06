
DELETE FROM whatsapp_messages WHERE contact_id = '8f08269c-5da4-4dd4-99b6-8d48f24575e6';
DELETE FROM whatsapp_contacts WHERE id = '8f08269c-5da4-4dd4-99b6-8d48f24575e6';
DELETE FROM lead_interactions WHERE lead_id = 'e77f607f-563c-4e1c-ad03-4ef7a27a700c';
DELETE FROM lead_assignments WHERE lead_id = 'e77f607f-563c-4e1c-ad03-4ef7a27a700c';
DELETE FROM ai_agent_messages WHERE conversation_id IN (SELECT id FROM ai_agent_conversations WHERE lead_id = 'e77f607f-563c-4e1c-ad03-4ef7a27a700c');
DELETE FROM ai_agent_conversations WHERE lead_id = 'e77f607f-563c-4e1c-ad03-4ef7a27a700c';
DELETE FROM negotiations WHERE lead_id = 'e77f607f-563c-4e1c-ad03-4ef7a27a700c';
DELETE FROM leads WHERE id = 'e77f607f-563c-4e1c-ad03-4ef7a27a700c';
