
-- Assign salesperson via round robin to negotiations without one
UPDATE negotiations SET salesperson_id = '422faccf-31f5-4b64-b1b0-75c836090c03' WHERE id IN ('53ab165d-f4ee-4a46-bcae-7f947089088c', '000cfed1-8c40-489d-bcec-7b478c5b4ff8', '64c3aa04-e817-48d0-b080-850e7fc45a4f');
UPDATE negotiations SET salesperson_id = '57ebaa3a-dae8-4c60-bfaf-e58b217c2bd7' WHERE id IN ('dd9f9336-226e-40a7-8889-d3b0870d5f15', 'd5ac17e7-4581-4c81-bd01-8cb5b784081d');
UPDATE negotiations SET salesperson_id = '6c6e6c96-41d1-4ccc-a8d7-bbe1d1e62336' WHERE id IN ('869ec80f-7ae4-40cb-87a4-88ea8c0c367f', '47a31dba-a4bd-4016-8ef7-8bf3d5a11dd2');

-- Also update leads assigned_to
UPDATE leads SET assigned_to = '422faccf-31f5-4b64-b1b0-75c836090c03' WHERE id IN ('c2dbe784-f9fa-4ac6-b9e9-986039dcadff', '41402034-c69e-4a15-b972-38c02c90fea8', '0d289783-75b1-40aa-a9ad-01f700a90664') AND assigned_to IS NULL;
UPDATE leads SET assigned_to = '57ebaa3a-dae8-4c60-bfaf-e58b217c2bd7' WHERE id IN ('a753b6cd-c3c3-416e-bdc1-a5a135c497a0', 'f2cd453c-ee1a-4e91-8beb-0f8dae3333fd') AND assigned_to IS NULL;
UPDATE leads SET assigned_to = '6c6e6c96-41d1-4ccc-a8d7-bbe1d1e62336' WHERE id IN ('2a20cb12-7e3e-4624-8764-9c3f88936af3', '9f9e392e-2def-4c7e-832f-788f44128c24') AND assigned_to IS NULL;

-- Move ALL atendimento_ia negotiations to negociando
UPDATE negotiations SET status = 'negociando', updated_at = now() WHERE status = 'atendimento_ia';
