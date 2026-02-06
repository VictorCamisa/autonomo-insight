export type VehicleStatus = 'disponivel' | 'reservado' | 'vendido' | 'em_manutencao';
export type VehicleType = 'carro' | 'moto';
export type VehicleCostType = 'aquisicao' | 'documentacao' | 'transferencia' | 'ipva' | 'manutencao' | 'limpeza' | 'frete' | 'comissao_compra' | 'outros';

export interface Vehicle {
  id: string;
  vehicle_type: VehicleType;
  brand: string;
  model: string;
  version: string | null;
  year_fabrication: number;
  year_model: number;
  color: string;
  plate: string | null;
  renavam: string | null;
  chassis: string | null;
  km: number;
  fuel_type: string;
  transmission: string;
  doors: number | null;
  purchase_price: number | null;
  purchase_date: string | null;
  purchase_source: string | null;
  fipe_price_at_purchase: number | null;
  sale_price: number | null;
  minimum_price: number | null;
  expected_margin_percent: number | null;
  expected_sale_days: number | null;
  estimated_maintenance: number | null;
  estimated_cleaning: number | null;
  estimated_documentation: number | null;
  estimated_other_costs: number | null;
  status: VehicleStatus;
  notes: string | null;
  featured: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  mercadolibre_id: string | null;
  images: string[] | null;
}

export interface VehicleCost {
  id: string;
  vehicle_id: string;
  cost_type: VehicleCostType;
  description: string;
  amount: number;
  cost_date: string;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface VehicleDRE {
  id: string;
  brand: string;
  model: string;
  year_model: number;
  plate: string | null;
  status: VehicleStatus;
  purchase_price: number | null;
  purchase_date: string | null;
  sale_price: number | null;
  expected_margin_percent: number | null;
  expected_sale_days: number | null;
  cost_aquisicao: number;
  cost_documentacao: number;
  cost_transferencia: number;
  cost_ipva: number;
  cost_manutencao: number;
  cost_limpeza: number;
  cost_frete: number;
  cost_comissao_compra: number;
  cost_outros: number;
  total_real_costs: number;
  total_investment: number;
  days_in_stock: number;
  holding_cost: number;
  estimated_maintenance: number | null;
  estimated_cleaning: number | null;
  estimated_documentation: number | null;
  estimated_other_costs: number | null;
  total_estimated_costs: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleSimulation {
  id: string;
  brand: string;
  model: string;
  year_model: number;
  km: number;
  purchase_price: number;
  fipe_reference: number | null;
  estimated_maintenance: number | null;
  estimated_cleaning: number | null;
  estimated_documentation: number | null;
  estimated_other_costs: number | null;
  total_cost: number;
  suggested_sale_price: number | null;
  expected_margin: number | null;
  expected_margin_percent: number | null;
  estimated_sale_days: number | null;
  daily_holding_cost: number | null;
  decision: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
  em_manutencao: 'Em Manutenção',
};

export const vehicleStatusColors: Record<VehicleStatus, string> = {
  disponivel: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  reservado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  vendido: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  em_manutencao: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export const vehicleCostTypeLabels: Record<VehicleCostType, string> = {
  aquisicao: 'Aquisição',
  documentacao: 'Documentação',
  transferencia: 'Transferência',
  ipva: 'IPVA',
  manutencao: 'Manutenção',
  limpeza: 'Limpeza',
  frete: 'Frete',
  comissao_compra: 'Comissão de Compra',
  outros: 'Outros',
};

export const fuelTypeLabels: Record<string, string> = {
  flex: 'Flex',
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  diesel: 'Diesel',
  eletrico: 'Elétrico',
  hibrido: 'Híbrido',
};

export const transmissionLabels: Record<string, string> = {
  manual: 'Manual',
  automatico: 'Automático',
  automatizado: 'Automatizado',
  cvt: 'CVT',
};

export const vehicleTypeLabels: Record<VehicleType, string> = {
  carro: 'Carro',
  moto: 'Moto',
};
