-- Desativar fluxo que enviou mensagens erradas
UPDATE follow_up_flows SET is_active = false WHERE id = 'a05b804e-87dd-47ad-af0f-a4e204f5d980';

-- Limpar execuções erradas para esse fluxo poder ser reexecutado corretamente
DELETE FROM follow_up_step_executions WHERE flow_id = 'a05b804e-87dd-47ad-af0f-a4e204f5d980';