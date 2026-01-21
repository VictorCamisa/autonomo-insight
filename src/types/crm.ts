export type LeadStatus = 'novo' | 'contato_inicial' | 'qualificado' | 'proposta' | 'negociacao' | 'convertido' | 'perdido';
export type LeadSource = 'website' | 'indicacao' | 'facebook' | 'instagram' | 'google_ads' | 'olx' | 'webmotors' | 'outros';
export type QualificationStatus = 'nao_qualificado' | 'qualificado' | 'desqualificado';

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  vehicle_interest: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Meta Ads tracking
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  // UTM tracking
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  // Qualification
  qualification_status: QualificationStatus | null;
  qualification_reason: string | null;
  qualification_level: string | null;
  qualification_data: Record<string, unknown> | null;
  qualification_score: number | null;
  first_response_at: string | null;
  // Joined data
  assigned_profile?: {
    full_name: string | null;
  };
  meta_campaign?: {
    id: string;
    name: string;
  };
}

export interface Customer {
  id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string;
  cpf_cnpj: string | null;
  rg: string | null;
  renavam: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: Lead;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  description: string;
  created_at: string;
  follow_up_date?: string | null;
  follow_up_completed?: boolean;
  // Joined data
  user_profile?: {
    full_name: string | null;
  };
  lead?: {
    id: string;
    name: string;
    phone: string;
    assigned_to: string | null;
  };
}

export const leadStatusLabels: Record<LeadStatus, string> = {
  novo: 'Novo',
  contato_inicial: 'Contato Inicial',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

export const leadSourceLabels: Record<LeadSource, string> = {
  website: 'Website',
  indicacao: 'Indicação',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_ads: 'Google Ads',
  olx: 'OLX',
  webmotors: 'WebMotors',
  outros: 'Outros',
};

export const leadStatusColors: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  contato_inicial: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  qualificado: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  proposta: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  negociacao: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  convertido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  perdido: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export const qualificationStatusLabels: Record<QualificationStatus, string> = {
  nao_qualificado: 'Não Qualificado',
  qualificado: 'Qualificado',
  desqualificado: 'Desqualificado',
};

export const qualificationStatusColors: Record<QualificationStatus, string> = {
  nao_qualificado: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  qualificado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  desqualificado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};
