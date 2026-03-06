
DELETE FROM whatsapp_messages WHERE contact_id = 'f8c1ef3d-e937-44aa-bb23-cf396704f593';
DELETE FROM whatsapp_contacts WHERE id = 'f8c1ef3d-e937-44aa-bb23-cf396704f593';
DELETE FROM lead_interactions WHERE lead_id = 'b2017bdd-bde4-4fe0-bd6e-13fd69da8323';
DELETE FROM lead_assignments WHERE lead_id = 'b2017bdd-bde4-4fe0-bd6e-13fd69da8323';
DELETE FROM negotiations WHERE lead_id = 'b2017bdd-bde4-4fe0-bd6e-13fd69da8323';
DELETE FROM ai_agent_conversations WHERE lead_id = 'b2017bdd-bde4-4fe0-bd6e-13fd69da8323';
DELETE FROM leads WHERE id = 'b2017bdd-bde4-4fe0-bd6e-13fd69da8323';
