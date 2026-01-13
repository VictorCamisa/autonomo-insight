import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calculator, Percent } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CommissionSectionProps {
  salespersonId: string;
  onSalespersonChange: (id: string) => void;
  salePrice: number;
  purchasePrice: number;
  commissionRuleId: string | null;
  onCommissionRuleChange: (id: string | null) => void;
  manualAdjustment: number;
  onManualAdjustmentChange: (value: number) => void;
  calculatedCommission: number;
  onCalculatedCommissionChange: (value: number) => void;
  salespeople: Array<{ id: string; full_name: string | null }>;
}

export function CommissionSection({
  salespersonId,
  onSalespersonChange,
  salePrice,
  purchasePrice,
  commissionRuleId,
  onCommissionRuleChange,
  manualAdjustment,
  onManualAdjustmentChange,
  calculatedCommission,
  onCalculatedCommissionChange,
  salespeople,
}: CommissionSectionProps) {
  // Fetch commission rules
  const { data: commissionRules } = useQuery({
    queryKey: ['commission-rules-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate commission when rule or values change
  useEffect(() => {
    if (!commissionRuleId || !commissionRules) {
      onCalculatedCommissionChange(0);
      return;
    }

    const rule = commissionRules.find(r => r.id === commissionRuleId);
    if (!rule) {
      onCalculatedCommissionChange(0);
      return;
    }

    let commission = 0;
    const profit = salePrice - purchasePrice;

    switch (rule.commission_type) {
      case 'valor_fixo':
        commission = rule.fixed_value || 0;
        break;
      case 'escalonada':
      case 'mista':
        // Para tipos escalonada/mista, usa percentual sobre venda como padrão
        commission = salePrice * (rule.percentage_value || 0) / 100;
        break;
      case 'percentual_lucro':
        commission = profit * (rule.percentage_value || 0) / 100;
        break;
      default:
        commission = 0;
    }

    onCalculatedCommissionChange(Math.max(0, commission));
  }, [commissionRuleId, commissionRules, salePrice, purchasePrice, onCalculatedCommissionChange]);

  const finalCommission = calculatedCommission + manualAdjustment;
  const profit = salePrice - purchasePrice;
  const profitMargin = purchasePrice > 0 ? ((profit / purchasePrice) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const selectedRule = commissionRules?.find(r => r.id === commissionRuleId);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Comissão</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Vendedor Responsável</Label>
            <Select value={salespersonId} onValueChange={onSalespersonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {salespeople?.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.full_name || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Regra de Comissão</Label>
            <Select 
              value={commissionRuleId || 'auto'} 
              onValueChange={(value) => onCommissionRuleChange(value === 'auto' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a regra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (maior prioridade)</SelectItem>
                {commissionRules?.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name} ({rule.commission_type === 'valor_fixo' 
                      ? formatCurrency(rule.fixed_value || 0)
                      : `${rule.percentage_value}%`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calculation Preview */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lucro Bruto</Label>
            <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              {profitMargin.toFixed(1)}% de margem
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              Comissão Calculada
            </Label>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(calculatedCommission)}
            </div>
            {selectedRule && (
              <div className="text-xs text-muted-foreground">
                {selectedRule.name}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ajuste Manual</Label>
            <Input
              type="number"
              step="0.01"
              value={manualAdjustment || ''}
              onChange={(e) => onManualAdjustmentChange(parseFloat(e.target.value) || 0)}
              className="h-8"
              placeholder="± R$ 0,00"
            />
          </div>
        </div>

        {/* Final Commission */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
          <span className="font-medium">Comissão Final:</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">
              {formatCurrency(finalCommission)}
            </span>
            {manualAdjustment !== 0 && (
              <Badge variant="outline" className="text-xs">
                {manualAdjustment > 0 ? '+' : ''}{formatCurrency(manualAdjustment)}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
