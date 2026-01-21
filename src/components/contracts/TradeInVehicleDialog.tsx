import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Car, DollarSign, FileText, Loader2 } from 'lucide-react';
import { useCreateVehicle } from '@/hooks/useVehicles';
import { Contract } from '@/hooks/useContracts';
import { toast } from 'sonner';

interface TradeInVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
}

interface VehicleFormData {
  brand: string;
  model: string;
  year_fabrication: string;
  year_model: string;
  plate: string;
  color: string;
  renavam: string;
  chassis: string;
  fuel_type: string;
  transmission: string;
  km: string;
  doors: string;
  engine: string;
  purchase_price: string;
  sale_price: string;
  description: string;
}

export function TradeInVehicleDialog({ open, onOpenChange, contract }: TradeInVehicleDialogProps) {
  const createVehicle = useCreateVehicle();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<VehicleFormData>({
    brand: contract?.trade_in_brand || '',
    model: contract?.trade_in_model || '',
    year_fabrication: contract?.trade_in_year?.split('/')[0] || '',
    year_model: contract?.trade_in_year?.split('/')[1] || contract?.trade_in_year?.split('/')[0] || '',
    plate: contract?.trade_in_plate || '',
    color: contract?.trade_in_color || '',
    renavam: contract?.trade_in_renavam || '',
    chassis: '',
    fuel_type: 'flex',
    transmission: 'manual',
    km: '',
    doors: '4',
    engine: '',
    purchase_price: contract?.trade_in_value?.toString() || '',
    sale_price: '',
    description: '',
  });

  // Update form when contract changes
  useEffect(() => {
    if (contract && open) {
      setFormData({
        brand: contract.trade_in_brand || '',
        model: contract.trade_in_model || '',
        year_fabrication: contract.trade_in_year?.split('/')[0] || '',
        year_model: contract.trade_in_year?.split('/')[1] || contract.trade_in_year?.split('/')[0] || '',
        plate: contract.trade_in_plate || '',
        color: contract.trade_in_color || '',
        renavam: contract.trade_in_renavam || '',
        chassis: '',
        fuel_type: 'flex',
        transmission: 'manual',
        km: '',
        doors: '4',
        engine: '',
        purchase_price: contract.trade_in_value?.toString() || '',
        sale_price: '',
        description: `Veículo recebido como troca no contrato ${contract.contract_number}`,
      });
    }
  }, [contract, open]);

  const handleSubmit = async () => {
    if (!formData.brand || !formData.model) {
      toast.error('Preencha pelo menos marca e modelo');
      return;
    }

    setIsSubmitting(true);
    try {
      await createVehicle.mutateAsync({
        brand: formData.brand,
        model: formData.model,
        year_fabrication: parseInt(formData.year_fabrication) || new Date().getFullYear(),
        year_model: parseInt(formData.year_model) || parseInt(formData.year_fabrication) || new Date().getFullYear(),
        plate: formData.plate || undefined,
        color: formData.color || '',
        renavam: formData.renavam || undefined,
        chassis: formData.chassis || undefined,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        km: parseInt(formData.km) || 0,
        doors: parseInt(formData.doors) || 4,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        sale_price: parseFloat(formData.sale_price) || parseFloat(formData.purchase_price) * 1.15 || 0,
        notes: formData.description || undefined,
        status: 'disponivel',
      });

      toast.success('Veículo da troca cadastrado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating trade-in vehicle:', error);
      toast.error('Erro ao cadastrar veículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Cadastrar Veículo da Troca
          </DialogTitle>
          <DialogDescription>
            Complete as informações do veículo recebido como troca no contrato {contract?.contract_number}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Info from Contract */}
            {contract && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Dados do Contrato</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliente: {contract.customer_name} | Contrato: {contract.contract_number}
                </p>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" />
                Dados Básicos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value.toUpperCase() }))}
                    placeholder="FIAT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value.toUpperCase() }))}
                    placeholder="ARGO 1.0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Ano Fab.</Label>
                    <Input
                      value={formData.year_fabrication}
                      onChange={(e) => setFormData(prev => ({ ...prev, year_fabrication: e.target.value }))}
                      placeholder="2020"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Mod.</Label>
                    <Input
                      value={formData.year_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, year_model: e.target.value }))}
                      placeholder="2021"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input
                    value={formData.plate}
                    onChange={(e) => setFormData(prev => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                    placeholder="ABC1D23"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value.toUpperCase() }))}
                    placeholder="BRANCO"
                  />
                </div>
                <div className="space-y-2">
                  <Label>KM</Label>
                  <Input
                    type="number"
                    value={formData.km}
                    onChange={(e) => setFormData(prev => ({ ...prev, km: e.target.value }))}
                    placeholder="45000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>RENAVAM</Label>
                  <Input
                    value={formData.renavam}
                    onChange={(e) => setFormData(prev => ({ ...prev, renavam: e.target.value }))}
                    placeholder="00000000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chassi</Label>
                  <Input
                    value={formData.chassis}
                    onChange={(e) => setFormData(prev => ({ ...prev, chassis: e.target.value.toUpperCase() }))}
                    placeholder="9BWZZZ377VT004251"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motor</Label>
                  <Input
                    value={formData.engine}
                    onChange={(e) => setFormData(prev => ({ ...prev, engine: e.target.value }))}
                    placeholder="1.0 12V"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Combustível</Label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, fuel_type: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="flex">Flex</option>
                    <option value="gasolina">Gasolina</option>
                    <option value="etanol">Etanol</option>
                    <option value="diesel">Diesel</option>
                    <option value="eletrico">Elétrico</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Câmbio</Label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData(prev => ({ ...prev, transmission: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="manual">Manual</option>
                    <option value="automatico">Automático</option>
                    <option value="cvt">CVT</option>
                    <option value="automatizado">Automatizado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Portas</Label>
                  <select
                    value={formData.doors}
                    onChange={(e) => setFormData(prev => ({ ...prev, doors: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="2">2 portas</option>
                    <option value="4">4 portas</option>
                  </select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valores
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor de Compra (Troca) *</Label>
                  <Input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    placeholder="25000"
                  />
                  <p className="text-xs text-muted-foreground">Valor avaliado no contrato de troca</p>
                </div>
                <div className="space-y-2">
                  <Label>Valor de Venda</Label>
                  <Input
                    type="number"
                    value={formData.sale_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                    placeholder="30000"
                  />
                  <p className="text-xs text-muted-foreground">Deixe vazio para sugerir automaticamente</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes adicionais sobre o veículo, estado de conservação, opcionais..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cadastrando...
              </>
            ) : (
              'Cadastrar Veículo'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
