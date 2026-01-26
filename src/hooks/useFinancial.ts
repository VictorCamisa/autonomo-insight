import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSaleProfitReports, useSales } from './useSales';
import { useSaleCommissions } from './useCommissionsComplete';
import { useAllVehicleDRE, useVehicles } from './useVehicles';
import { useNegotiations } from './useNegotiations';
import { useLeads } from './useLeads';
import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, format, differenceInDays, addMonths, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tables } from '@/integrations/supabase/types';

export interface DRECategoryDetail {
  category: string;
  subcategory?: string;
  amount: number;
}

export interface DREData {
  period: string;
  receitaBruta: number;
  custoAquisicao: number;
  custosVeiculo: number;
  custosVenda: number;
  comissoes: number;
  cac: number;
  despesasComerciais: number;
  despesasAdministrativas: number;
  despesasOperacionais: number;
  outrasDespesas: number;
  lucroBruto: number;
  lucroOperacional: number;
  lucroLiquido: number;
  margemBruta: number;
  margemLiquida: number;
  qtdVendas: number;
  // Detalhes por categoria
  custosVeiculoDetails: DRECategoryDetail[];
  custosVendaDetails: DRECategoryDetail[];
  despesasComerciaisDetails: DRECategoryDetail[];
  despesasAdministrativasDetails: DRECategoryDetail[];
  despesasOperacionaisDetails: DRECategoryDetail[];
  outrasDespesasDetails: DRECategoryDetail[];
}

export interface CashFlowItem {
  id: string;
  date: string;
  description: string;
  type: 'entrada' | 'saida';
  category: string;
  value: number;
  status: 'realizado' | 'previsto';
}

export interface CashFlowFilters {
  startDate: Date;
  endDate: Date;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export interface ProfitabilityData {
  id: string;
  name: string;
  type: 'veiculo' | 'vendedor' | 'origem' | 'categoria';
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  count: number;
}

export interface FinancialAlert {
  id: string;
  type: 'margem_baixa' | 'estoque_parado' | 'comissao_pendente' | 'meta_risco';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  value?: number;
  entityId?: string;
  entityType?: string;
  createdAt: Date;
}

// Hook para buscar transações financeiras
function useFinancialTransactionsData() {
  return useQuery({
    queryKey: ['financial-transactions-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Hook para buscar custos de veículos
function useAllVehicleCosts() {
  return useQuery({
    queryKey: ['vehicle-costs-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_costs')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFinancialDashboard() {
  const { data: profitReports, isLoading: loadingReports } = useSaleProfitReports();
  const { data: sales, isLoading: loadingSales } = useSales();
  const { data: commissions, isLoading: loadingCommissions } = useSaleCommissions();
  const { data: vehicleDRE, isLoading: loadingVehicles } = useAllVehicleDRE();
  const { data: negotiations, isLoading: loadingNegotiations } = useNegotiations();
  const { data: transactions } = useFinancialTransactionsData();

  const isLoading = loadingReports || loadingSales || loadingCommissions || loadingVehicles || loadingNegotiations;

  const kpis = useMemo(() => {
    // Usar dados de transações financeiras quando disponível
    const completedSales = sales?.filter(s => s.status === 'concluida') || [];
    const pendingSales = sales?.filter(s => s.status === 'pendente') || [];
    
    // Calcular de transações financeiras se disponível
    const receitas = transactions?.filter((t: any) => t.type === 'receita' && t.status === 'pago') || [];
    const despesas = transactions?.filter((t: any) => t.type === 'despesa' && t.status === 'pago') || [];
    
    const totalRevenue = receitas.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const totalExpenses = despesas.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const totalNetProfit = totalRevenue - totalExpenses;
    const avgMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    
    const pendingCommissions = commissions?.filter(c => !c.paid).reduce((sum, c) => sum + c.final_amount, 0) || 0;
    const approvedCommissions = commissions?.filter(c => (c as any).status === 'approved' && !c.paid).reduce((sum, c) => sum + c.final_amount, 0) || 0;
    
    const vehiclesInStock = vehicleDRE?.filter(v => v.status === 'disponivel') || [];
    const totalStockValue = vehiclesInStock.reduce((sum, v) => sum + (v.total_investment || 0), 0);
    const avgDaysInStock = vehiclesInStock.length > 0 
      ? vehiclesInStock.reduce((sum, v) => sum + (v.days_in_stock || 0), 0) / vehiclesInStock.length 
      : 0;

    // Pipeline projection
    const activeNegotiations = negotiations?.filter(n => 
      n.status === 'atendimento_ia' || n.status === 'negociando' || n.status === 'follow_up'
    ) || [];
    const pipelineValue = activeNegotiations.reduce((sum, n) => sum + (n.estimated_value || 0), 0);
    const weightedPipeline = activeNegotiations.reduce((sum, n) => 
      sum + ((n.estimated_value || 0) * (n.probability || 50) / 100), 0
    );

    // Current month metrics
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const thisMonthSales = completedSales.filter(s => {
      const saleDate = new Date(s.sale_date);
      return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
    });
    
    const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
    const thisMonthProfit = receitas
      .filter((t: any) => isWithinInterval(new Date(t.transaction_date), { start: monthStart, end: monthEnd }))
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0) -
      despesas
      .filter((t: any) => isWithinInterval(new Date(t.transaction_date), { start: monthStart, end: monthEnd }))
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    return {
      totalRevenue,
      totalGrossProfit: totalRevenue - totalExpenses,
      totalNetProfit,
      avgMargin,
      pendingCommissions,
      approvedCommissions,
      totalStockValue,
      avgDaysInStock,
      vehiclesInStock: vehiclesInStock.length,
      completedSalesCount: completedSales.length,
      pendingSalesCount: pendingSales.length,
      pipelineValue,
      weightedPipeline,
      thisMonthRevenue,
      thisMonthProfit,
      thisMonthSalesCount: thisMonthSales.length,
    };
  }, [sales, commissions, vehicleDRE, negotiations, transactions]);

  return { kpis, isLoading, profitReports, commissions, vehicleDRE, negotiations };
}

export function useDREData(months: number = 6) {
  const { data: profitReports, isLoading: loadingReports } = useSaleProfitReports();
  const { data: transactions, isLoading: loadingTransactions } = useFinancialTransactionsData();
  const { data: vehicleCosts } = useAllVehicleCosts();

  const isLoading = loadingReports || loadingTransactions;

  const dreData = useMemo(() => {
    if (!profitReports) return [];

    const data: DREData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthSales = profitReports.filter(s => {
        if (s.status !== 'concluida') return false;
        const saleDate = new Date(s.sale_date);
        return isWithinInterval(saleDate, { start, end });
      });

      // Receitas e custos diretos das vendas
      const receitaBruta = monthSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
      const custoAquisicao = monthSales.reduce((sum, s) => sum + (s.vehicle_purchase_price || 0), 0);
      const custosVeiculo = monthSales.reduce((sum, s) => sum + (s.vehicle_total_costs || 0), 0);
      const custosVenda = monthSales.reduce((sum, s) => sum + (s.total_sale_costs || 0), 0);
      const comissoes = monthSales.reduce((sum, s) => sum + (s.total_commissions || 0), 0);
      const cac = monthSales.reduce((sum, s) => sum + (s.lead_cac || 0), 0);
      const lucroBruto = monthSales.reduce((sum, s) => sum + (s.gross_profit || 0), 0);

      // Detalhar custos de veículo por categoria (usando cost_type)
      const vehicleIds = monthSales.map(s => s.vehicle_id).filter(Boolean);
      const monthVehicleCosts = vehicleCosts?.filter((c: any) => vehicleIds.includes(c.vehicle_id)) || [];
      const custosVeiculoDetails: DRECategoryDetail[] = [];
      const vehicleCostsByCategory: Record<string, number> = {};
      
      // Mapeamento de cost_type para nome legível
      const costTypeLabels: Record<string, string> = {
        'documentacao': 'Documentação',
        'transferencia': 'Transferência',
        'ipva': 'IPVA',
        'manutencao': 'Manutenção',
        'limpeza': 'Limpeza',
        'frete': 'Frete',
        'comissao_compra': 'Comissão de Compra',
        'outros': 'Outros',
      };
      
      monthVehicleCosts.forEach((c: any) => {
        const costType = c.cost_type || 'outros';
        const cat = costTypeLabels[costType] || costType;
        vehicleCostsByCategory[cat] = (vehicleCostsByCategory[cat] || 0) + (Number(c.amount) || 0);
      });
      Object.entries(vehicleCostsByCategory).forEach(([category, amount]) => {
        custosVeiculoDetails.push({ category, amount });
      });

      // Detalhar custos de venda
      const custosVendaDetails: DRECategoryDetail[] = [];
      let docTotal = 0, transTotal = 0, outrosVenda = 0;
      monthSales.forEach(s => {
        docTotal += (s as any).documentation_cost || 0;
        transTotal += (s as any).transfer_cost || 0;
        outrosVenda += (s as any).other_sale_costs || 0;
      });
      if (docTotal > 0) custosVendaDetails.push({ category: 'Documentação', amount: docTotal });
      if (transTotal > 0) custosVendaDetails.push({ category: 'Transferência', amount: transTotal });
      if (outrosVenda > 0) custosVendaDetails.push({ category: 'Outros Custos Venda', amount: outrosVenda });

      // Despesas operacionais do período (de financial_transactions)
      const monthTransactions = transactions?.filter((t: any) => {
        const tDate = new Date(t.transaction_date);
        return t.type === 'despesa' && isWithinInterval(tDate, { start, end });
      }) || [];

      // Categorizar despesas com detalhes
      const categorizeExpense = (category: string) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('marketing') || cat.includes('publicidade') || cat.includes('propaganda')) {
          return 'comercial';
        }
        if (cat.includes('aluguel') || cat.includes('salario') || cat.includes('salário') || 
            cat.includes('contabil') || cat.includes('contador') || cat.includes('encargo') ||
            cat.includes('administrativ')) {
          return 'administrativo';
        }
        if (cat.includes('energia') || cat.includes('água') || cat.includes('internet') ||
            cat.includes('telefon') || cat.includes('material') || cat.includes('operacion')) {
          return 'operacional';
        }
        if (cat.includes('imposto') || cat.includes('taxa') || cat.includes('seguro') ||
            cat.includes('bancaria') || cat.includes('bancária') || cat.includes('juros')) {
          return 'outras';
        }
        // Ignorar custos de veículos e comissões já contabilizados
        if (cat.includes('aquisi') || cat.includes('veículo') || cat.includes('veiculo') ||
            cat.includes('comiss') || cat.includes('venda')) {
          return 'ignore';
        }
        return 'outras';
      };

      let despesasComerciais = 0;
      let despesasAdministrativas = 0;
      let despesasOperacionais = 0;
      let outrasDespesas = 0;

      const comerciaisMap: Record<string, number> = {};
      const administrativasMap: Record<string, number> = {};
      const operacionaisMap: Record<string, number> = {};
      const outrasMap: Record<string, number> = {};

      monthTransactions.forEach((t: any) => {
        const tipo = categorizeExpense(t.category);
        const amount = Number(t.amount) || 0;
        const cat = t.category || 'Outros';
        switch (tipo) {
          case 'comercial':
            despesasComerciais += amount;
            comerciaisMap[cat] = (comerciaisMap[cat] || 0) + amount;
            break;
          case 'administrativo':
            despesasAdministrativas += amount;
            administrativasMap[cat] = (administrativasMap[cat] || 0) + amount;
            break;
          case 'operacional':
            despesasOperacionais += amount;
            operacionaisMap[cat] = (operacionaisMap[cat] || 0) + amount;
            break;
          case 'outras':
            outrasDespesas += amount;
            outrasMap[cat] = (outrasMap[cat] || 0) + amount;
            break;
          default: break;
        }
      });

      const despesasComerciaisDetails = Object.entries(comerciaisMap).map(([category, amount]) => ({ category, amount }));
      const despesasAdministrativasDetails = Object.entries(administrativasMap).map(([category, amount]) => ({ category, amount }));
      const despesasOperacionaisDetails = Object.entries(operacionaisMap).map(([category, amount]) => ({ category, amount }));
      const outrasDespesasDetails = Object.entries(outrasMap).map(([category, amount]) => ({ category, amount }));

      const lucroOperacional = lucroBruto - despesasComerciais - despesasAdministrativas - despesasOperacionais;
      const lucroLiquido = lucroOperacional - outrasDespesas;

      data.push({
        period: format(date, 'MMM/yy', { locale: ptBR }),
        receitaBruta,
        custoAquisicao,
        custosVeiculo,
        custosVenda,
        comissoes,
        cac,
        despesasComerciais,
        despesasAdministrativas,
        despesasOperacionais,
        outrasDespesas,
        lucroBruto,
        lucroOperacional,
        lucroLiquido,
        margemBruta: receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0,
        margemLiquida: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
        qtdVendas: monthSales.length,
        custosVeiculoDetails,
        custosVendaDetails,
        despesasComerciaisDetails,
        despesasAdministrativasDetails,
        despesasOperacionaisDetails,
        outrasDespesasDetails,
      });
    }

    return data;
  }, [profitReports, transactions, vehicleCosts, months]);

  // Consolidated totals with details
  const totals = useMemo(() => {
    const base = dreData.reduce((acc, d) => ({
      receitaBruta: acc.receitaBruta + d.receitaBruta,
      custoAquisicao: acc.custoAquisicao + d.custoAquisicao,
      custosVeiculo: acc.custosVeiculo + d.custosVeiculo,
      custosVenda: acc.custosVenda + d.custosVenda,
      comissoes: acc.comissoes + d.comissoes,
      cac: acc.cac + d.cac,
      despesasComerciais: acc.despesasComerciais + d.despesasComerciais,
      despesasAdministrativas: acc.despesasAdministrativas + d.despesasAdministrativas,
      despesasOperacionais: acc.despesasOperacionais + d.despesasOperacionais,
      outrasDespesas: acc.outrasDespesas + d.outrasDespesas,
      lucroBruto: acc.lucroBruto + d.lucroBruto,
      lucroOperacional: acc.lucroOperacional + d.lucroOperacional,
      lucroLiquido: acc.lucroLiquido + d.lucroLiquido,
      qtdVendas: acc.qtdVendas + d.qtdVendas,
    }), {
      receitaBruta: 0,
      custoAquisicao: 0,
      custosVeiculo: 0,
      custosVenda: 0,
      comissoes: 0,
      cac: 0,
      despesasComerciais: 0,
      despesasAdministrativas: 0,
      despesasOperacionais: 0,
      outrasDespesas: 0,
      lucroBruto: 0,
      lucroOperacional: 0,
      lucroLiquido: 0,
      qtdVendas: 0,
    });

    // Aggregate details across all periods
    const aggregateDetails = (key: keyof Pick<DREData, 'custosVeiculoDetails' | 'custosVendaDetails' | 'despesasComerciaisDetails' | 'despesasAdministrativasDetails' | 'despesasOperacionaisDetails' | 'outrasDespesasDetails'>) => {
      const map: Record<string, number> = {};
      dreData.forEach(d => {
        d[key].forEach(detail => {
          map[detail.category] = (map[detail.category] || 0) + detail.amount;
        });
      });
      return Object.entries(map).map(([category, amount]) => ({ category, amount }));
    };

    return {
      ...base,
      custosVeiculoDetails: aggregateDetails('custosVeiculoDetails'),
      custosVendaDetails: aggregateDetails('custosVendaDetails'),
      despesasComerciaisDetails: aggregateDetails('despesasComerciaisDetails'),
      despesasAdministrativasDetails: aggregateDetails('despesasAdministrativasDetails'),
      despesasOperacionaisDetails: aggregateDetails('despesasOperacionaisDetails'),
      outrasDespesasDetails: aggregateDetails('outrasDespesasDetails'),
    };
  }, [dreData]);

  return { dreData, totals, isLoading };
}

export function useCashFlow(filters?: CashFlowFilters) {
  const { data: transactions } = useFinancialTransactionsData();
  const { data: commissions } = useSaleCommissions();
  const { data: vehicleDRE } = useAllVehicleDRE();

  const cashFlowData = useMemo(() => {
    const items: CashFlowItem[] = [];
    const now = new Date();
    
    // Usar transações financeiras reais
    transactions?.forEach((t: any) => {
      const transactionDate = new Date(t.transaction_date);
      
      // Aplicar filtro de data se fornecido
      if (filters) {
        if (transactionDate < filters.startDate || transactionDate > filters.endDate) {
          return;
        }
      }
      
      items.push({
        id: `trans-${t.id}`,
        date: t.transaction_date,
        description: t.description,
        type: t.type === 'receita' ? 'entrada' : 'saida',
        category: t.category,
        value: Number(t.amount) || 0,
        status: t.status === 'pago' ? 'realizado' : 'previsto',
      });
    });

    // Adicionar comissões pendentes como projeções
    commissions?.filter(c => !c.paid && c.status === 'approved').forEach(comm => {
      const dueDate = comm.payment_due_date || format(addMonths(now, 1), 'yyyy-MM-dd');
      
      if (filters) {
        const commDate = new Date(dueDate);
        if (commDate < filters.startDate || commDate > filters.endDate) {
          return;
        }
      }
      
      items.push({
        id: `comm-pending-${comm.id}`,
        date: dueDate,
        description: `Comissão a pagar`,
        type: 'saida',
        category: 'Comissões',
        value: comm.final_amount,
        status: 'previsto',
      });
    });

    // Sort by date
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [transactions, commissions, vehicleDRE, filters]);

  // Calculate running balance
  const balanceData = useMemo(() => {
    const sorted = [...cashFlowData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let balance = 0;
    return sorted.map(item => {
      balance += item.type === 'entrada' ? item.value : -item.value;
      return { ...item, balance };
    });
  }, [cashFlowData]);

  // Summary
  const summary = useMemo(() => {
    const realized = cashFlowData.filter(i => i.status === 'realizado');
    const projected = cashFlowData.filter(i => i.status === 'previsto');

    return {
      totalEntradas: realized.filter(i => i.type === 'entrada').reduce((sum, i) => sum + i.value, 0),
      totalSaidas: realized.filter(i => i.type === 'saida').reduce((sum, i) => sum + i.value, 0),
      saldoRealizado: realized.reduce((sum, i) => sum + (i.type === 'entrada' ? i.value : -i.value), 0),
      projecaoEntradas: projected.filter(i => i.type === 'entrada').reduce((sum, i) => sum + i.value, 0),
      projecaoSaidas: projected.filter(i => i.type === 'saida').reduce((sum, i) => sum + i.value, 0),
    };
  }, [cashFlowData]);

  return { cashFlowData, balanceData, summary };
}

// Funções auxiliares para filtros de período
export function getDateRangeFromPeriod(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return { startDate: now, endDate: now };
    case 'week':
      return { startDate: startOfWeek(now, { locale: ptBR }), endDate: endOfWeek(now, { locale: ptBR }) };
    case 'month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'quarter':
      return { startDate: startOfQuarter(now), endDate: endOfQuarter(now) };
    case 'year':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    case 'last30':
      return { startDate: subDays(now, 30), endDate: now };
    case 'last90':
      return { startDate: subDays(now, 90), endDate: now };
    case 'last12months':
      return { startDate: subMonths(now, 12), endDate: now };
    default:
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }
}

export function useProfitabilityAnalysis() {
  const { data: sales } = useSales();
  const { data: vehicles } = useVehicles();
  const { data: vehicleCosts } = useAllVehicleCosts();
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Tables<'profiles'>[];
    },
  });
  const { data: leads } = useLeads();

  const analysis = useMemo(() => {
    if (!sales || !vehicles) return { byVehicle: [], bySalesperson: [], bySource: [], byCategory: [] };

    const completedSales = sales.filter(r => r.status === 'concluida');

    // Calcular lucro real para cada venda
    const salesWithProfit = completedSales.map(sale => {
      const vehicle = vehicles.find(v => v.id === sale.vehicle_id);
      const costs = vehicleCosts?.filter(c => c.vehicle_id === sale.vehicle_id) || [];
      const totalVehicleCosts = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const purchasePrice = vehicle?.purchase_price || 0;
      const salePrice = sale.sale_price || 0;
      const saleCosts = (sale.documentation_cost || 0) + (sale.transfer_cost || 0) + (sale.other_sale_costs || 0);
      
      const totalCost = purchasePrice + totalVehicleCosts + saleCosts;
      const profit = salePrice - totalCost;
      const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

      return {
        ...sale,
        vehicle,
        totalCost,
        profit,
        margin,
      };
    });

    // By Salesperson
    const salespersonMap = new Map<string, ProfitabilityData>();
    salesWithProfit.forEach(sale => {
      if (!sale.salesperson_id) return;
      const profile = profiles?.find(p => p.id === sale.salesperson_id);
      const existing = salespersonMap.get(sale.salesperson_id) || {
        id: sale.salesperson_id,
        name: profile?.full_name || 'Desconhecido',
        type: 'vendedor' as const,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        count: 0,
      };
      existing.revenue += sale.sale_price || 0;
      existing.cost += sale.totalCost;
      existing.profit += sale.profit;
      existing.count += 1;
      existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      salespersonMap.set(sale.salesperson_id, existing);
    });

    // By Lead Source
    const sourceMap = new Map<string, ProfitabilityData>();
    salesWithProfit.forEach(sale => {
      const lead = leads?.find(l => l.id === sale.lead_id);
      const source = lead?.source || 'direto';
      const existing = sourceMap.get(source) || {
        id: source,
        name: source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' '),
        type: 'origem' as const,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        count: 0,
      };
      existing.revenue += sale.sale_price || 0;
      existing.cost += sale.totalCost;
      existing.profit += sale.profit;
      existing.count += 1;
      existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      sourceMap.set(source, existing);
    });

    // By Vehicle Brand (Category)
    const brandMap = new Map<string, ProfitabilityData>();
    salesWithProfit.forEach(sale => {
      const brand = sale.vehicle?.brand || 'Outros';
      const existing = brandMap.get(brand) || {
        id: brand,
        name: brand,
        type: 'categoria' as const,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        count: 0,
      };
      existing.revenue += sale.sale_price || 0;
      existing.cost += sale.totalCost;
      existing.profit += sale.profit;
      existing.count += 1;
      existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      brandMap.set(brand, existing);
    });

    return {
      byVehicle: salesWithProfit.map(s => ({
        id: s.id || '',
        name: `${s.vehicle?.brand || ''} ${s.vehicle?.model || ''} - ${s.vehicle?.plate || 'S/P'}`,
        type: 'veiculo' as const,
        revenue: s.sale_price || 0,
        cost: s.totalCost,
        profit: s.profit,
        margin: s.margin,
        count: 1,
      })).sort((a, b) => b.profit - a.profit),
      bySalesperson: Array.from(salespersonMap.values()).sort((a, b) => b.profit - a.profit),
      bySource: Array.from(sourceMap.values()).sort((a, b) => b.profit - a.profit),
      byCategory: Array.from(brandMap.values()).sort((a, b) => b.profit - a.profit),
    };
  }, [sales, vehicles, vehicleCosts, profiles, leads]);

  return analysis;
}

export function useFinancialAlerts() {
  const { data: vehicleDRE } = useAllVehicleDRE();
  const { data: profitReports } = useSaleProfitReports();
  const { data: commissions } = useSaleCommissions();
  const { data: goals } = useQuery({
    queryKey: ['salesperson-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salesperson_goals').select('*');
      if (error) throw error;
      return data as Tables<'salesperson_goals'>[];
    },
  });

  const alerts = useMemo(() => {
    const items: FinancialAlert[] = [];
    const now = new Date();

    // Low margin vehicles in stock
    vehicleDRE?.filter(v => v.status === 'disponivel').forEach(vehicle => {
      const daysInStock = vehicle.days_in_stock || 0;
      const expectedDays = vehicle.expected_sale_days || 60;

      // Alert for vehicles over expected days
      if (daysInStock > expectedDays) {
        items.push({
          id: `stock-${vehicle.id}`,
          type: 'estoque_parado',
          severity: daysInStock > expectedDays * 1.5 ? 'critical' : 'warning',
          title: `${vehicle.brand} ${vehicle.model} - Estoque Parado`,
          description: `${daysInStock} dias em estoque (esperado: ${expectedDays} dias)`,
          value: vehicle.total_investment || 0,
          entityId: vehicle.id || '',
          entityType: 'vehicle',
          createdAt: now,
        });
      }

      // Alert for vehicles with high holding cost
      if (vehicle.holding_cost && vehicle.holding_cost > (vehicle.expected_margin_percent || 10) * (vehicle.purchase_price || 0) / 100) {
        items.push({
          id: `holding-${vehicle.id}`,
          type: 'margem_baixa',
          severity: 'warning',
          title: `${vehicle.brand} ${vehicle.model} - Custo de Estoque Alto`,
          description: `Custo de estoque está consumindo a margem esperada`,
          value: vehicle.holding_cost,
          entityId: vehicle.id || '',
          entityType: 'vehicle',
          createdAt: now,
        });
      }
    });

    // Low profit sales
    profitReports?.filter(r => r.status === 'concluida').forEach(sale => {
      const margin = sale.sale_price ? ((sale.net_profit || 0) / sale.sale_price) * 100 : 0;
      if (margin < 5 && margin >= 0) {
        items.push({
          id: `margin-${sale.id}`,
          type: 'margem_baixa',
          severity: 'warning',
          title: `${sale.brand} ${sale.model} - Margem Baixa`,
          description: `Venda concluída com margem de apenas ${margin.toFixed(1)}%`,
          value: sale.net_profit || 0,
          entityId: sale.id || '',
          entityType: 'sale',
          createdAt: new Date(sale.sale_date),
        });
      } else if (margin < 0) {
        items.push({
          id: `loss-${sale.id}`,
          type: 'margem_baixa',
          severity: 'critical',
          title: `${sale.brand} ${sale.model} - Prejuízo!`,
          description: `Venda com prejuízo de ${Math.abs(margin).toFixed(1)}%`,
          value: sale.net_profit || 0,
          entityId: sale.id || '',
          entityType: 'sale',
          createdAt: new Date(sale.sale_date),
        });
      }
    });

    // Pending commissions overdue
    commissions?.filter(c => c.status === 'approved' && !c.paid).forEach(comm => {
      if (comm.payment_due_date && new Date(comm.payment_due_date) < now) {
        items.push({
          id: `comm-overdue-${comm.id}`,
          type: 'comissao_pendente',
          severity: 'critical',
          title: 'Comissão Atrasada',
          description: `Comissão aprovada vencida desde ${format(new Date(comm.payment_due_date), 'dd/MM/yyyy')}`,
          value: comm.final_amount,
          entityId: comm.id,
          entityType: 'commission',
          createdAt: now,
        });
      }
    });

    // Goals at risk
    const currentMonth = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = differenceInDays(monthEnd, currentMonth);
    const daysPassed = differenceInDays(now, currentMonth);
    const expectedProgress = daysPassed / daysInMonth;

    goals?.filter(g => {
      const start = new Date(g.period_start);
      const end = new Date(g.period_end);
      return isWithinInterval(now, { start, end });
    }).forEach(goal => {
      const salesProgress = goal.target_sales > 0 ? goal.current_sales / goal.target_sales : 0;
      if (salesProgress < expectedProgress * 0.7) {
        items.push({
          id: `goal-${goal.id}`,
          type: 'meta_risco',
          severity: salesProgress < expectedProgress * 0.5 ? 'critical' : 'warning',
          title: 'Meta em Risco',
          description: `Progresso de ${(salesProgress * 100).toFixed(0)}% vs esperado ${(expectedProgress * 100).toFixed(0)}%`,
          value: goal.target_sales - goal.current_sales,
          entityId: goal.user_id,
          entityType: 'goal',
          createdAt: now,
        });
      }
    });

    return items.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [vehicleDRE, profitReports, commissions, goals]);

  return alerts;
}
