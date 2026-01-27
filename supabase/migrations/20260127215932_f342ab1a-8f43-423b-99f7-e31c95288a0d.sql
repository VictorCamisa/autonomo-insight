-- Clear the old API key from the agent record so it uses the environment variable
UPDATE ai_agents 
SET api_key_encrypted = NULL 
WHERE id = '76591590-0f88-4594-a518-f02b7c5eff8e';