export type TriggerType = 
  | 'manual' 
  | 'after_lead_creation' 
  | 'after_status_change' 
  | 'after_inactivity' 
  | 'scheduled'
  | 'no_response_to_bot'
  | 'no_response_to_followup'
  | 'no_response_to_salesperson'
  | 'lead_stalled_in_stage';

export interface FollowUpFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  
  // Segmentation
  target_lead_status: string[];
  target_lead_sources: string[];
  target_vehicle_interests: string[];
  target_negotiation_status: string[];
  
  // Timing
  trigger_type: TriggerType;
  delay_days: number;
  delay_hours: number;
  specific_time: string | null;
  days_of_week: number[];
  
  // Message
  message_template: string;
  include_vehicle_info: boolean;
  include_salesperson_name: boolean;
  include_company_name: boolean;
  
  // WhatsApp
  whatsapp_button_text: string;
  
  // Conditions
  min_days_since_last_contact: number | null;
  max_contacts_per_lead: number;
  exclude_converted_leads: boolean;
  exclude_lost_leads: boolean;
  
  // Priority
  priority: number;
  
  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const triggerTypeLabels: Record<TriggerType, string> = {
  manual: 'Manual',
  after_lead_creation: 'Após criar lead',
  after_status_change: 'Após mudança de status',
  after_inactivity: 'Após inatividade geral',
  scheduled: 'Agendado',
  no_response_to_bot: 'Sem resposta à Gabi (bot)',
  no_response_to_followup: 'Sem resposta ao follow-up',
  no_response_to_salesperson: 'Sem resposta ao vendedor',
  lead_stalled_in_stage: 'Lead parado no estágio',
};

export const triggerTypeDescriptions: Record<TriggerType, string> = {
  manual: 'Disparar manualmente pelo usuário',
  after_lead_creation: 'Dispara automaticamente quando um lead é criado',
  after_status_change: 'Dispara quando o lead muda de status/etapa',
  after_inactivity: 'Dispara após X tempo sem nenhuma atividade',
  scheduled: 'Dispara em horários específicos programados',
  no_response_to_bot: 'Lead não respondeu a última mensagem da Gabi',
  no_response_to_followup: 'Lead não respondeu a um follow-up anterior',
  no_response_to_salesperson: 'Lead não respondeu mensagem do vendedor',
  lead_stalled_in_stage: 'Lead está parado na mesma etapa há X tempo',
};

export const daysOfWeekLabels: Record<number, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo',
};
