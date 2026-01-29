-- Criar trigger para detectar resposta do cliente após notificação
-- O trigger dispara APENAS na primeira mensagem incoming após notified_at
-- porque a condição responded_at IS NULL só é verdadeira antes da primeira resposta

DROP TRIGGER IF EXISTS trigger_detect_vehicle_interest_response ON whatsapp_messages;

CREATE TRIGGER trigger_detect_vehicle_interest_response
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION detect_vehicle_interest_response();