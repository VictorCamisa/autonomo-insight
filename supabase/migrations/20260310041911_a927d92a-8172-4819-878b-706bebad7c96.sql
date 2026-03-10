
-- Update move_stale_negotiations to also handle atendimento_ia
CREATE OR REPLACE FUNCTION public.move_stale_negotiations_to_follow_up()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Move negociações em 'negociando' há mais de 24h sem mensagem
  UPDATE negotiations
  SET status = 'follow_up',
      updated_at = now()
  WHERE status = 'negociando'
    AND last_message_at < now() - INTERVAL '24 hours';

  -- Move negociações em 'atendimento_ia' há mais de 24h sem mensagem
  UPDATE negotiations
  SET status = 'follow_up',
      updated_at = now()
  WHERE status = 'atendimento_ia'
    AND last_message_at < now() - INTERVAL '24 hours';
END;
$function$;
