DELETE FROM whatsapp_messages WHERE contact_id IN ('80ec2f1a-55ec-4208-b88f-affbf391bf86', '30662c01-9829-4ada-8be5-5a43957a432c', '9eb28a5b-0e35-4091-93ce-7775b9e0fd30');
DELETE FROM whatsapp_contacts WHERE id IN ('80ec2f1a-55ec-4208-b88f-affbf391bf86', '30662c01-9829-4ada-8be5-5a43957a432c', '9eb28a5b-0e35-4091-93ce-7775b9e0fd30');
DELETE FROM lead_interactions WHERE lead_id IN ('2353d207-6852-4c54-b127-3d9d2c00d63a', 'd0e15400-bc29-43c0-921b-b33a86e17c6d', 'ee713091-b8c8-468f-aa6f-a4800ff24a39');
DELETE FROM lead_assignments WHERE lead_id IN ('2353d207-6852-4c54-b127-3d9d2c00d63a', 'd0e15400-bc29-43c0-921b-b33a86e17c6d', 'ee713091-b8c8-468f-aa6f-a4800ff24a39');
DELETE FROM ai_agent_conversations WHERE lead_id IN ('2353d207-6852-4c54-b127-3d9d2c00d63a', 'd0e15400-bc29-43c0-921b-b33a86e17c6d', 'ee713091-b8c8-468f-aa6f-a4800ff24a39');
DELETE FROM negotiations WHERE lead_id IN ('2353d207-6852-4c54-b127-3d9d2c00d63a', 'd0e15400-bc29-43c0-921b-b33a86e17c6d', 'ee713091-b8c8-468f-aa6f-a4800ff24a39');
DELETE FROM leads WHERE id IN ('2353d207-6852-4c54-b127-3d9d2c00d63a', 'd0e15400-bc29-43c0-921b-b33a86e17c6d', 'ee713091-b8c8-468f-aa6f-a4800ff24a39');