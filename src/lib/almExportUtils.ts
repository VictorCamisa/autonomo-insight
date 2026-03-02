import type { Vehicle } from '@/types/inventory';
import {
  ALM_MARCAS, ALM_CORES, ALM_COMBUSTIVEIS, ALM_CAMBIOS,
  BRAND_MAP, COLOR_MAP, FUEL_MAP, CAMBIO_MAP, TYPE_MAP,
  type ALMMarca, type ALMModelo, type ALMCor, type ALMCombustivel, type ALMCambio,
} from './almExportData';

// We need ALM_MODELOS but it's huge - import it lazily
let _almModelos: ALMModelo[] | null = null;
export async function getALMModelos(): Promise<ALMModelo[]> {
  if (_almModelos) return _almModelos;
  const mod = await import('./almExportModelos');
  _almModelos = mod.ALM_MODELOS;
  return _almModelos;
}

// For sync usage after loading
let _syncModelos: ALMModelo[] = [];
export function setModelos(m: ALMModelo[]) { _syncModelos = m; }
export function getModelos() { return _syncModelos; }

export type MatchLevel = 'ok' | 'warn' | 'err';

export interface MappedVehicle {
  raw: Vehicle;
  brandMatch: ALMMarca | null;
  modelMatch: ALMModelo | null;
  colorMatch: ALMCor | null;
  fuelMatch: ALMCombustivel | null;
  cambioMatch: ALMCambio | null;
  tipoVeiculo: string;
  issues: string[];
  matchLevel: MatchLevel;
  almPayload: ALMPayload;
}

export interface ALMPayload {
  TipoVeiculo: string;
  StatusVeiculo: string;
  MarcaId: number | null;
  ModeloId: number | null;
  VersaoId: null;
  Placa: string;
  Chassi: string;
  ZeroKm: boolean;
  Ano: number | null;
  AnoModelo: number | null;
  Km: number;
  NumeroDonos: null;
  QtdPortas: number | null;
  Valor: number;
  Descricao: string;
  CombustivelId: number | null;
  CambioId: number | null;
  CategoriaId: null;
  DirecaoId: null;
  CorId: number | null;
  MotorId: null;
  PartidaId: null;
  AlimentacaoId: null;
  RefrigeracaoId: null;
  FreioId: null;
  TipoMotor: string;
  Cilindrada: null;
  opcionaisId: number[];
  fotosId: string[];
}

export function normStr(s: string): string {
  return (s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchBrand(brandStr: string, vehicleType?: string): ALMMarca | null {
  const norm = normStr(brandStr);
  const mapped = BRAND_MAP[norm];
  if (!mapped) return null;
  const isMoto = (vehicleType || '').toLowerCase() === 'moto';
  if (isMoto) {
    const motoBrand = ALM_MARCAS.find(m => m.nome === mapped && m.tipo === 'Moto');
    if (motoBrand) return motoBrand;
  }
  return ALM_MARCAS.find(m => m.nome === mapped && m.tipo !== 'Moto') || ALM_MARCAS.find(m => m.nome === mapped) || null;
}

export function matchModel(brandId: number, modelStr: string): ALMModelo | null {
  const norm = normStr(modelStr);
  const models = _syncModelos.filter(m => m.marcaId === brandId);
  if (!models.length) return null;
  let match = models.find(m => normStr(m.nome) === norm);
  if (match) return match;
  match = models.find(m => normStr(m.nome).includes(norm) || norm.includes(normStr(m.nome)));
  return match || null;
}

export function matchColor(colorStr: string): ALMCor | null {
  const norm = normStr(colorStr);
  const id = COLOR_MAP[norm];
  if (id) return ALM_CORES.find(c => c.id === id) || null;
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (norm.includes(k) || k.includes(norm)) return ALM_CORES.find(c => c.id === v) || null;
  }
  return null;
}

export function matchFuel(fuelStr: string): ALMCombustivel | null {
  const norm = normStr(fuelStr);
  const id = FUEL_MAP[norm];
  if (id) return ALM_COMBUSTIVEIS.find(c => c.id === id) || null;
  for (const [k, v] of Object.entries(FUEL_MAP)) {
    if (norm.includes(k)) return ALM_COMBUSTIVEIS.find(c => c.id === v) || null;
  }
  return null;
}

export function matchCambio(trans: string): ALMCambio | null {
  const norm = normStr(trans);
  const id = CAMBIO_MAP[norm];
  if (id) return ALM_CAMBIOS.find(c => c.id === id) || null;
  return null;
}

export function mapVehicle(v: Vehicle, overrides: Record<string, Record<string, string | number>> = {}): MappedVehicle {
  const ov = overrides[v.id] || {};

  let brandMatch = matchBrand((ov.brand as string) || v.brand, (ov.vehicle_type as string) || v.vehicle_type);
  let modelMatch = brandMatch ? matchModel(brandMatch.id, (ov.model as string) || v.model) : null;
  
  // Fallback: if model not found under carro brand, try moto brand
  if (brandMatch && !modelMatch) {
    const altBrand = ALM_MARCAS.find(m => m.nome === brandMatch!.nome && m.tipo !== brandMatch!.tipo);
    if (altBrand) {
      const altModel = matchModel(altBrand.id, (ov.model as string) || v.model);
      if (altModel) { brandMatch = altBrand; modelMatch = altModel; }
    }
  }

  const colorMatch = matchColor((ov.color as string) || v.color || '');
  const fuelMatch = matchFuel((ov.fuel as string) || v.fuel_type || '');
  const cambioMatch = matchCambio((ov.transmission as string) || v.transmission || '');
  const tipoVeiculo = TYPE_MAP[normStr(v.vehicle_type || 'carro')] || 'Carro';

  const issues: string[] = [];
  if (!brandMatch) issues.push('Marca não encontrada no ALM');
  if (brandMatch && !modelMatch) {
    const brandHasModels = _syncModelos.some(m => m.marcaId === brandMatch!.id);
    if (brandHasModels) {
      issues.push('Modelo não cadastrado no ALM — selecione manualmente');
    } else {
      issues.push('Marca sem modelos no ALM');
    }
  }
  if (!fuelMatch) issues.push('Combustível não mapeado');
  if (!cambioMatch) issues.push('Câmbio não mapeado');
  if (!v.sale_price) issues.push('Preço de venda em branco');

  let matchLevel: MatchLevel = 'ok';
  if (issues.some(i => i.includes('Marca') || i.includes('Preço'))) matchLevel = 'err';
  else if (issues.length > 0) matchLevel = 'warn';

  return {
    raw: v,
    brandMatch, modelMatch, colorMatch, fuelMatch, cambioMatch,
    tipoVeiculo, issues, matchLevel,
    almPayload: buildPayload(v, brandMatch, modelMatch, colorMatch, fuelMatch, cambioMatch, tipoVeiculo),
  };
}

function buildPayload(
  v: Vehicle,
  brandMatch: ALMMarca | null,
  modelMatch: ALMModelo | null,
  colorMatch: ALMCor | null,
  fuelMatch: ALMCombustivel | null,
  cambioMatch: ALMCambio | null,
  tipoVeiculo: string,
): ALMPayload {
  return {
    TipoVeiculo: tipoVeiculo,
    StatusVeiculo: 'Cadastrado',
    MarcaId: brandMatch?.id ?? null,
    ModeloId: modelMatch?.id ?? null,
    VersaoId: null,
    Placa: v.plate || '',
    Chassi: v.chassis || '',
    ZeroKm: false,
    Ano: v.year_fabrication || null,
    AnoModelo: v.year_model || null,
    Km: v.km || 0,
    NumeroDonos: null,
    QtdPortas: v.doors || null,
    Valor: v.sale_price || 0,
    Descricao: v.notes || `${v.brand} ${v.model} ${v.version || ''} - ${v.year_fabrication}/${v.year_model}`,
    CombustivelId: fuelMatch?.id ?? null,
    CambioId: cambioMatch?.id ?? null,
    CategoriaId: null,
    DirecaoId: null,
    CorId: colorMatch?.id ?? null,
    MotorId: null,
    PartidaId: null,
    AlimentacaoId: null,
    RefrigeracaoId: null,
    FreioId: null,
    TipoMotor: v.version || '',
    Cilindrada: null,
    opcionaisId: [],
    fotosId: [],
  };
}

export function generateJSON(vehicles: MappedVehicle[], includeWarn: boolean) {
  const data = vehicles
    .filter(mv => mv.raw.status === 'disponivel')
    .filter(mv => mv.matchLevel === 'ok' || (includeWarn && mv.matchLevel === 'warn'))
    .map(mv => mv.almPayload);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'estoque_alm_export.json';
  a.click();
  URL.revokeObjectURL(a.href);
  return data;
}

export function generateXML(vehicles: MappedVehicle[], includeWarn: boolean) {
  const data = vehicles
    .filter(mv => mv.raw.status === 'disponivel')
    .filter(mv => mv.matchLevel === 'ok' || (includeWarn && mv.matchLevel === 'warn'))
    .map(mv => mv.almPayload);

  const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>', '<Veiculos>'];
  data.forEach(v => {
    xmlLines.push('  <Veiculo>');
    for (const [key, val] of Object.entries(v)) {
      if (Array.isArray(val)) {
        xmlLines.push(`    <${key}>${val.join(',')}</${key}>`);
      } else if (val !== null && val !== undefined) {
        xmlLines.push(`    <${key}>${String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${key}>`);
      } else {
        xmlLines.push(`    <${key}></${key}>`);
      }
    }
    xmlLines.push('  </Veiculo>');
  });
  xmlLines.push('</Veiculos>');

  const blob = new Blob([xmlLines.join('\n')], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'estoque_alm_export.xml';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportCSV(vehicles: MappedVehicle[]) {
  const data = vehicles.map(mv => mv.almPayload);
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = [headers.join(';')];
  data.forEach(v => {
    rows.push(headers.map(h => {
      const val = (v as unknown as Record<string, unknown>)[h];
      if (Array.isArray(val)) return val.join(',');
      if (val === null || val === undefined) return '';
      return String(val).replace(/;/g, ',');
    }).join(';'));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'estoque_alm_export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function getPreviewData(vehicles: MappedVehicle[], includeWarn: boolean) {
  return vehicles
    .filter(mv => mv.raw.status === 'disponivel')
    .filter(mv => mv.matchLevel === 'ok' || (includeWarn && mv.matchLevel === 'warn'))
    .map(mv => mv.almPayload);
}
