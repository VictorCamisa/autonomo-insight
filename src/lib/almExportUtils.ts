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
  if (!norm) return null;
  
  // 1) Try explicit BRAND_MAP first
  let almName = BRAND_MAP[norm];
  
  // 2) Fallback: direct match against ALM_MARCAS names (normalized)
  if (!almName) {
    const directMatch = ALM_MARCAS.find(m => normStr(m.nome) === norm);
    if (directMatch) almName = directMatch.nome;
  }
  
  // 3) Fallback: partial match (brand name contains or is contained)
  if (!almName) {
    const partialMatch = ALM_MARCAS.find(m => {
      const n = normStr(m.nome);
      return n.includes(norm) || norm.includes(n);
    });
    if (partialMatch) almName = partialMatch.nome;
  }
  
  if (!almName) return null;
  
  const isMoto = normStr(vehicleType || '') === 'moto';
  if (isMoto) {
    const motoBrand = ALM_MARCAS.find(m => m.nome === almName && m.tipo === 'Moto');
    if (motoBrand) return motoBrand;
  }
  return ALM_MARCAS.find(m => m.nome === almName && m.tipo !== 'Moto') || ALM_MARCAS.find(m => m.nome === almName) || null;
}

export function matchModel(brandId: number, modelStr: string): ALMModelo | null {
  const norm = normStr(modelStr);
  if (!norm) return null;
  
  const models = _syncModelos.filter(m => m.marcaId === brandId);
  if (!models.length) return null;
  
  // Normalize all model names once
  const normalized = models.map(m => ({ model: m, norm: normStr(m.nome) }));
  
  // 1) Exact match
  let match = normalized.find(n => n.norm === norm);
  if (match) return match.model;
  
  // 2) Input starts with ALM model name or vice versa
  match = normalized.find(n => n.norm.startsWith(norm + ' ') || norm.startsWith(n.norm + ' '));
  if (match) return match.model;
  
  // 3) Contains match (input is substring of model name, or model name is substring of input)
  match = normalized.find(n => n.norm.includes(norm));
  if (match) return match.model;
  match = normalized.find(n => norm.includes(n.norm));
  if (match) return match.model;
  
  // 4) First word match (e.g. "CG" matches "CG 160 FAN")
  const firstWord = norm.split(' ')[0];
  if (firstWord.length >= 2) {
    match = normalized.find(n => n.norm.split(' ')[0] === firstWord);
    if (match) return match.model;
    // Also try if any ALM model starts with the first word
    match = normalized.find(n => n.norm.startsWith(firstWord));
    if (match) return match.model;
  }
  
  return null;
}

export function matchColor(colorStr: string): ALMCor | null {
  const norm = normStr(colorStr);
  if (!norm) return null;
  
  const id = COLOR_MAP[norm];
  if (id) return ALM_CORES.find(c => c.id === id) || null;
  
  // Try partial matches
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (norm.includes(k) || k.includes(norm)) return ALM_CORES.find(c => c.id === v) || null;
  }
  
  // Try direct match against ALM_CORES names
  const directMatch = ALM_CORES.find(c => normStr(c.nome) === norm);
  if (directMatch) return directMatch;
  
  // Partial match against ALM_CORES names
  const partialMatch = ALM_CORES.find(c => {
    const n = normStr(c.nome);
    return n.includes(norm) || norm.includes(n);
  });
  if (partialMatch) return partialMatch;
  
  return null;
}

export function matchFuel(fuelStr: string): ALMCombustivel | null {
  const norm = normStr(fuelStr);
  if (!norm) return null;
  
  const id = FUEL_MAP[norm];
  if (id) return ALM_COMBUSTIVEIS.find(c => c.id === id) || null;
  
  // Try partial/contains matches
  for (const [k, v] of Object.entries(FUEL_MAP)) {
    if (norm.includes(k) || k.includes(norm)) return ALM_COMBUSTIVEIS.find(c => c.id === v) || null;
  }
  
  // Direct match against ALM names
  const directMatch = ALM_COMBUSTIVEIS.find(c => normStr(c.nome) === norm);
  if (directMatch) return directMatch;
  
  return null;
}

export function matchCambio(trans: string): ALMCambio | null {
  const norm = normStr(trans);
  if (!norm) return null;
  
  const id = CAMBIO_MAP[norm];
  if (id) return ALM_CAMBIOS.find(c => c.id === id) || null;
  
  // Try partial matches
  for (const [k, v] of Object.entries(CAMBIO_MAP)) {
    if (norm.includes(k) || k.includes(norm)) return ALM_CAMBIOS.find(c => c.id === v) || null;
  }
  
  // Direct match against ALM names
  const directMatch = ALM_CAMBIOS.find(c => normStr(c.nome) === norm);
  if (directMatch) return directMatch;
  
  return null;
}

export function mapVehicle(v: Vehicle, overrides: Record<string, Record<string, string | number>> = {}): MappedVehicle {
  const ov = overrides[v.id] || {};

  // If there's a direct modelId override, handle it separately
  const modelIdOverride = ov.modelId as number | undefined;

  let brandMatch = matchBrand((ov.brand as string) || v.brand, (ov.vehicle_type as string) || v.vehicle_type);
  let modelMatch: ALMModelo | null = null;
  
  // If we have a direct modelId override, find the model by ID
  if (modelIdOverride && brandMatch) {
    modelMatch = _syncModelos.find(m => m.id === modelIdOverride) || null;
    // If found model belongs to a different brand, update brand match
    if (modelMatch && modelMatch.marcaId !== brandMatch.id) {
      const correctBrand = ALM_MARCAS.find(m => m.id === modelMatch!.marcaId);
      if (correctBrand) brandMatch = correctBrand;
    }
  } else if (brandMatch) {
    modelMatch = matchModel(brandMatch.id, (ov.model as string) || v.model);
  }
  
  // Fallback: if model not found under current brand type, try alternative brand type
  if (brandMatch && !modelMatch && !modelIdOverride) {
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
  if (!colorMatch) issues.push('Cor não mapeada');
  if (!fuelMatch) issues.push('Combustível não mapeado');
  if (!cambioMatch) issues.push('Câmbio não mapeado');
  if (!v.sale_price) issues.push('Preço de venda em branco');

  let matchLevel: MatchLevel = 'ok';
  if (issues.some(i => i.includes('Marca não') || i.includes('Preço'))) matchLevel = 'err';
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

function sanitizeXmlText(value: string): string {
  // Keep only XML 1.0 valid chars:
  // #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
  let out = '';
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    const isValid =
      cp === 0x9 ||
      cp === 0xA ||
      cp === 0xD ||
      (cp >= 0x20 && cp <= 0xD7FF) ||
      (cp >= 0xE000 && cp <= 0xFFFD) ||
      (cp >= 0x10000 && cp <= 0x10FFFF);

    if (isValid) out += ch;
  }

  return out.replace(/\r\n?/g, '\n');
}

export function generateXML(vehicles: MappedVehicle[], includeWarn: boolean, allStatuses = false) {
  const data = vehicles
    .filter(mv => allStatuses || mv.raw.status === 'disponivel')
    .filter(mv => mv.matchLevel === 'ok' || (includeWarn && mv.matchLevel === 'warn'));

  const esc = (v: unknown) => sanitizeXmlText(String(v ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const nil = 'xsi:nil="true"';
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const columnVal = (name: string, val: unknown) => {
    if (val === null || val === undefined || val === '') return `\t\t\t\t<column name="${name}" ${nil} />`;
    return `\t\t\t\t<column name="${name}">${esc(val)}</column>`;
  };

  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<pma_xml_export version="1.0" xmlns:pma="https://www.phpmyadmin.net/some_doc_url/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    '\t<database name="veiculos">',
  ];

  data.forEach((mv, idx) => {
    const p = mv.almPayload;
    const v = mv.raw;
    const statusNum = v.status === 'disponivel' ? 0 : v.status === 'vendido' ? 2 : 1;

    xmlLines.push('\t\t<table name="carro">');
    xmlLines.push(columnVal('Id', idx + 1));
    xmlLines.push(columnVal('Ano', p.Ano));
    xmlLines.push(columnVal('AnoModelo', p.AnoModelo));
    xmlLines.push(columnVal('Km', p.Km));
    xmlLines.push(columnVal('QtdPortas', p.QtdPortas));
    xmlLines.push(columnVal('Valor', p.Valor ? p.Valor.toFixed(2) : '0.00'));
    xmlLines.push(columnVal('Descricao', p.Descricao));
    xmlLines.push(columnVal('TipoMotor', p.TipoMotor || null));
    xmlLines.push(columnVal('NumeroDonos', null));
    xmlLines.push(columnVal('MarcaId', p.MarcaId));
    xmlLines.push(columnVal('ModeloId', p.ModeloId));
    xmlLines.push(columnVal('TipoVeiculo', p.TipoVeiculo === 'Moto' ? 1 : 0));
    xmlLines.push(columnVal('Placa', p.Placa));
    xmlLines.push(columnVal('DsAutoEstoqueId', null));
    xmlLines.push(columnVal('DsDataCadastro', null));
    xmlLines.push(columnVal('DsDataAlteracao', null));
    xmlLines.push(columnVal('DataCadastro', now));
    xmlLines.push(columnVal('DataAlteracao', now));
    xmlLines.push(columnVal('DataInsercaoBatch', null));
    xmlLines.push(columnVal('StatusVeiculo', statusNum));
    xmlLines.push(columnVal('VersaoId', null));
    xmlLines.push(columnVal('CompraId', null));
    xmlLines.push(columnVal('ConsignacaoId', null));
    xmlLines.push(columnVal('VendaId', null));
    xmlLines.push(columnVal('Chassi', p.Chassi || null));
    xmlLines.push(columnVal('MercadoLibreId', null));
    xmlLines.push(columnVal('CombustivelId', p.CombustivelId));
    xmlLines.push(columnVal('CorId', p.CorId));
    xmlLines.push(columnVal('OutraCor', null));
    xmlLines.push(columnVal('CambioId', p.CambioId));
    xmlLines.push(columnVal('CategoriaId', null));
    xmlLines.push(columnVal('DirecaoId', null));
    xmlLines.push(columnVal('Cilindrada', null));
    xmlLines.push(columnVal('PartidaId', null));
    xmlLines.push(columnVal('AlimentacaoId', null));
    xmlLines.push(columnVal('FreioId', null));
    xmlLines.push(columnVal('MotorId', null));
    xmlLines.push(columnVal('RefrigeracaoId', null));
    xmlLines.push(columnVal('MercadoLibreDataPublicacao', null));
    xmlLines.push(columnVal('MercadoLibrePlano', null));
    xmlLines.push(columnVal('OlxToken', null));
    xmlLines.push(columnVal('OlxId', null));
    xmlLines.push(columnVal('OlxUrl', null));
    xmlLines.push(columnVal('OlxDataPublicacao', null));
    xmlLines.push(columnVal('CompreCarId', null));
    xmlLines.push(columnVal('CompreCarDataPublicacao', null));
    xmlLines.push(columnVal('OlxErros', null));
    xmlLines.push(columnVal('OlxStatus', null));
    xmlLines.push(columnVal('OlxOperacao', null));
    xmlLines.push(columnVal('ICarrosId', null));
    xmlLines.push(columnVal('ICarrosDataPublicacao', null));
    xmlLines.push(columnVal('ICarrosPrioridade', null));
    xmlLines.push(columnVal('MercadoLibreUrl', null));
    xmlLines.push(columnVal('AutolineId', null));
    xmlLines.push(columnVal('AutolineDataPublicacao', null));
    xmlLines.push(columnVal('AutolinePlano', null));
    xmlLines.push(columnVal('ZeroKm', p.ZeroKm ? 1 : 0));
    xmlLines.push(columnVal('CompreCarUrl', null));
    xmlLines.push(columnVal('CompreCarWarnings', null));
    xmlLines.push(columnVal('CarroAmericanaIntegradorId', null));
    xmlLines.push(columnVal('CarroAmericanaPublicar', null));
    xmlLines.push(columnVal('CarroAmericanaDataPublicacao', null));
    xmlLines.push(columnVal('WebmotorsId', null));
    xmlLines.push(columnVal('WebmotorsPlano', null));
    xmlLines.push(columnVal('WebmotorsPublicar', null));
    xmlLines.push(columnVal('WebmotorsDataPublicacao', null));
    xmlLines.push(columnVal('WebmotorsUrl', null));
    xmlLines.push(columnVal('MeuCarroNovoId', null));
    xmlLines.push(columnVal('MeuCarroNovoPublicar', null));
    xmlLines.push(columnVal('MeuCarroNovoDataPublicacao', null));
    xmlLines.push(columnVal('MeuCarroNovoUrl', null));
    xmlLines.push(columnVal('MeuCarroNovoPlano', null));
    xmlLines.push(columnVal('AutosnaWebId', null));
    xmlLines.push(columnVal('AutosnaWebPublicar', null));
    xmlLines.push(columnVal('AutosnaWebDataPublicacao', null));
    xmlLines.push(columnVal('AutosnaWebUrl', null));
    xmlLines.push(columnVal('MobiautoId', null));
    xmlLines.push(columnVal('MobiautoPlano', null));
    xmlLines.push(columnVal('MobiautoPublicar', null));
    xmlLines.push(columnVal('MobiautoDataPublicacao', null));
    xmlLines.push(columnVal('MobiautoUrl', null));
    xmlLines.push(columnVal('Renavam', (v as any).renavam || null));
    xmlLines.push(columnVal('UsadosbrId', null));
    xmlLines.push(columnVal('UsadosbrPlano', null));
    xmlLines.push(columnVal('UsadosbrPublicar', null));
    xmlLines.push(columnVal('UsadosbrDataPublicacao', null));
    xmlLines.push(columnVal('UsadosbrUrl', null));
    xmlLines.push('\t\t</table>');
  });

  xmlLines.push('\t</database>');
  xmlLines.push('</pma_xml_export>');

  const xmlContent = xmlLines.join('\n');
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'estoque_alm_export.xml';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
