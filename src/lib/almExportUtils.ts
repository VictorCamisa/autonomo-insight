import type { Vehicle } from '@/types/inventory';
import {
  ALM_MARCAS, ALM_CORES, ALM_COMBUSTIVEIS, ALM_CAMBIOS,
  BRAND_MAP, COLOR_MAP, FUEL_MAP, CAMBIO_MAP, TYPE_MAP,
  type ALMMarca, type ALMModelo, type ALMCor, type ALMCombustivel, type ALMCambio,
} from './almExportData';

// Load ALM models - import from almExportModelos
let _almModelos: ALMModelo[] | null = null;
export async function getALMModelos(): Promise<ALMModelo[]> {
  if (_almModelos) return _almModelos;
  const mod = await import('./almExportModelos');
  _almModelos = mod.ALM_MODELOS;
  _syncModelos = mod.ALM_MODELOS; // Also set sync modelos immediately
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
  
  // 3) Exact match on just the first word(s) of the input
  match = normalized.find(n => n.norm === norm.split(' ')[0]);
  if (match) return match.model;
  
  // 4) Contains match (input is substring of model name, or model name is substring of input)
  match = normalized.find(n => n.norm.includes(norm));
  if (match) return match.model;
  match = normalized.find(n => norm.includes(n.norm));
  if (match) return match.model;
  
  // 5) First word match (e.g. "CG" matches "CG 160 FAN")
  const firstWord = norm.split(' ')[0];
  if (firstWord.length >= 2) {
    match = normalized.find(n => n.norm.split(' ')[0] === firstWord);
    if (match) return match.model;
    match = normalized.find(n => n.norm.startsWith(firstWord));
    if (match) return match.model;
  }
  
  // 6) Remove hyphens/dashes and retry
  const normNoDash = norm.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (normNoDash !== norm) {
    match = normalized.find(n => {
      const nNoDash = n.norm.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      return nNoDash === normNoDash || nNoDash.startsWith(normNoDash) || normNoDash.startsWith(nNoDash);
    });
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

function getExportData(vehicles: MappedVehicle[], includeWarn: boolean, allStatuses = false) {
  return allStatuses
    ? vehicles.filter(mv => mv.matchLevel === 'ok' || (includeWarn && mv.matchLevel === 'warn'))
    : vehicles
        .filter(mv => mv.raw.status === 'disponivel')
        .filter(mv => mv.matchLevel === 'ok' || (includeWarn && mv.matchLevel === 'warn'));
}

function getCarroRows(data: MappedVehicle[]) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const columns = [
    'Id', 'Ano', 'AnoModelo', 'Km', 'QtdPortas', 'Valor', 'Descricao', 'TipoMotor',
    'NumeroDonos', 'MarcaId', 'ModeloId', 'TipoVeiculo', 'Placa',
    'DsAutoEstoqueId', 'DsDataCadastro', 'DsDataAlteracao',
    'DataCadastro', 'DataAlteracao', 'DataInsercaoBatch',
    'StatusVeiculo', 'VersaoId', 'CompraId', 'ConsignacaoId', 'VendaId',
    'Chassi', 'MercadoLibreId', 'CombustivelId', 'CorId', 'OutraCor', 'CambioId',
    'CategoriaId', 'DirecaoId', 'Cilindrada', 'PartidaId', 'AlimentacaoId',
    'FreioId', 'MotorId', 'RefrigeracaoId',
    'MercadoLibreDataPublicacao', 'MercadoLibrePlano',
    'OlxToken', 'OlxId', 'OlxUrl', 'OlxDataPublicacao',
    'CompreCarId', 'CompreCarDataPublicacao', 'OlxErros', 'OlxStatus', 'OlxOperacao',
    'ICarrosId', 'ICarrosDataPublicacao', 'ICarrosPrioridade', 'MercadoLibreUrl',
    'AutolineId', 'AutolineDataPublicacao', 'AutolinePlano',
    'ZeroKm', 'CompreCarUrl', 'CompreCarWarnings',
    'CarroAmericanaIntegradorId', 'CarroAmericanaPublicar', 'CarroAmericanaDataPublicacao',
    'WebmotorsId', 'WebmotorsPlano', 'WebmotorsPublicar', 'WebmotorsDataPublicacao', 'WebmotorsUrl',
    'MeuCarroNovoId', 'MeuCarroNovoPublicar', 'MeuCarroNovoDataPublicacao', 'MeuCarroNovoUrl', 'MeuCarroNovoPlano',
    'AutosnaWebId', 'AutosnaWebPublicar', 'AutosnaWebDataPublicacao', 'AutosnaWebUrl',
    'MobiautoId', 'MobiautoPlano', 'MobiautoPublicar', 'MobiautoDataPublicacao', 'MobiautoUrl',
    'Renavam',
    'UsadosbrId', 'UsadosbrPlano', 'UsadosbrPublicar', 'UsadosbrDataPublicacao', 'UsadosbrUrl'
  ];

  const rows = data.map((mv, idx) => {
    const p = mv.almPayload;
    const v = mv.raw;
    const statusNum = v.status === 'disponivel' ? 0 : v.status === 'vendido' ? 2 : 1;

    const values: Array<string | number | null> = [
      idx + 1,
      p.Ano ?? null,
      p.AnoModelo ?? null,
      p.Km ?? 0,
      p.QtdPortas ?? null,
      p.Valor ?? 0,
      p.Descricao || '',
      p.TipoMotor || '',
      null,
      p.MarcaId ?? null,
      p.ModeloId ?? null,
      p.TipoVeiculo === 'Moto' ? 1 : 0,
      p.Placa || '',
      null, null, null,
      now,
      now,
      null,
      statusNum,
      null, null, null, null,
      p.Chassi || '',
      null,
      p.CombustivelId ?? null,
      p.CorId ?? null,
      null,
      p.CambioId ?? null,
      null, null, null, null, null,
      null, null, null,
      null, null,
      null, null, null, null,
      null, null, null, null, null,
      null, null, null, null,
      null, null, null,
      p.ZeroKm ? 1 : 0,
      null, null,
      null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null,
      null, null, null, null, null,
      (v as any).renavam || '',
      null, null, null, null, null,
    ];

    return { values };
  });

  return { columns, rows, now };
}

function escapeXml(value: unknown): string {
  const cleaned = sanitizeXmlText(String(value ?? ''));
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSQL(vehicles: MappedVehicle[], includeWarn: boolean, allStatuses = false) {
  const data = getExportData(vehicles, includeWarn, allStatuses);
  if (!data.length) return;

  const { columns, rows, now } = getCarroRows(data);

  const sqlEsc = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return "''";
    const s = sanitizeXmlText(String(val));
    return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  };

  const numOrNull = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return 'NULL';
    const n = Number(val);
    return Number.isNaN(n) ? 'NULL' : String(n);
  };

  const lines: string[] = [
    `-- Exportacao ALM - ${now}`,
    `-- Total: ${data.length} veiculos`,
    '',
    'USE `db_a77b4c_vsautos`;',
    'SET FOREIGN_KEY_CHECKS=0;',
    '',
  ];

  rows.forEach(({ values }) => {
    const sqlValues = values.map((value, index) => {
      const column = columns[index];
      const isNumeric = [
        'Id', 'Ano', 'AnoModelo', 'Km', 'QtdPortas', 'Valor', 'MarcaId', 'ModeloId', 'TipoVeiculo',
        'StatusVeiculo', 'CombustivelId', 'CorId', 'CambioId', 'ZeroKm'
      ].includes(column);

      return isNumeric ? numOrNull(value) : sqlEsc(value);
    });

    lines.push(`INSERT INTO \`carro\` (\`${columns.join('`, `')}\`) VALUES (${sqlValues.join(', ')});`);
  });

  const sqlContent = lines.join('\n');
  const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'estoque_alm_export.sql';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function generateXML(vehicles: MappedVehicle[], includeWarn: boolean, allStatuses = false) {
  const data = getExportData(vehicles, includeWarn, allStatuses);
  if (!data.length) return;

  const { columns, rows } = getCarroRows(data);

  const xml: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<pma_xml_export version="1.0" xmlns:pma="https://www.phpmyadmin.net/some_doc_url/">',
    '  <database name="db_a77b4c_vsautos">',
  ];

  rows.forEach(({ values }) => {
    xml.push('    <table name="carro">');
    columns.forEach((column, idx) => {
      const value = values[idx];
      xml.push(`      <column name="${column}">${escapeXml(value ?? '')}</column>`);
    });
    xml.push('    </table>');
  });

  xml.push('  </database>');
  xml.push('</pma_xml_export>');

  const blob = new Blob([xml.join('\n')], { type: 'application/xml;charset=utf-8' });
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
