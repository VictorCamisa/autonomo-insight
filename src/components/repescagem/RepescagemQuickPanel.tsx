import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles, ExternalLink, LayoutDashboard, Layers, UserCheck, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import RepescagemDashboard from './RepescagemDashboard';
import RepescagemCampanhas from './RepescagemCampanhas';
import RepescagemLeads from './RepescagemLeads';
import RepescagemHistorico from './RepescagemHistorico';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepescagemQuickPanel({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <SheetTitle>Repescagem</SheetTitle>
                <SheetDescription>IA reaviva conversas paradas automaticamente</SheetDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <Link to="/repescagem">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir módulo
              </Link>
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 border-b shrink-0">
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <LayoutDashboard className="h-4 w-4" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="campanhas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <Layers className="h-4 w-4" /> Campanhas
              </TabsTrigger>
              <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <UserCheck className="h-4 w-4" /> Leads
              </TabsTrigger>
              <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                <History className="h-4 w-4" /> Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="dashboard" className="mt-0"><RepescagemDashboard /></TabsContent>
            <TabsContent value="campanhas" className="mt-0"><RepescagemCampanhas /></TabsContent>
            <TabsContent value="leads" className="mt-0"><RepescagemLeads /></TabsContent>
            <TabsContent value="historico" className="mt-0"><RepescagemHistorico /></TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
