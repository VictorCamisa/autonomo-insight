import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  User,
  Car,
  CreditCard,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '@/hooks/useContracts';
import { useCustomerDetails } from '@/hooks/useCustomers';
import { useVehicle } from '@/hooks/useVehicles';
import { toast } from 'sonner';

interface ContractReadinessCardProps {
  sale: {
    id: string;
    customer_id: string;
    vehicle_id: string;
    sale_price: number;
    payment_method: string;
    payment_details: string | null;
    notes: string | null;
  };
}

interface FieldCheck {
  field: string;
  label: string;
  value: string | null | undefined;
  required: boolean;
  category: 'customer' | 'vehicle' | 'payment';
}

export function ContractReadinessCard({ sale }: ContractReadinessCardProps) {
  const navigate = useNavigate();
  const { createContract } = useContracts();
  const { data: customer } = useCustomerDetails(sale.customer_id);
  const { data: vehicle } = useVehicle(sale.vehicle_id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Define all fields needed for a complete contract
  const fieldChecks: FieldCheck[] = [
    // Customer fields
    { field: 'name', label: 'Nome do Cliente', value: customer?.name, required: true, category: 'customer' },
    { field: 'cpf_cnpj', label: 'CPF/CNPJ', value: customer?.cpf_cnpj, required: true, category: 'customer' },
    { field: 'rg', label: 'RG', value: customer?.rg, required: false, category: 'customer' },
    { field: 'phone', label: 'Telefone', value: customer?.phone, required: true, category: 'customer' },
    { field: 'email', label: 'E-mail', value: customer?.email, required: false, category: 'customer' },
    { field: 'address', label: 'Endereço', value: customer?.address, required: true, category: 'customer' },
    { field: 'city', label: 'Cidade', value: customer?.city, required: true, category: 'customer' },
    { field: 'state', label: 'Estado', value: customer?.state, required: true, category: 'customer' },
    // Vehicle fields
    { field: 'brand', label: 'Marca', value: vehicle?.brand, required: true, category: 'vehicle' },
    { field: 'model', label: 'Modelo', value: vehicle?.model, required: true, category: 'vehicle' },
    { field: 'year', label: 'Ano', value: vehicle ? `${vehicle.year_fabrication}/${vehicle.year_model}` : null, required: true, category: 'vehicle' },
    { field: 'plate', label: 'Placa', value: vehicle?.plate, required: true, category: 'vehicle' },
    { field: 'color', label: 'Cor', value: vehicle?.color, required: true, category: 'vehicle' },
    { field: 'renavam', label: 'RENAVAM', value: vehicle?.renavam, required: true, category: 'vehicle' },
    // Payment fields
    { field: 'sale_price', label: 'Valor da Venda', value: sale.sale_price?.toString(), required: true, category: 'payment' },
    { field: 'payment_method', label: 'Forma de Pagamento', value: sale.payment_method, required: true, category: 'payment' },
    { field: 'payment_details', label: 'Detalhes Pagamento', value: sale.payment_details, required: false, category: 'payment' },
  ];

  const presentFields = fieldChecks.filter(f => f.value && f.value.trim() !== '');
  const missingRequired = fieldChecks.filter(f => f.required && (!f.value || f.value.trim() === ''));
  const missingOptional = fieldChecks.filter(f => !f.required && (!f.value || f.value.trim() === ''));

  const completionPercent = Math.round((presentFields.length / fieldChecks.length) * 100);
  const canGenerateContract = missingRequired.length === 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'customer': return <User className="h-3 w-3" />;
      case 'vehicle': return <Car className="h-3 w-3" />;
      case 'payment': return <CreditCard className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleGenerateContract = async () => {
    if (!customer || !vehicle) {
      toast.error('Dados incompletos para gerar contrato');
      return;
    }

    setIsCreating(true);
    try {
      await createContract.mutateAsync({
        contract_type: 'venda',
        customer_id: customer.id,
        customer_name: customer.name,
        customer_cpf: customer.cpf_cnpj || undefined,
        customer_rg: customer.rg || undefined,
        customer_phone: customer.phone || undefined,
        customer_email: customer.email || undefined,
        customer_address: customer.address || undefined,
        customer_city: customer.city || undefined,
        customer_state: customer.state || undefined,
        vehicle_id: vehicle.id,
        vehicle_brand: vehicle.brand,
        vehicle_model: vehicle.model,
        vehicle_year: `${vehicle.year_fabrication}/${vehicle.year_model}`,
        vehicle_plate: vehicle.plate || undefined,
        vehicle_color: vehicle.color || undefined,
        vehicle_renavam: vehicle.renavam || undefined,
        vehicle_odometer: vehicle.km || undefined,
        vehicle_value: sale.sale_price,
        negotiation_details: sale.payment_details || undefined,
        notes: sale.notes || undefined,
      });

      toast.success('Contrato gerado com sucesso!');
      navigate('/vendas/contratos');
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Erro ao gerar contrato');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${canGenerateContract ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              <FileText className={`h-5 w-5 ${canGenerateContract ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Contrato de Venda</span>
                <Badge variant="outline" className={canGenerateContract ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}>
                  {completionPercent}% completo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {missingRequired.length === 0 
                  ? 'Todos os dados obrigatórios estão preenchidos' 
                  : `${missingRequired.length} campo(s) obrigatório(s) faltando`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              disabled={!canGenerateContract || isCreating}
              onClick={handleGenerateContract}
              className={canGenerateContract ? 'bg-primary' : ''}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Contrato
                </>
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Missing Required Fields */}
            {missingRequired.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Campos Obrigatórios Faltando ({missingRequired.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missingRequired.map(field => (
                    <Badge key={field.field} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      {getCategoryIcon(field.category)}
                      <span className="ml-1">{field.label}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Present Fields */}
            <div>
              <h4 className="text-sm font-medium text-emerald-600 flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Campos Preenchidos ({presentFields.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {presentFields.map(field => (
                  <Badge key={field.field} variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {getCategoryIcon(field.category)}
                    <span className="ml-1">{field.label}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Missing Optional Fields */}
            {missingOptional.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Campos Opcionais Faltando ({missingOptional.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missingOptional.map(field => (
                    <Badge key={field.field} variant="outline" className="bg-muted text-muted-foreground">
                      {getCategoryIcon(field.category)}
                      <span className="ml-1">{field.label}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action hint */}
            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                💡 Complete os dados do cliente em <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate(`/clientes/${sale.customer_id}`)}>Clientes</Button> ou do veículo em <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate(`/estoque/${sale.vehicle_id}`)}>Estoque</Button>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
