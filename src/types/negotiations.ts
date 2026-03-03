export type NegotiationStatus = 'atendimento_ia' | 'negociando' | 'ganho' | 'follow_up' | 'perdido';
export type LossReasonType = 'sem_entrada' | 'sem_credito' | 'curioso' | 'caro' | 'comprou_outro' | 'desistiu' | 'sem_contato' | 'veiculo_vendido' | 'outros';

export interface Negotiation {
  id: string;
  lead_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  salesperson_id: string;
  status: NegotiationStatus;
  estimated_value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  loss_reason: string | null;
  structured_loss_reason: LossReasonType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Tracking de última mensagem
  last_message_at: string | null;
  // Appointment tracking
  appointment_date: string | null;
  appointment_time: string | null;
  showed_up: boolean | null;
  objections: string[];
  // Joined data
  lead?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    source: string;
    first_response_at: string | null;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year_model: number;
    plate: string | null;
    sale_price: number | null;
  };
  salesperson?: {
    full_name: string | null;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
}

export const negotiationStatusLabels: Record<NegotiationStatus, string> = {
  atendimento_ia: 'Em Atendimento IA',
  negociando: 'Negociando',
  ganho: 'Ganho',
  follow_up: 'Follow-up',
  perdido: 'Perdido',
};

export const negotiationStatusColors: Record<NegotiationStatus, string> = {
  atendimento_ia: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  negociando: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ganho: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  follow_up: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  perdido: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

// Ordem das colunas no pipeline
export const pipelineColumns: NegotiationStatus[] = [
  'atendimento_ia',
  'negociando',
  'ganho',
  'follow_up',
  'perdido',
];

export const lossReasonLabels: Record<LossReasonType, string> = {
  sem_entrada: 'Sem Entrada',
  sem_credito: 'Sem Crédito',
  curioso: 'Apenas Curioso',
  caro: 'Preço Alto',
  comprou_outro: 'Comprou em Outro Lugar',
  desistiu: 'Desistiu da Compra',
  sem_contato: 'Sem Contato',
  veiculo_vendido: 'Veículo já Vendido',
  outros: 'Outros',
};

export const objectionOptions = [
  { value: 'entrada', label: 'Valor de Entrada' },
  { value: 'parcela', label: 'Valor da Parcela' },
  { value: 'preco', label: 'Preço do Veículo' },
  { value: 'km', label: 'Quilometragem' },
  { value: 'ano', label: 'Ano do Veículo' },
  { value: 'cor', label: 'Cor' },
  { value: 'modelo', label: 'Modelo/Versão' },
  { value: 'condicao', label: 'Condição do Veículo' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'financiamento', label: 'Condições de Financiamento' },
  { value: 'troca', label: 'Valor da Troca' },
  { value: 'prazo', label: 'Prazo de Entrega' },
];

// Interface para tracking de follow-up
export interface LeadFollowUpTracking {
  id: string;
  lead_id: string | null;
  negotiation_id: string | null;
  flow_id: string | null;
  current_step: number;
  started_at: string;
  last_step_at: string | null;
  next_step_at: string | null;
  status: 'active' | 'completed' | 'reactivated' | 'expired' | 'paused';
  reactivated_count: number;
  created_at: string;
  updated_at: string;
}
