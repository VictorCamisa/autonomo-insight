-- Criar cron job para processar follow-ups a cada 5 minutos
SELECT cron.schedule(
  'process-follow-ups-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ahfoixzdnpswuqavbmgf.supabase.co/functions/v1/process-follow-ups',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZm9peHpkbnBzd3VxYXZibWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDE0MTcsImV4cCI6MjA4MTE3NzQxN30.7n1o2ruVobI7EOFcSeYR_2NPdAhL3a7sALqFcf9Uzf0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);