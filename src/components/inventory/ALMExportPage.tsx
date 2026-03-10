import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileJson, FileText, Eye, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useVehicles } from '@/hooks/useVehicles';
import { ALM_MARCAS, ALM_CORES, BRAND_MAP, COLOR_MAP } from '@/lib/almExportData';
import {
  mapVehicle, generateJSON, generateSQL, exportCSV, getPreviewData,
  normStr, matchBrand, setModelos, getModelos,
  type MappedVehicle, type MatchLevel,
} from '@/lib/almExportUtils';

import type { ALMModelo } from '@/lib/almExportData';
import { getALMModelos } from '@/lib/almExportUtils';

export default function ALMExportPage() {
  const navigate = useNavigate();
  const { data: vehicles, isLoading } = useVehicles();
  const [statusFilter, setStatusFilter] = useState('all');
  const [matchFilter, setMatchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [includeWarn, setIncludeWarn] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Record<string, string | number>>>({});
  const [brandMapExtra, setBrandMapExtra] = useState<Record<string, string>>({});
  const [colorMapExtra, setColorMapExtra] = useState<Record<string, number>>({});
  const [loadedModelos, setLoadedModelos] = useState<ALMModelo[]>([]);

  useEffect(() => {
    getALMModelos().then(m => {
      setModelos(m);
      setLoadedModelos(m);
    });
  }, []);

  // Apply extra mappings
  useEffect(() => {
    Object.entries(brandMapExtra).forEach(([k, v]) => { BRAND_MAP[k] = v; });
    Object.entries(colorMapExtra).forEach(([k, v]) => { COLOR_MAP[k] = v; });
  }, [brandMapExtra, colorMapExtra]);

  const mappedVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.map(v => mapVehicle(v, overrides));
  }, [vehicles, overrides, brandMapExtra, colorMapExtra]);

  const filtered = useMemo(() => {
    return mappedVehicles.filter(mv => {
      if (statusFilter !== 'all' && mv.raw.status !== statusFilter) return false;
      if (matchFilter !== 'all' && mv.matchLevel !== matchFilter) return false;
      if (search) {
        const haystack = normStr(`${mv.raw.brand} ${mv.raw.model} ${mv.raw.plate} ${mv.raw.version}`);
        if (!haystack.includes(normStr(search))) return false;
      }
      return true;
    });
  }, [mappedVehicles, statusFilter, matchFilter, search]);

  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, err: 0 };
    mappedVehicles.forEach(mv => c[mv.matchLevel]++);
    return c;
  }, [mappedVehicles]);

  const readyCount = mappedVehicles.filter(mv => mv.matchLevel === 'ok' && mv.raw.status === 'disponivel').length;
  const warnCount = mappedVehicles.filter(mv => mv.matchLevel === 'warn' && mv.raw.status === 'disponivel').length;

  const unmappedBrands = useMemo(() => {
    if (!vehicles) return [];
    return [...new Set(vehicles.map(v => v.brand).filter(b => !matchBrand(b)))];
  }, [vehicles, brandMapExtra]);

  const unmappedColors = useMemo(() => {
    if (!vehicles) return [];
    return [...new Set(vehicles.map(v => v.color).filter(c => c && !ALM_CORES.find(ac => normStr(ac.nome) === normStr(c)) && !COLOR_MAP[normStr(c)]))];
  }, [vehicles, colorMapExtra]);

  const handleSetModelOverride = (vehicleId: string, modelId: number) => {
    setOverrides(prev => ({
      ...prev,
      [vehicleId]: { ...(prev[vehicleId] || {}), modelId },
    }));
  };

  const previewData = useMemo(() => getPreviewData(mappedVehicles, includeWarn), [mappedVehicles, includeWarn]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><span className="text-muted-foreground">Carregando veículos...</span></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/estoque')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">🚗 Exportador de Estoque → Sistema ALM</h1>
          <p className="text-sm text-muted-foreground">Mapeamento automático para o formato da API vendas.almprocessamentos.com.br</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1">{vehicles?.length || 0} veículos</Badge>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="disponivel">Somente disponíveis</SelectItem>
            <SelectItem value="vendido">Somente vendidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={matchFilter} onValueChange={setMatchFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os matches</SelectItem>
            <SelectItem value="ok">✅ Mapeados</SelectItem>
            <SelectItem value="warn">⚠️ Atenção</SelectItem>
            <SelectItem value="err">❌ Problema</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="🔍 Buscar marca, modelo, placa..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-[280px]" />
        <div className="flex gap-4 ml-auto text-sm">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />{counts.ok} prontos</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />{counts.warn} atenção</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{counts.err} problema</span>
        </div>
      </div>

      {/* Mapping Panel */}
      {(unmappedBrands.length > 0 || unmappedColors.length > 0) && (
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-sm font-bold text-primary mb-4 border-b pb-2">⚙️ Mapeamento Global — Ajuste campos não reconhecidos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unmappedBrands.map(brand => (
              <div key={brand} className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <span className="text-xs font-semibold text-muted-foreground min-w-[50px]">Marca</span>
                <span className="font-bold text-sm">{brand}</span>
                <span className="text-muted-foreground">→</span>
                <select className="flex-1 border rounded px-2 py-1 text-xs bg-background" onChange={e => {
                  if (e.target.value) setBrandMapExtra(prev => ({ ...prev, [normStr(brand)]: e.target.value }));
                }}>
                  <option value="">-- selecionar ALM --</option>
                  {ALM_MARCAS.slice(0, 50).map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                </select>
              </div>
            ))}
            {unmappedColors.map(color => (
              <div key={color} className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <span className="text-xs font-semibold text-muted-foreground min-w-[50px]">Cor</span>
                <span className="font-bold text-sm">{color}</span>
                <span className="text-muted-foreground">→</span>
                <select className="flex-1 border rounded px-2 py-1 text-xs bg-background" onChange={e => {
                  if (e.target.value) setColorMapExtra(prev => ({ ...prev, [normStr(color)]: parseInt(e.target.value) }));
                }}>
                  <option value="">-- selecionar --</option>
                  {ALM_CORES.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary text-primary-foreground">
                <TableHead className="text-primary-foreground">#</TableHead>
                <TableHead className="text-primary-foreground">Foto</TableHead>
                <TableHead className="text-primary-foreground">Tipo</TableHead>
                <TableHead className="text-primary-foreground">Marca (sistema → ALM)</TableHead>
                <TableHead className="text-primary-foreground">Modelo (sistema → ALM)</TableHead>
                <TableHead className="text-primary-foreground">Versão</TableHead>
                <TableHead className="text-primary-foreground">Placa</TableHead>
                <TableHead className="text-primary-foreground">Ano/Mod</TableHead>
                <TableHead className="text-primary-foreground">KM</TableHead>
                <TableHead className="text-primary-foreground">Cor → ALM</TableHead>
                <TableHead className="text-primary-foreground">Comb.</TableHead>
                <TableHead className="text-primary-foreground">Câmbio</TableHead>
                <TableHead className="text-primary-foreground">Preço</TableHead>
                <TableHead className="text-primary-foreground">Status</TableHead>
                <TableHead className="text-primary-foreground">Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((mv, idx) => {
                const v = mv.raw;
                const modelsForBrand = mv.brandMatch ? loadedModelos.filter(m => m.marcaId === mv.brandMatch!.id) : [];
                return (
                  <TableRow key={v.id} className={mv.matchLevel === 'err' ? 'bg-red-50 dark:bg-red-950/20' : mv.matchLevel === 'warn' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                    <TableCell className="font-bold text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      {v.images?.[0] ? (
                        <img src={v.images[0]} alt="" className="w-10 h-7 object-cover rounded" />
                      ) : <span className="text-muted-foreground text-lg">📷</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={mv.tipoVeiculo === 'Carro' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-purple-300 text-purple-700 bg-purple-50'}>
                        {mv.tipoVeiculo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {mv.brandMatch ? (
                        <><span>{v.brand}</span> → <span className="font-bold text-green-700">{mv.brandMatch.nome} [{mv.brandMatch.id}]</span></>
                      ) : <span className="text-red-600 font-bold">{v.brand} ❌</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {mv.modelMatch ? (
                        <><span>{v.model}</span> → <span className="font-bold text-green-700">{mv.modelMatch.nome} [{mv.modelMatch.id}]</span></>
                      ) : mv.brandMatch ? (
                        <div className="space-y-1">
                          <span className="text-yellow-700">{v.model} ⚠️</span>
                          {modelsForBrand.length > 0 && (
                            <select className="block w-full border rounded px-1 py-0.5 text-xs bg-background" onChange={e => {
                              if (e.target.value) handleSetModelOverride(v.id, parseInt(e.target.value));
                            }}>
                              <option value="">-- selecione --</option>
                              {modelsForBrand.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                            </select>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">{v.model}</span>}
                    </TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate" title={v.version || ''}>{v.version || '—'}</TableCell>
                    <TableCell className="font-bold text-xs">{v.plate || '—'}</TableCell>
                    <TableCell className="text-xs">{v.year_fabrication}/{v.year_model}</TableCell>
                    <TableCell className="text-xs">{(v.km || 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-xs">
                      {mv.colorMatch ? <span className="font-bold text-green-700">{mv.colorMatch.nome} [{mv.colorMatch.id}]</span> : <span className="text-yellow-700">{v.color || '—'} ⚠️</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {mv.fuelMatch ? <span className="font-bold text-green-700">{mv.fuelMatch.nome} [{mv.fuelMatch.id}]</span> : <span className="text-yellow-700">{v.fuel_type || '—'} ⚠️</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {mv.cambioMatch ? <span className="font-bold text-green-700">{mv.cambioMatch.nome} [{mv.cambioMatch.id}]</span> : <span className="text-yellow-700">{v.transmission || '—'} ⚠️</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {v.sale_price ? `R$ ${v.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.status === 'disponivel' ? 'default' : 'secondary'} className={v.status === 'disponivel' ? 'bg-green-600 text-xs' : 'text-xs'}>
                        {v.status === 'disponivel' ? 'disponível' : v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mv.matchLevel === 'ok' ? (
                        <Badge className="bg-green-600 text-xs"><CheckCircle className="h-3 w-3 mr-1" />pronto</Badge>
                      ) : mv.matchLevel === 'warn' ? (
                        <Badge className="bg-yellow-500 text-xs" title={mv.issues.join('; ')}><AlertTriangle className="h-3 w-3 mr-1" />atenção</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs" title={mv.issues.join('; ')}><XCircle className="h-3 w-3 mr-1" />erro</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Export Bar */}
      <div className="bg-card border rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-bold text-green-600">{readyCount}</span> prontos ✅ | <span className="font-bold text-yellow-600">{warnCount}</span> com atenção ⚠️
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox checked={includeWarn} onCheckedChange={v => setIncludeWarn(!!v)} />
          Incluir veículos ⚠️ no export
        </label>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button onClick={() => generateJSON(mappedVehicles, includeWarn)} className="bg-green-700 hover:bg-green-800">
            <Download className="h-4 w-4 mr-2" />Gerar JSON
          </Button>
          <Button onClick={() => generateSQL(mappedVehicles, includeWarn)} className="bg-orange-600 hover:bg-orange-700">
            <FileText className="h-4 w-4 mr-2" />Gerar SQL
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />Pré-visualizar
          </Button>
          <Button variant="outline" onClick={() => exportCSV(mappedVehicles)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />Gerar CSV
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview JSON — {previewData.length} veículos prontos</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
            {JSON.stringify(previewData.slice(0, 3), null, 2)}
            {previewData.length > 3 && `\n\n... e mais ${previewData.length - 3} veículos`}
          </pre>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => { generateJSON(mappedVehicles, includeWarn); setPreviewOpen(false); }}>
              <Download className="h-4 w-4 mr-2" />Download JSON
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
