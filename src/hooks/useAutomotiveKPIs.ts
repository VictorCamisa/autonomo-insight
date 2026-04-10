import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import type { AutomotiveKPIs, ChannelMetrics, LeadOriginData, ComparativeData } from '@/types/marketing-module';

interface DateRange {
  from: Date;
  to: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

export function useAutomotiveKPIs(dateRange: DateRange) {
  return useQuery({
    queryKey: ['automotive-kpis', dateRange.from, dateRange.to],
    queryFn: async (): Promise<AutomotiveKPIs> => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch Meta Insights
      const { data: insights } = await supabase
        .from('meta_insights')
        .select('spend')
        .gte('date_start', fromDate)
        .lte('date_stop', toDate)
        .eq('entity_type', 'account') as { data: AnyData[] | null };

      // Fetch leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, qualification_status, created_at')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`) as { data: AnyData[] | null };

      // Fetch negotiations with new fields
      const { data: negotiations } = await supabase
        .from('negotiations')
        .select('id, appointment_date, showed_up, status, estimated_value, test_drive_scheduled, test_drive_completed, no_show_count')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`) as { data: AnyData[] | null };

      // Fetch completed sales with sale_date for conversion time calc
      const { data: sales } = await supabase
        .from('sales')
        .select('id, sale_price, sale_date, lead_id')
        .eq('status', 'concluida')
        .gte('sale_date', fromDate)
        .lte('sale_date', toDate) as { data: AnyData[] | null };

      // Calculate investment
      const totalSpend = insights?.reduce((sum: number, i: AnyData) => sum + (i.spend || 0), 0) || 0;

      // Lead metrics
      const leadsCount = leads?.length || 0;
      const qualifiedLeads = leads?.filter(l => l.qualification_status === 'qualificado').length || 0;

      // Appointment metrics
      const withAppointment = negotiations?.filter(n => n.appointment_date) || [];
      const appointmentsCount = withAppointment.length;
      const showedUp = withAppointment.filter(n => n.showed_up === true).length;
      const noShows = withAppointment.filter(n => n.showed_up === false).length;

      // Test drive metrics
      const testDriveScheduled = negotiations?.filter(n => n.test_drive_scheduled).length || 0;
      const testDriveCompleted = negotiations?.filter(n => n.test_drive_completed).length || 0;

      // Sales metrics
      const completedSales = sales || [];
      const salesCount = completedSales.length;
      const totalRevenue = completedSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
      const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

      // Calculate average conversion time (days from lead to sale)
      let totalConversionDays = 0;
      let conversionCount = 0;
      if (completedSales.length > 0 && leads) {
        for (const sale of completedSales) {
          if (sale.lead_id) {
            const lead = leads.find(l => l.id === sale.lead_id);
            if (lead) {
              const days = differenceInDays(new Date(sale.sale_date), new Date(lead.created_at));
              if (days >= 0) {
                totalConversionDays += days;
                conversionCount++;
              }
            }
          }
        }
      }
      const avgConversionDays = conversionCount > 0 ? totalConversionDays / conversionCount : 0;

      // Pipeline value
      const pipelineValue = negotiations
        ?.filter(n => n.status === 'atendimento_ia' || n.status === 'negociando')
        .reduce((sum, n) => sum + (n.estimated_value || 0), 0) || 0;

      // Calculate margins for CAC Payback (assume 15% avg margin)
      const avgMargin = avgTicket * 0.15;
      const cpa = salesCount > 0 ? totalSpend / salesCount : 0;
      const cacPayback = avgMargin > 0 ? cpa / avgMargin : 0;

      return {
        investment: totalSpend,
        leads: leadsCount,
        qualifiedLeads,
        cpl: leadsCount > 0 ? totalSpend / leadsCount : 0,
        cplQualified: qualifiedLeads > 0 ? totalSpend / qualifiedLeads : 0,
        appointments: appointmentsCount,
        sales: salesCount,
        revenue: totalRevenue,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        costPerAppointment: appointmentsCount > 0 ? totalSpend / appointmentsCount : 0,
        costPerSale: cpa,
        avgTicket,
        avgConversionDays,
        cacPayback,
        noShowRate: appointmentsCount > 0 ? (noShows / appointmentsCount) * 100 : 0,
        testDriveScheduled,
        testDriveCompleted,
        testDriveRate: testDriveScheduled > 0 ? (testDriveCompleted / testDriveScheduled) * 100 : 0,
        pipelineValue,
      };
    },
    staleTime: 60000,
  });
}

export function useLeadOriginData(dateRange: DateRange) {
  return useQuery({
    queryKey: ['lead-origin-data', dateRange.from, dateRange.to],
    queryFn: async (): Promise<LeadOriginData> => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch leads with source
      const { data: leads } = await supabase
        .from('leads')
        .select('id, source, qualification_status')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`) as { data: AnyData[] | null };

      // Fetch negotiations
      const { data: negotiations } = await supabase
        .from('negotiations')
        .select('id, lead_id, appointment_date, status')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`) as { data: AnyData[] | null };

      // Fetch sales
      const { data: sales } = await supabase
        .from('sales')
        .select('id, lead_id, sale_price')
        .eq('status', 'concluida')
        .gte('sale_date', fromDate)
        .lte('sale_date', toDate) as { data: AnyData[] | null };

      // Fetch meta insights for investment
      const { data: insights } = await supabase
        .from('meta_insights')
        .select('spend')
        .gte('date_start', fromDate)
        .lte('date_stop', toDate)
        .eq('entity_type', 'account') as { data: AnyData[] | null };

      const totalMetaSpend = insights?.reduce((sum: number, i: AnyData) => sum + (i.spend || 0), 0) || 0;

      // Group by source
      const sourceMap = new Map<string, ChannelMetrics>();
      const sourceLabels: Record<string, string> = {
        facebook: 'Facebook Ads',
        instagram: 'Instagram Ads',
        google: 'Google Ads',
        olx: 'OLX',
        webmotors: 'Webmotors',
        indicacao: 'Indicação',
        site: 'Site',
        outros: 'Outros',
      };

      // Initialize with all sources from leads
      leads?.forEach(lead => {
        const source = lead.source || 'outros';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, {
            channel: source,
            channelLabel: sourceLabels[source] || source,
            leads: 0,
            qualifiedLeads: 0,
            appointments: 0,
            sales: 0,
            revenue: 0,
            investment: 0,
            cpl: 0,
            cpa: 0,
            conversionRate: 0,
            avgTicket: 0,
            roas: 0,
          });
        }

        const metrics = sourceMap.get(source)!;
        metrics.leads++;
        if (lead.qualification_status === 'qualificado') {
          metrics.qualifiedLeads++;
        }

        // Check for negotiations
        const leadNegotiations = negotiations?.filter(n => n.lead_id === lead.id) || [];
        if (leadNegotiations.some(n => n.appointment_date)) {
          metrics.appointments++;
        }

        // Check for sales
        const leadSales = sales?.filter(s => s.lead_id === lead.id) || [];
        if (leadSales.length > 0) {
          metrics.sales++;
          metrics.revenue += leadSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
        }
      });

      // Distribute Meta investment to facebook/instagram sources proportionally
      const metaSources = ['facebook', 'instagram'];
      const metaLeads = Array.from(sourceMap.entries())
        .filter(([source]) => metaSources.includes(source))
        .reduce((sum, [, m]) => sum + m.leads, 0);

      sourceMap.forEach((metrics, source) => {
        if (metaSources.includes(source) && metaLeads > 0) {
          metrics.investment = (metrics.leads / metaLeads) * totalMetaSpend;
        }
        
        // Calculate derived metrics
        metrics.cpl = metrics.leads > 0 ? metrics.investment / metrics.leads : 0;
        metrics.cpa = metrics.sales > 0 ? metrics.investment / metrics.sales : 0;
        metrics.conversionRate = metrics.leads > 0 ? (metrics.sales / metrics.leads) * 100 : 0;
        metrics.avgTicket = metrics.sales > 0 ? metrics.revenue / metrics.sales : 0;
        metrics.roas = metrics.investment > 0 ? metrics.revenue / metrics.investment : 0;
      });

      const bySource = Array.from(sourceMap.values()).sort((a, b) => b.leads - a.leads);
      
      const totals = bySource.reduce(
        (acc, m) => ({
          leads: acc.leads + m.leads,
          qualifiedLeads: acc.qualifiedLeads + m.qualifiedLeads,
          appointments: acc.appointments + m.appointments,
          sales: acc.sales + m.sales,
          revenue: acc.revenue + m.revenue,
          investment: acc.investment + m.investment,
        }),
        { leads: 0, qualifiedLeads: 0, appointments: 0, sales: 0, revenue: 0, investment: 0 }
      );

      return { bySource, totals };
    },
    staleTime: 60000,
  });
}

export function useComparativeData(currentRange: DateRange, previousRange: DateRange) {
  const currentQuery = useAutomotiveKPIs(currentRange);
  const previousQuery = useAutomotiveKPIs(previousRange);

  return useQuery({
    queryKey: ['comparative-data', currentRange.from, currentRange.to, previousRange.from, previousRange.to],
    queryFn: async (): Promise<ComparativeData | null> => {
      if (!currentQuery.data || !previousQuery.data) return null;

      const current = currentQuery.data;
      const previous = previousQuery.data;

      const calcVariation = (curr: number, prev: number) => 
        prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

      return {
        current,
        previous,
        variations: {
          investment: calcVariation(current.investment, previous.investment),
          leads: calcVariation(current.leads, previous.leads),
          cpl: calcVariation(current.cpl, previous.cpl),
          appointments: calcVariation(current.appointments, previous.appointments),
          sales: calcVariation(current.sales, previous.sales),
          revenue: calcVariation(current.revenue, previous.revenue),
          roas: calcVariation(current.roas, previous.roas),
        },
      };
    },
    enabled: !!currentQuery.data && !!previousQuery.data,
  });
}
