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
  const sellerText = 'M DE A PEREIRA VEICULOS ME, inscrita no CNPJ sob n° 06.334.716.0001-01, com sede na Avenida Major Joaquim Monteiro Patto, 25, Chácara do Visconde, Taubaté-SP, CEP 12050-620, Telefones: 12 3622-7375, 12 97405-2576 E 12 99668-1249';
  const sellerLines = doc.splitTextToSize(sellerText, contentWidth - 25);
  doc.text(sellerLines, margin + 25, y);
  y += sellerLines.length * 5 + 8;

  // Buyer info
  doc.setFont('helvetica', 'bold');
  doc.text('COMPRADOR:', margin, y);
  doc.setFont('helvetica', 'normal');
  const buyerText = `${contract.customer_name.toUpperCase()}, ${(contract.customer_nationality || 'BRASILEIRO(A)').toUpperCase()}, ${(contract.customer_profession || 'PROFISSÃO NÃO INFORMADA').toUpperCase()}, ${(contract.customer_marital_status || 'ESTADO CIVIL NÃO INFORMADO').toUpperCase()}, com cédula de identidade RG n° ${contract.customer_rg || '___________'}, inscrito no CPF/MF sob o n° ${contract.customer_cpf || '___________'}, data de nascimento: ${contract.customer_birth_date ? format(new Date(contract.customer_birth_date), 'dd/MM/yyyy') : '___/___/______'}, residente e domiciliado na ${contract.customer_address?.toUpperCase() || '___________'}, ${contract.customer_city?.toUpperCase() || '___________'}, ${contract.customer_state?.toUpperCase() || '___'}, ${contract.customer_zip || '___________'}, com telefone para contato n° ${contract.customer_phone || '___________'}. E-mail: ${contract.customer_email?.toUpperCase() || '___________'}`;
  const buyerLines = doc.splitTextToSize(buyerText, contentWidth - 28);
  doc.text(buyerLines, margin + 28, y);
  y += buyerLines.length * 5 + 10;

  // Purpose
  const purposeText = 'O presente instrumento particular entabulado entre as partes supramencionadas, tem como finalidade a venda do veículo:';
  const purposeLines = doc.splitTextToSize(purposeText, contentWidth);
  doc.text(purposeLines, margin, y);
  y += purposeLines.length * 5 + 8;

  // Vehicle info (matching original format: MARCA MODELO, ANO, PLACA, COR, RENAVAM)
  doc.setFont('helvetica', 'bold');
  doc.text('OBJETO:', margin, y);
  doc.setFont('helvetica', 'normal');
  const vehicleText = `${contract.vehicle_brand.toUpperCase()} ${contract.vehicle_model.toUpperCase()}, ${contract.vehicle_year}, ${contract.vehicle_plate?.toUpperCase() || '___________'}, ${contract.vehicle_color?.toUpperCase() || '___________'}, RENAVAM n°${contract.vehicle_renavam || '___________'},`;
  const vehicleLines = doc.splitTextToSize(vehicleText, contentWidth - 20);
  doc.text(vehicleLines, margin + 20, y);
  y += vehicleLines.length * 5 + 10;

  // Payment section
  doc.setFont('helvetica', 'bold');
  doc.text('FORMA DE PAGAMENTO:', margin, y);
  doc.setFont('helvetica', 'normal');
  const paymentIntro = 'o OBJETO deste contrato foi vendido da seguinte forma:';
  doc.text(paymentIntro, margin + 50, y);
  y += 8;

  // Use negotiation_details from notes if available, otherwise build from individual fields
  const negotiationFromNotes = contract.notes?.includes('NEGOCIAÇÃO:') 
    ? contract.notes.split('NEGOCIAÇÃO:')[1]?.split('\n\n')[0]?.trim()
    : null;

  if (negotiationFromNotes) {
    // Parse negotiation details line by line
    const lines = negotiationFromNotes.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('Vendido pelo valor')) {
        const lineText = trimmedLine.startsWith('•') ? trimmedLine : `- ${trimmedLine}`;
        const wrappedLines = doc.splitTextToSize(lineText, contentWidth - 5);
        doc.text(wrappedLines, margin, y);
        y += wrappedLines.length * 5 + 2;
      }
    });
    y += 4;
  } else {
    // Build from individual fields
    // Down payment
    if (contract.down_payment && contract.down_payment > 0) {
      doc.text(`- Entrada no valor de ${formatCurrency(contract.down_payment)};`, margin, y);
      y += 6;
    }

    // Trade-in
    if (contract.trade_in_brand) {
      const tradeInText = `- Entrega do veículo ${contract.trade_in_brand} ${contract.trade_in_model || ''}, ${contract.trade_in_year || ''}, placa ${contract.trade_in_plate || '___________'}, cor ${contract.trade_in_color || '___________'}, avaliado em ${formatCurrency(contract.trade_in_value || 0)};`;
      const tradeInLines = doc.splitTextToSize(tradeInText, contentWidth - 5);
      doc.text(tradeInLines, margin, y);
      y += tradeInLines.length * 5 + 2;
    }

    // Financing/Installments
    if (contract.installments_count && contract.installments_count > 0) {
      const financingText = `- Valor financiado de ${formatCurrency((contract.installment_value || 0) * contract.installments_count)} financiado em ${contract.installments_count}x de ${formatCurrency(contract.installment_value || 0)}`;
      const financingLines = doc.splitTextToSize(financingText, contentWidth - 5);
      doc.text(financingLines, margin, y);
      y += financingLines.length * 5 + 2;
    }
    y += 6;
  }

  // Warranty section (complete version matching original)
  doc.setFont('helvetica', 'bold');
  doc.text('GARANTIA:', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  
  const warranty1 = 'o COMPRADOR adquire o veículo do VENDEDOR no estado em que ele se encontra. Atestando, pela assinatura do presente termo, ter vistoriado e garantido que o veículo atendeu suas exigências.';
  const warranty1Lines = doc.splitTextToSize(warranty1, contentWidth);
  doc.text(warranty1Lines, margin, y);
  y += warranty1Lines.length * 5 + 4;

  const warranty2 = 'O veículo não possui garantia de componentes elétricos, eletrônicos e eletromecânicos (módulos, sensores/sondas, alternador, motor de partida, lâmpadas, faróis, lanternas, chicotes elétricos e alarmes), pois encontram-se em perfeito estado e condições de uso no ato da compra. Ademais, o acabamento do veículo (estofamentos, forrações, pintura) bem como pneus, não estão cobertos pela garantia, por seu estado de conservação ser de fácil constatação.';
  const warranty2Lines = doc.splitTextToSize(warranty2, contentWidth);
  doc.text(warranty2Lines, margin, y);
  y += warranty2Lines.length * 5 + 4;

  const warranty3 = 'Nos termos do Artigo 26, II, do CDC, o COMPRADOR tem o prazo de 90 (noventa) dias, a partir da tradição do bem, para apresentar ao VENDEDOR qualquer reclamação por vícios no veículo. E, para que o reparo seja feito, o veículo deve ser apresentado ao estabelecimento comercial pelo comprador.';
  const warranty3Lines = doc.splitTextToSize(warranty3, contentWidth);
  doc.text(warranty3Lines, margin, y);
  y += warranty3Lines.length * 5 + 4;

  const warranty4 = 'Fica desde já consignado que, durante o período em que o veículo estiver sendo reparado (dentro do prazo máximo de 30 dias), o VENDEDOR não se obriga, conforme legislação vigente, a disponibilizar carro reserva ao COMPRADOR.';
  const warranty4Lines = doc.splitTextToSize(warranty4, contentWidth);
  doc.text(warranty4Lines, margin, y);
  y += warranty4Lines.length * 5 + 4;

  const warranty5 = 'O COMPRADOR perderá totalmente a garantia do veículo, caso seja constatada que o veículo tenha sido submetido ao uso de forma inadequada, imprudente, negligente ou danificado por acidente ou tenha sido reparado em oficina diversa, sem prévia comunicação ao VENDEDOR.';
  const warranty5Lines = doc.splitTextToSize(warranty5, contentWidth);
  doc.text(warranty5Lines, margin, y);
  y += warranty5Lines.length * 5 + 8;

  // Check if we need a new page
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

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
  const vehicleText = `${contract.vehicle_brand} ${contract.vehicle_model}, ${contract.vehicle_year}, ${contract.vehicle_plate || '___________'}, ${contract.vehicle_color || '___________'}, RENAVAM n°${contract.vehicle_renavam || '___________'}.`;
  const vehicleLines = doc.splitTextToSize(vehicleText, contentWidth - 20);
  doc.text(vehicleLines, margin + 20, y);
  y += vehicleLines.length * 5 + 10;

  // Negotiation section (payment details)
  doc.setFont('helvetica', 'bold');
  doc.text('NEGOCIAÇÃO:', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  
  const negotiationIntro = `Comprado pelo valor de ${formatCurrency(contract.vehicle_value)} ${currencyToWords(contract.vehicle_value)}`;
  const negotiationLines = doc.splitTextToSize(negotiationIntro, contentWidth);
  doc.text(negotiationLines, margin, y);
  y += negotiationLines.length * 5 + 4;

  // Payment details from notes or default
  if (contract.notes) {
    const notesLines = doc.splitTextToSize(contract.notes, contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 5 + 8;
  } else if (contract.down_payment && contract.down_payment > 0) {
    doc.text(`• Entrada: ${formatCurrency(contract.down_payment)}`, margin, y);
    y += 6;
  }
  
  y += 4;

  // Commitment clause
  const commitmentText = 'No ato da assinatura do presente instrumento o VENDEDOR compromete-se a entregar o veículo ao COMPRADOR livre e desimpedido de qualquer débito, como multas, bloqueios judiciais bem como outras taxas que possam recair.';
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
  customer_name: 'DEBORA CRISTINA PEREIRA',
  customer_cpf: '367.554.878-30',
  customer_rg: '418771340',
  customer_phone: '(12) 98111-3858',
  customer_address: 'Rua Marcelo Thorchio, 48, Vila Rezende',
  customer_city: 'Taubaté',
  customer_state: 'SP',
  customer_zip: '12052-110',
  customer_birth_date: '1987-06-03',
  customer_nationality: 'brasileira',
  customer_profession: 'Auxiliar de Inclusão',
  customer_marital_status: 'solteira',
  vehicle_brand: 'FORD',
  vehicle_model: 'FIESTA 1.6 FLEX',
  vehicle_year: '2009/2010',
  vehicle_plate: 'EIH2J66',
  vehicle_color: 'PRETO',
  vehicle_renavam: '00184453755',
  vehicle_value: 20000,
  down_payment: 12882,
  notes: `com um valor de R$12.882,00 (doze mil oitocentos e oitenta e dois reais) para quitação na data de hoje pago pelo cliente da seguinte maneira:

• R$8.000,00 no cartão em crédito em 3x de R$2.970,00
• R$4.882,00 via pix na conta da loja (BRADESCO) na data de hoje
• R$104,00 referente a multa por averbação (falta de transferência dentro da data vigente)

Dando um total de R$4.986,00.`,
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
  // Download direto para evitar bloqueio do Chrome em blob URLs
  const filename = type === 'venda' ? 'MODELO_VENDA_VEICULO.pdf' : 'MODELO_COMPRA_VEICULO.pdf';
  doc.save(filename);
}

export function downloadSampleContract(type: 'venda' | 'compra') {
  const doc = generateSampleContractPDF(type);
  doc.save(`MODELO_${type.toUpperCase()}_VEICULO.pdf`);
}
