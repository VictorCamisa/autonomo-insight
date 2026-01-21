import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useImportTransactions } from '@/hooks/useVehicleTransactions';

interface ImportTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function ImportTransactionsDialog({ open, onOpenChange }: ImportTransactionsDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const importMutation = useImportTransactions();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setRows(jsonData);

      // Faz preview com dry run
      const previewResult = await importMutation.mutateAsync({ rows: jsonData, dryRun: true });
      setPreview(previewResult);
      setStep('preview');
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
    }
  }, [importMutation]);

  const handleImport = useCallback(async () => {
    setStep('importing');
    try {
      const importResult = await importMutation.mutateAsync({ rows, dryRun: false });
      setResult(importResult);
      setStep('done');
    } catch (error) {
      console.error('Erro na importação:', error);
      setStep('preview');
    }
  }, [rows, importMutation]);

  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setPreview(null);
    setResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Histórico de Transações
          </DialogTitle>
          <DialogDescription>
            Importe dados de compra e venda de veículos a partir de uma planilha Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && (
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Clique para selecionar a planilha</p>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: .xlsx, .xls
                </p>
              </label>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Linhas no arquivo</p>
                  <p className="text-2xl font-bold">{preview.totalRows}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Transações válidas</p>
                  <p className="text-2xl font-bold text-emerald-600">{preview.validTransactions}</p>
                </div>
              </div>

              {preview.errors && preview.errors.length > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">{preview.errors.length} avisos</span>
                  </div>
                  <ScrollArea className="h-20">
                    <ul className="text-sm space-y-1">
                      {preview.errors.slice(0, 5).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {preview.preview && preview.preview.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Prévia dos primeiros registros:</p>
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {preview.preview.map((item: any, i: number) => (
                        <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.vehicle_number && (
                              <Badge variant="outline">#{item.vehicle_number}</Badge>
                            )}
                            <span className="font-medium">
                              {[item.brand, item.model].filter(Boolean).join(' ') || 'Veículo sem nome'}
                            </span>
                            {item.plate && (
                              <Badge variant="secondary" className="text-xs">{item.plate}</Badge>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground space-x-2">
                            {item.seller_name && (
                              <span>De: <strong>{item.seller_name}</strong></span>
                            )}
                            {item.purchase_date && (
                              <span>({item.purchase_date})</span>
                            )}
                            {item.buyer_name && (
                              <span>• Para: <strong>{item.buyer_name}</strong></span>
                            )}
                            {item.sale_date && (
                              <span>({item.sale_date})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Importando transações...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
              <Progress value={50} className="mt-4 w-64 mx-auto" />
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-8">
              <div className="h-16 w-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xl font-bold text-primary mb-2">
                Importação concluída!
              </p>
              <p className="text-muted-foreground">
                {result.inserted} transações importadas com sucesso
              </p>
              {result.errors && result.errors.length > 0 && (
                <p className="text-sm text-warning mt-2">
                  {result.errors.length} linhas com problemas foram ignoradas
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!preview?.validTransactions}
              >
                Importar {preview?.validTransactions} transações
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
