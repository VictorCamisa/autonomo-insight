
-- Remove cron antigo se existir
SELECT cron.unschedule('follow-up-scheduler') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'follow-up-scheduler');

SELECT cron.schedule(
  'follow-up-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ahfoixzdnpswuqavbmgf.supabase.co/functions/v1/follow-up-scheduler',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZm9peHpkbnBzd3VxYXZibWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDE0MTcsImV4cCI6MjA4MTE3NzQxN30.7n1o2ruVobI7EOFcSeYR_2NPdAhL3a7sALqFcf9Uzf0"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  );
  $$
);
