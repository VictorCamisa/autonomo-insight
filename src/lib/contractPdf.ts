import { Contract } from '@/hooks/useContracts';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const currencyToWords = (value: number): string => {
  // Simple implementation - can be expanded
  const formatted = formatCurrency(value);
  return `(${formatted})`;
};

export function generateSaleContractPDF(contract: Contract) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE VENDA DE VEÍCULO', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Seller info (Company)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDEDOR:', margin, y);
  doc.setFont('helvetica', 'normal');
  const sellerText = 'M DE A PEREIRA VEICULOS ME, inscrita no CNPJ sob n° 06.334.716.0001-01, com sede na Avenida Major Joaquim Monteiro Patto, 25, Chácara do Visconde, Taubaté-SP, CEP 12050-620, Telefones: 12 36227375 e 12 974052576';
  const sellerLines = doc.splitTextToSize(sellerText, contentWidth - 25);
  doc.text(sellerLines, margin + 25, y);
  y += sellerLines.length * 5 + 8;

  // Buyer info
  doc.setFont('helvetica', 'bold');
  doc.text('COMPRADOR:', margin, y);
  doc.setFont('helvetica', 'normal');
  const buyerText = `${contract.customer_name}, ${contract.customer_nationality || 'brasileiro(a)'}, ${contract.customer_profession || 'profissão não informada'}, ${contract.customer_marital_status || 'estado civil não informado'}, com cédula de identidade RG n° ${contract.customer_rg || '___________'}, inscrito no CPF/MF sob o n° ${contract.customer_cpf || '___________'}, data de nascimento: ${contract.customer_birth_date ? format(new Date(contract.customer_birth_date), 'dd/MM/yyyy') : '___/___/______'}, residente e domiciliado na ${contract.customer_address || '___________'}, ${contract.customer_city || '___________'}, ${contract.customer_state || '___'}, CEP ${contract.customer_zip || '___________'}, com telefone para contato n° ${contract.customer_phone || '___________'}. E-mail: ${contract.customer_email || '___________'}`;
  const buyerLines = doc.splitTextToSize(buyerText, contentWidth - 28);
  doc.text(buyerLines, margin + 28, y);
  y += buyerLines.length * 5 + 10;

  // Purpose
  const purposeText = 'O presente instrumento particular entabulado entre as partes supramencionadas, tem como finalidade a venda do veículo:';
  const purposeLines = doc.splitTextToSize(purposeText, contentWidth);
  doc.text(purposeLines, margin, y);
  y += purposeLines.length * 5 + 8;

  // Vehicle info
  doc.setFont('helvetica', 'bold');
  doc.text('OBJETO:', margin, y);
  doc.setFont('helvetica', 'normal');
  const vehicleText = `${contract.vehicle_brand} ${contract.vehicle_model}, ${contract.vehicle_year}, placa ${contract.vehicle_plate || '___________'}, cor ${contract.vehicle_color || '___________'}, RENAVAM n° ${contract.vehicle_renavam || '___________'}, Hodômetro: ${contract.vehicle_odometer || '___________'} km`;
  const vehicleLines = doc.splitTextToSize(vehicleText, contentWidth - 20);
  doc.text(vehicleLines, margin + 20, y);
  y += vehicleLines.length * 5 + 10;

  // Payment
  doc.setFont('helvetica', 'bold');
  doc.text('FORMA DE PAGAMENTO:', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  
  const paymentIntro = 'O OBJETO deste contrato foi vendido da seguinte forma:';
  doc.text(paymentIntro, margin, y);
  y += 8;

  // Down payment
  if (contract.down_payment && contract.down_payment > 0) {
    doc.text(`• Entrada no valor de ${formatCurrency(contract.down_payment)};`, margin, y);
    y += 6;
  }

  // Trade-in
  if (contract.trade_in_brand) {
    const tradeInText = `• Entrega do veículo ${contract.trade_in_brand} ${contract.trade_in_model || ''}, ${contract.trade_in_year || ''}, placas ${contract.trade_in_plate || '___________'}, cor ${contract.trade_in_color || '___________'}, RENAVAM n° ${contract.trade_in_renavam || '___________'}. No ato da assinatura do presente instrumento o comprador compromete-se a entregar o veículo como parte do pagamento a LOJA, livre e desimpedido de qualquer débito.`;
    const tradeInLines = doc.splitTextToSize(tradeInText, contentWidth - 5);
    doc.text(tradeInLines, margin, y);
    y += tradeInLines.length * 5 + 4;
  }

  // Installments
  if (contract.installments_count && contract.installments_count > 0) {
    const installmentText = `• O valor remanescente será pago por ${contract.installments_count} notas promissórias, no valor de ${formatCurrency(contract.installment_value || 0)}, a serem pagos todo dia ${contract.installment_due_day || '___'} de cada mês.`;
    const installmentLines = doc.splitTextToSize(installmentText, contentWidth - 5);
    doc.text(installmentLines, margin, y);
    y += installmentLines.length * 5 + 8;
  }

  // Non-payment clause
  const nonPaymentText = 'O não pagamento dos valores acima mencionados, desde já, autoriza a execução do presente contrato, bem como requerer medidas judiciais cabíveis.';
  const nonPaymentLines = doc.splitTextToSize(nonPaymentText, contentWidth);
  doc.text(nonPaymentLines, margin, y);
  y += nonPaymentLines.length * 5 + 10;

  // Warranty section
  doc.setFont('helvetica', 'bold');
  doc.text('GARANTIA:', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  
  const warrantyText = 'O COMPRADOR adquire o veículo do VENDEDOR no estado em que ele se encontra. Atestando, pela assinatura do presente termo, ter vistoriado e garantido que o veículo atendeu suas exigências. O veículo não possui garantia de componentes elétricos, eletrônicos e eletromecânicos. Nos termos do Artigo 26, II, do CDC, o COMPRADOR tem o prazo de 90 (noventa) dias, a partir da tradição do bem, para apresentar ao VENDEDOR qualquer reclamação por vícios no veículo.';
  const warrantyLines = doc.splitTextToSize(warrantyText, contentWidth);
  doc.text(warrantyLines, margin, y);
  y += warrantyLines.length * 5 + 10;

  // Final clause
  const finalText = 'Por fim, nos termos do Artigo 784, III, do CPC, as partes firmam o presente contrato por livre e espontânea vontade. Elegendo, para dirimirem qualquer dúvida, o foro de Taubaté-SP.';
  const finalLines = doc.splitTextToSize(finalText, contentWidth);
  doc.text(finalLines, margin, y);
  y += finalLines.length * 5 + 10;

  // Date
  const today = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.text(`Taubaté, ${today}`, margin, y);
  y += 20;

  // Signatures
  const signatureY = y + 15;
  doc.line(margin, signatureY, margin + 70, signatureY);
  doc.line(pageWidth - margin - 70, signatureY, pageWidth - margin, signatureY);
  
  doc.setFontSize(9);
  doc.text('M DE A PEREIRA VEICULOS ME', margin, signatureY + 5);
  doc.text('VENDEDOR', margin, signatureY + 10);
  
  doc.text(contract.customer_name.toUpperCase(), pageWidth - margin - 70, signatureY + 5);
  doc.text('COMPRADOR', pageWidth - margin - 70, signatureY + 10);

  return doc;
}

export function generatePurchaseContractPDF(contract: Contract) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE COMPRA DE VEÍCULO', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Buyer info (Company)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPRADOR:', margin, y);
  doc.setFont('helvetica', 'normal');
  const buyerText = 'M DE A PEREIRA VEICULOS ME, inscrita no CNPJ sob n° 06.334.716.0001-01, com sede na Avenida Major Joaquim Monteiro Patto, 25, Chácara do Visconde, Taubaté-SP, CEP 12050-620.';
  const buyerLines = doc.splitTextToSize(buyerText, contentWidth - 28);
  doc.text(buyerLines, margin + 28, y);
  y += buyerLines.length * 5 + 8;

  // Seller info (Client)
  doc.setFont('helvetica', 'bold');
  doc.text('VENDEDOR:', margin, y);
  doc.setFont('helvetica', 'normal');
  const sellerText = `${contract.customer_name}, ${contract.customer_nationality || 'brasileiro(a)'}, ${contract.customer_profession || 'profissão não informada'}, ${contract.customer_marital_status || 'estado civil não informado'}, data de nascimento: ${contract.customer_birth_date ? format(new Date(contract.customer_birth_date), 'dd/MM/yyyy') : '___/___/______'}, com cédula de identidade RG n° ${contract.customer_rg || '___________'}, inscrito no CPF/MF sob o n° ${contract.customer_cpf || '___________'}, residente e domiciliado na ${contract.customer_address || '___________'}, ${contract.customer_city || '___________'}, ${contract.customer_state || '___'}, CEP ${contract.customer_zip || '___________'}, telefone para contato: ${contract.customer_phone || '___________'}`;
  const sellerLines = doc.splitTextToSize(sellerText, contentWidth - 25);
  doc.text(sellerLines, margin + 25, y);
  y += sellerLines.length * 5 + 10;

  // Purpose
  const purposeText = 'O presente instrumento particular entabulado entre as partes supramencionadas, tem como finalidade a compra do veículo:';
  const purposeLines = doc.splitTextToSize(purposeText, contentWidth);
  doc.text(purposeLines, margin, y);
  y += purposeLines.length * 5 + 8;

  // Vehicle info
  doc.setFont('helvetica', 'bold');
  doc.text('OBJETO:', margin, y);
  doc.setFont('helvetica', 'normal');
  const vehicleText = `${contract.vehicle_brand} ${contract.vehicle_model}, ${contract.vehicle_year}, placas ${contract.vehicle_plate || '___________'}, cor ${contract.vehicle_color || '___________'}, RENAVAM n° ${contract.vehicle_renavam || '___________'}.`;
  const vehicleLines = doc.splitTextToSize(vehicleText, contentWidth - 20);
  doc.text(vehicleLines, margin + 20, y);
  y += vehicleLines.length * 5 + 10;

  // Commitment clause
  const commitmentText = 'No ato da assinatura do presente instrumento o VENDEDOR compromete-se a entregar o veículo ao COMPRADOR livre e desimpedido de qualquer débito, como multas, bloqueio judiciais bem como outras taxas que possam recair.';
  const commitmentLines = doc.splitTextToSize(commitmentText, contentWidth);
  doc.text(commitmentLines, margin, y);
  y += commitmentLines.length * 5 + 8;

  const debtText = 'Realizada a tradição do bem, assim como definido entre as partes, quaisquer débitos que surgirem após essa data, serão única e exclusivamente de responsabilidade do VENDEDOR.';
  const debtLines = doc.splitTextToSize(debtText, contentWidth);
  doc.text(debtLines, margin, y);
  y += debtLines.length * 5 + 10;

  // Final clause
  const finalText = 'Por fim, nos termos do Artigo 784, III, do CPC, as partes firmam o presente contrato por livre e espontânea vontade, exarando suas assinaturas em conjunto com duas testemunhas. Elegendo, para dirimirem qualquer dúvida, o foro de Taubaté-SP.';
  const finalLines = doc.splitTextToSize(finalText, contentWidth);
  doc.text(finalLines, margin, y);
  y += finalLines.length * 5 + 10;

  // Date
  const today = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.text(`Taubaté, ${today}`, margin, y);
  y += 20;

  // Signatures
  const signatureY = y + 15;
  doc.line(margin, signatureY, margin + 70, signatureY);
  doc.line(pageWidth - margin - 70, signatureY, pageWidth - margin, signatureY);
  
  doc.setFontSize(9);
  doc.text('M DE A PEREIRA VEICULOS ME', margin, signatureY + 5);
  doc.text('COMPRADOR', margin, signatureY + 10);
  
  doc.text(`Nome: ${contract.customer_name.toUpperCase()}`, pageWidth - margin - 70, signatureY + 5);
  doc.text('VENDEDOR', pageWidth - margin - 70, signatureY + 10);

  return doc;
}

export function downloadContractPDF(contract: Contract) {
  const doc = contract.contract_type === 'venda' 
    ? generateSaleContractPDF(contract)
    : generatePurchaseContractPDF(contract);
  
  doc.save(`${contract.contract_number}.pdf`);
}

// Dados de exemplo para preview dos modelos
const SAMPLE_SALE_CONTRACT: Contract = {
  id: 'sample-sale',
  contract_number: 'MODELO-VENDA',
  contract_type: 'venda',
  status: 'draft',
  customer_name: 'João da Silva Santos',
  customer_cpf: '123.456.789-00',
  customer_rg: '12.345.678-9',
  customer_phone: '(12) 99999-8888',
  customer_email: 'joao.silva@email.com',
  customer_address: 'Rua das Flores, 123, Centro',
  customer_city: 'Taubaté',
  customer_state: 'SP',
  customer_zip: '12020-000',
  customer_birth_date: '1985-05-15',
  customer_nationality: 'brasileiro',
  customer_profession: 'Empresário',
  customer_marital_status: 'casado',
  vehicle_brand: 'Honda',
  vehicle_model: 'Civic EXL 2.0',
  vehicle_year: '2022/2023',
  vehicle_plate: 'ABC-1234',
  vehicle_color: 'Preto',
  vehicle_renavam: '12345678901',
  vehicle_odometer: 35000,
  vehicle_value: 125000,
  down_payment: 25000,
  trade_in_brand: 'Volkswagen',
  trade_in_model: 'Polo 1.6',
  trade_in_year: '2018/2019',
  trade_in_plate: 'XYZ-5678',
  trade_in_color: 'Prata',
  trade_in_renavam: '98765432109',
  trade_in_value: 45000,
  installments_count: 12,
  installment_value: 4583.33,
  installment_due_day: 15,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SAMPLE_PURCHASE_CONTRACT: Contract = {
  id: 'sample-purchase',
  contract_number: 'MODELO-COMPRA',
  contract_type: 'compra',
  status: 'draft',
  customer_name: 'Maria Aparecida Oliveira',
  customer_cpf: '987.654.321-00',
  customer_rg: '98.765.432-1',
  customer_phone: '(12) 98888-7777',
  customer_address: 'Avenida Brasil, 456, Jardim América',
  customer_city: 'Taubaté',
  customer_state: 'SP',
  customer_zip: '12030-000',
  customer_birth_date: '1978-10-20',
  customer_nationality: 'brasileira',
  customer_profession: 'Advogada',
  customer_marital_status: 'solteira',
  vehicle_brand: 'Toyota',
  vehicle_model: 'Corolla XEi 2.0',
  vehicle_year: '2021/2021',
  vehicle_plate: 'DEF-9876',
  vehicle_color: 'Branco',
  vehicle_renavam: '11223344556',
  vehicle_value: 98000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function generateSampleContractPDF(type: 'venda' | 'compra') {
  const contract = type === 'venda' ? SAMPLE_SALE_CONTRACT : SAMPLE_PURCHASE_CONTRACT;
  const doc = type === 'venda' 
    ? generateSaleContractPDF(contract)
    : generatePurchaseContractPDF(contract);
  
  return doc;
}

export function previewSampleContract(type: 'venda' | 'compra') {
  const doc = generateSampleContractPDF(type);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

export function downloadSampleContract(type: 'venda' | 'compra') {
  const doc = generateSampleContractPDF(type);
  doc.save(`MODELO_${type.toUpperCase()}_VEICULO.pdf`);
}
