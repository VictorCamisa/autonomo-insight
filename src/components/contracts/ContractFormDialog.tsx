import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContracts, ContractFormData } from '@/hooks/useContracts';
import { useCustomers } from '@/hooks/useCustomers';
import { useVehicles } from '@/hooks/useVehicles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, User, Car, CreditCard, RefreshCw, HandCoins } from 'lucide-react';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<ContractFormData>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function ContractFormDialog({ open, onOpenChange, initialData }: ContractFormDialogProps) {
  const { createContract } = useContracts();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();

  const [formData, setFormData] = useState<ContractFormData>({
    contract_type: 'venda',
    customer_name: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_value: 0,
  });

  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [hasInstallments, setHasInstallments] = useState(false);

  // Carrega dados iniciais quando o dialog abre
  useEffect(() => {
    if (open && initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));
      // Verifica se tem dados de troca ou parcelamento
      if (initialData.trade_in_brand || initialData.trade_in_value) {
        setHasTradeIn(true);
      }
      if (initialData.installments_count && initialData.installments_count > 0) {
        setHasInstallments(true);
      }
    }
  }, [open, initialData]);

  const availableVehicles = vehicles.filter(v => v.status === 'disponivel' || v.id === initialData?.vehicle_id);

  // Gera o texto de negociação automaticamente baseado nos dados de pagamento
  const generateNegotiationText = useCallback(() => {
    const lines: string[] = [];
    const vehicleValue = formData.vehicle_value || 0;
    
    lines.push(`Vendido pelo valor total de ${formatCurrency(vehicleValue)}`);
    lines.push('');
    lines.push('Forma de pagamento:');

    // Entrada
    if (formData.down_payment && formData.down_payment > 0) {
      lines.push(`• Entrada: ${formatCurrency(formData.down_payment)}`);
    }

    // Veículo de troca
    if (hasTradeIn && formData.trade_in_brand) {
      const tradeInDesc = `${formData.trade_in_brand} ${formData.trade_in_model || ''} ${formData.trade_in_year || ''}`.trim();
      lines.push(`• Veículo como entrada: ${tradeInDesc} - ${formatCurrency(formData.trade_in_value || 0)}`);
    }

    // Financiamento/Parcelamento
    if (hasInstallments && formData.installments_count && formData.installments_count > 0) {
      lines.push(`• Parcelamento: ${formData.installments_count}x de ${formatCurrency(formData.installment_value || 0)} (dia ${formData.installment_due_day || '___'})`);
    }

    // Calcular restante
    const totalPaid = (formData.down_payment || 0) + (formData.trade_in_value || 0);
    const installmentsTotal = (formData.installments_count || 0) * (formData.installment_value || 0);
    const remaining = vehicleValue - totalPaid - installmentsTotal;
    
    if (remaining > 0 && !hasInstallments) {
      lines.push(`• Restante: ${formatCurrency(remaining)} (financiamento/à vista)`);
    }

    return lines.join('\n');
  }, [formData.vehicle_value, formData.down_payment, formData.trade_in_brand, formData.trade_in_model, formData.trade_in_year, formData.trade_in_value, formData.installments_count, formData.installment_value, formData.installment_due_day, hasTradeIn, hasInstallments]);

  // Atualiza o texto de negociação quando os valores mudam
  const handleRefreshNegotiation = () => {
    const newText = generateNegotiationText();
    setFormData(prev => ({ ...prev, negotiation_details: newText }));
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        customer_name: customer.name,
        customer_cpf: customer.cpf_cnpj || '',
        customer_rg: customer.rg || '',
        customer_phone: customer.phone || '',
        customer_email: customer.email || '',
        customer_address: customer.address || '',
        customer_city: customer.city || '',
        customer_state: customer.state || '',
      }));
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId,
        vehicle_brand: vehicle.brand,
        vehicle_model: vehicle.model,
        vehicle_year: `${vehicle.year_fabrication}/${vehicle.year_model}`,
        vehicle_plate: vehicle.plate || '',
        vehicle_color: vehicle.color || '',
        vehicle_renavam: vehicle.renavam || '',
        vehicle_odometer: vehicle.km || 0,
        vehicle_value: vehicle.sale_price || 0,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.vehicle_brand) {
      return;
    }

    // Combina notes com negotiation_details
    const finalNotes = formData.contract_type === 'venda' 
      ? `NEGOCIAÇÃO:\n${formData.negotiation_details || generateNegotiationText()}\n\n${formData.notes || ''}`.trim()
      : formData.notes;

    await createContract.mutateAsync({
      ...formData,
      notes: finalNotes,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      contract_type: 'venda',
      customer_name: '',
      vehicle_brand: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_value: 0,
    });
    setHasTradeIn(false);
    setHasInstallments(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Novo Contrato
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Contract Type */}
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value: 'venda' | 'compra') => 
                  setFormData(prev => ({ ...prev, contract_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Contrato de Venda (Loja vende para cliente)</SelectItem>
                  <SelectItem value="compra">Contrato de Compra (Loja compra do cliente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Customer Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do {formData.contract_type === 'venda' ? 'Comprador' : 'Vendedor'}
              </h3>

              <div className="space-y-2">
                <Label>Selecionar Cliente Existente</Label>
                <Select onValueChange={handleCustomerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente ou preencha manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.cpf_cnpj ? `- ${customer.cpf_cnpj}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidade</Label>
                  <Input
                    value={formData.customer_nationality || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_nationality: e.target.value }))}
                    placeholder="Brasileiro(a)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <Input
                    value={formData.customer_profession || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_profession: e.target.value }))}
                    placeholder="Profissão"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado Civil</Label>
                  <Select
                    value={formData.customer_marital_status || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, customer_marital_status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    value={formData.customer_cpf || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input
                    value={formData.customer_rg || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_rg: e.target.value }))}
                    placeholder="00.000.000-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.customer_birth_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_birth_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.customer_phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.customer_email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.customer_address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.customer_city || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_city: e.target.value }))}
                    placeholder="Cidade"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={formData.customer_state || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_state: e.target.value }))}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={formData.customer_zip || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_zip: e.target.value }))}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Vehicle Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" />
                Dados do Veículo
              </h3>

              {formData.contract_type === 'venda' && (
                <div className="space-y-2">
                  <Label>Selecionar Veículo do Estoque</Label>
                  <Select onValueChange={handleVehicleSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um veículo ou preencha manualmente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.brand} {vehicle.model} {vehicle.year_fabrication}/{vehicle.year_model} - {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    value={formData.vehicle_brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_brand: e.target.value }))}
                    placeholder="Toyota"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                    placeholder="Corolla"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input
                    value={formData.vehicle_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_year: e.target.value }))}
                    placeholder="2023/2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input
                    value={formData.vehicle_plate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate: e.target.value }))}
                    placeholder="ABC-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={formData.vehicle_color || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_color: e.target.value }))}
                    placeholder="Prata"
                  />
                </div>
                <div className="space-y-2">
                  <Label>RENAVAM</Label>
                  <Input
                    value={formData.vehicle_renavam || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_renavam: e.target.value }))}
                    placeholder="00000000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hodômetro (KM)</Label>
                  <Input
                    type="number"
                    value={formData.vehicle_odometer || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_odometer: parseInt(e.target.value) || 0 }))}
                    placeholder="45000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor do Veículo *</Label>
                  <Input
                    type="number"
                    value={formData.vehicle_value || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_value: parseFloat(e.target.value) || 0 }))}
                    placeholder="125000"
                  />
                </div>
              </div>
            </div>

            {/* Payment Section - Only for Sales */}
            {formData.contract_type === 'venda' && (
              <>
                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Forma de Pagamento
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor da Entrada (R$)</Label>
                      <Input
                        type="number"
                        value={formData.down_payment || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, down_payment: parseFloat(e.target.value) || 0 }))}
                        placeholder="20000"
                      />
                    </div>
                  </div>

                  {/* Trade-in */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasTradeIn"
                        checked={hasTradeIn}
                        onChange={(e) => setHasTradeIn(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="hasTradeIn">Veículo de Troca</Label>
                    </div>

                    {hasTradeIn && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-muted">
                        <div className="space-y-2">
                          <Label>Marca</Label>
                          <Input
                            value={formData.trade_in_brand || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_brand: e.target.value }))}
                            placeholder="Honda"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <Input
                            value={formData.trade_in_model || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_model: e.target.value }))}
                            placeholder="Civic"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ano</Label>
                          <Input
                            value={formData.trade_in_year || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_year: e.target.value }))}
                            placeholder="2020"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Placa</Label>
                          <Input
                            value={formData.trade_in_plate || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_plate: e.target.value }))}
                            placeholder="XYZ-5678"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cor</Label>
                          <Input
                            value={formData.trade_in_color || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_color: e.target.value }))}
                            placeholder="Preto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>RENAVAM</Label>
                          <Input
                            value={formData.trade_in_renavam || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_renavam: e.target.value }))}
                            placeholder="00000000000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor da Troca (R$)</Label>
                          <Input
                            type="number"
                            value={formData.trade_in_value || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, trade_in_value: parseFloat(e.target.value) || 0 }))}
                            placeholder="50000"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Installments */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasInstallments"
                        checked={hasInstallments}
                        onChange={(e) => setHasInstallments(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="hasInstallments">Parcelamento (Notas Promissórias)</Label>
                    </div>

                    {hasInstallments && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-muted">
                        <div className="space-y-2">
                          <Label>Quantidade de Parcelas</Label>
                          <Input
                            type="number"
                            value={formData.installments_count || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, installments_count: parseInt(e.target.value) || 0 }))}
                            placeholder="12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor de Cada Parcela (R$)</Label>
                          <Input
                            type="number"
                            value={formData.installment_value || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, installment_value: parseFloat(e.target.value) || 0 }))}
                            placeholder="3000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dia do Vencimento</Label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={formData.installment_due_day || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, installment_due_day: parseInt(e.target.value) || 0 }))}
                            placeholder="10"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Negotiation Details - Only for Sales */}
            {formData.contract_type === 'venda' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <HandCoins className="h-4 w-4" />
                      Negociação (aparece no contrato)
                    </h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefreshNegotiation}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Gerar Automaticamente
                    </Button>
                  </div>
                  <Textarea
                    value={formData.negotiation_details || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, negotiation_details: e.target.value }))}
                    placeholder="Clique em 'Gerar Automaticamente' para preencher baseado nos dados acima, ou escreva manualmente..."
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este texto será incluído na seção de negociação do contrato. Você pode editar livremente.
                  </p>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações Internas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais (uso interno)..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createContract.isPending}>
            {createContract.isPending ? 'Criando...' : 'Criar Contrato'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
