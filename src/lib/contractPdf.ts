import { Contract } from '@/hooks/useContracts';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Brand colors
const BRAND_RED = { r: 229, g: 57, b: 53 }; // #E53935
const BRAND_BLACK = { r: 26, g: 26, b: 26 };
const BRAND_GRAY = { r: 100, g: 100, b: 100 };
const BRAND_LIGHT_GRAY = { r: 200, g: 200, b: 200 };

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const currencyToWords = (value: number): string => {
  const formatted = formatCurrency(value);
  return `(${formatted})`;
};

// Add header with branding
function addHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Top red line
  doc.setDrawColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.setLineWidth(3);
  doc.line(0, 0, pageWidth, 0);
  
  // Secondary thin red line
  doc.setLineWidth(0.5);
  doc.line(margin, 8, pageWidth - margin, 8);

  // Company name as logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.text('MATHEUS', margin, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('VEÍCULOS', margin + 48, 22);

  // Contact info on right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('(12) 3622-7375', pageWidth - margin, 14, { align: 'right' });
  doc.text('(12) 97405-2576', pageWidth - margin, 19, { align: 'right' });
  doc.text('(12) 99668-1249', pageWidth - margin, 24, { align: 'right' });

  // Red decorative line under header
  doc.setDrawColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.setLineWidth(1.5);
  doc.line(margin, 30, pageWidth - margin, 30);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  doc.text(title, pageWidth / 2, 42, { align: 'center' });

  return 50; // Return starting Y position after header
}

// Add watermark
function addWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(60);
  doc.setTextColor(240, 240, 240); // Very light gray
  
  // Diagonal watermark
  doc.text('MATHEUS VEÍCULOS', pageWidth / 2, pageHeight / 2, { 
    align: 'center',
    angle: 45
  });
}

// Add footer
function addFooter(doc: jsPDF, pageNum: number = 1) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Footer line
  doc.setDrawColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('Av. Major Joaquim Monteiro Patto, 25 - Chácara do Visconde, Taubaté-SP | CEP 12050-620', pageWidth / 2, pageHeight - 14, { align: 'center' });
  doc.text('CNPJ: 06.334.716/0001-01 | M DE A PEREIRA VEÍCULOS ME', pageWidth / 2, pageHeight - 9, { align: 'center' });

  // Page number
  doc.setFontSize(8);
  doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
}

// Section header with red accent
function addSectionHeader(doc: jsPDF, text: string, y: number, margin: number) {
  doc.setDrawColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.setLineWidth(2);
  doc.line(margin, y - 2, margin + 3, y - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.text(text, margin + 6, y);
  
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  return y + 6;
}

export function generateSaleContractPDF(contract: Contract) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Add watermark first (so it's behind content)
  addWatermark(doc);

  // Add header
  let y = addHeader(doc, 'CONTRATO DE VENDA DE VEÍCULO');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);

  // Seller info
  y = addSectionHeader(doc, 'VENDEDOR', y, margin);
  doc.setFont('helvetica', 'normal');
  const sellerText = 'M DE A PEREIRA VEICULOS ME, inscrita no CNPJ sob n° 06.334.716.0001-01, com sede na Avenida Major Joaquim Monteiro Patto, 25, Chácara do Visconde, Taubaté-SP, CEP 12050-620, Telefones: 12 3622-7375, 12 97405-2576 E 12 99668-1249';
  const sellerLines = doc.splitTextToSize(sellerText, contentWidth);
  doc.text(sellerLines, margin, y);
  y += sellerLines.length * 4 + 6;

  // Buyer info
  y = addSectionHeader(doc, 'COMPRADOR', y, margin);
  doc.setFont('helvetica', 'normal');
  const buyerText = `${contract.customer_name.toUpperCase()}, ${(contract.customer_nationality || 'BRASILEIRO(A)').toUpperCase()}, ${(contract.customer_profession || '').toUpperCase()}, ${(contract.customer_marital_status || '').toUpperCase()}, RG n° ${contract.customer_rg || '___________'}, CPF n° ${contract.customer_cpf || '___________'}, nascido em ${contract.customer_birth_date ? format(new Date(contract.customer_birth_date), 'dd/MM/yyyy') : '___/___/______'}, residente na ${contract.customer_address?.toUpperCase() || '___________'}, ${contract.customer_city?.toUpperCase() || '___________'}-${contract.customer_state?.toUpperCase() || '___'}, CEP ${contract.customer_zip || '___________'}, telefone ${contract.customer_phone || '___________'}. E-mail: ${contract.customer_email?.toUpperCase() || '___________'}`;
  const buyerLines = doc.splitTextToSize(buyerText, contentWidth);
  doc.text(buyerLines, margin, y);
  y += buyerLines.length * 4 + 6;

  // Purpose
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const purposeText = 'O presente instrumento particular entabulado entre as partes supramencionadas, tem como finalidade a venda do veículo:';
  doc.text(purposeText, margin, y);
  y += 8;

  // Vehicle info with box
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  y = addSectionHeader(doc, 'OBJETO', y, margin);
  
  // Vehicle box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(BRAND_LIGHT_GRAY.r, BRAND_LIGHT_GRAY.g, BRAND_LIGHT_GRAY.b);
  doc.roundedRect(margin, y - 3, contentWidth, 14, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const vehicleText = `${contract.vehicle_brand.toUpperCase()} ${contract.vehicle_model.toUpperCase()}, ${contract.vehicle_year}, Placa: ${contract.vehicle_plate?.toUpperCase() || '___'}, Cor: ${contract.vehicle_color?.toUpperCase() || '___'}, RENAVAM: ${contract.vehicle_renavam || '___'}`;
  doc.text(vehicleText, margin + 4, y + 5);
  y += 18;

  // Payment section
  doc.setFontSize(9);
  y = addSectionHeader(doc, 'FORMA DE PAGAMENTO', y, margin);
  doc.setFont('helvetica', 'normal');

  const negotiationFromNotes = contract.notes?.includes('NEGOCIAÇÃO:') 
    ? contract.notes.split('NEGOCIAÇÃO:')[1]?.split('\n\n')[0]?.trim()
    : null;

  if (negotiationFromNotes) {
    const lines = negotiationFromNotes.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('Vendido pelo valor')) {
        const lineText = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') ? trimmedLine : `• ${trimmedLine}`;
        const wrappedLines = doc.splitTextToSize(lineText, contentWidth - 5);
        doc.text(wrappedLines, margin + 3, y);
        y += wrappedLines.length * 4 + 1;
      }
    });
    y += 3;
  } else {
    if (contract.down_payment && contract.down_payment > 0) {
      doc.text(`• Entrada: ${formatCurrency(contract.down_payment)}`, margin + 3, y);
      y += 5;
    }
    if (contract.trade_in_brand) {
      const tradeInText = `• Veículo como entrada: ${contract.trade_in_brand} ${contract.trade_in_model || ''} ${contract.trade_in_year || ''}, Placa: ${contract.trade_in_plate || '___'}, avaliado em ${formatCurrency(contract.trade_in_value || 0)}`;
      const tradeInLines = doc.splitTextToSize(tradeInText, contentWidth - 5);
      doc.text(tradeInLines, margin + 3, y);
      y += tradeInLines.length * 4 + 1;
    }
    if (contract.installments_count && contract.installments_count > 0) {
      doc.text(`• Financiamento: ${formatCurrency((contract.installment_value || 0) * contract.installments_count)} em ${contract.installments_count}x de ${formatCurrency(contract.installment_value || 0)}`, margin + 3, y);
      y += 5;
    }
    y += 3;
  }

  // Warranty section
  y = addSectionHeader(doc, 'GARANTIA', y, margin);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const warranties = [
    'O COMPRADOR adquire o veículo do VENDEDOR no estado em que ele se encontra, atestando ter vistoriado e garantido que o veículo atendeu suas exigências.',
    'O veículo não possui garantia de componentes elétricos, eletrônicos e eletromecânicos (módulos, sensores, alternador, motor de partida, lâmpadas, faróis, lanternas, chicotes e alarmes), pois encontram-se em perfeito estado no ato da compra. Acabamento (estofamentos, forrações, pintura) e pneus não estão cobertos pela garantia.',
    'Nos termos do Art. 26, II, do CDC, o COMPRADOR tem 90 dias, a partir da tradição do bem, para apresentar reclamação por vícios no veículo. O veículo deve ser apresentado ao estabelecimento comercial para reparo.',
    'Durante o período de reparo (máximo 30 dias), o VENDEDOR não se obriga a disponibilizar carro reserva.',
    'O COMPRADOR perderá a garantia caso o veículo tenha sido usado de forma inadequada, imprudente, negligente, danificado por acidente ou reparado em oficina diversa sem prévia comunicação.'
  ];

  warranties.forEach(warranty => {
    const lines = doc.splitTextToSize(`• ${warranty}`, contentWidth - 5);
    doc.text(lines, margin + 3, y);
    y += lines.length * 3.5 + 2;
  });

  // Check for new page
  if (y > 250) {
    addFooter(doc, 1);
    doc.addPage();
    addWatermark(doc);
    y = 20;
  }

  // Final clause
  y += 3;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const finalText = 'Por fim, nos termos do Artigo 784, III, do CPC, as partes firmam o presente contrato por livre e espontânea vontade. Elegendo, para dirimirem qualquer dúvida, o foro de Taubaté-SP.';
  const finalLines = doc.splitTextToSize(finalText, contentWidth);
  doc.text(finalLines, margin, y);
  y += finalLines.length * 4 + 8;

  // Date with decorative element
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  doc.setFont('helvetica', 'italic');
  doc.text(`Taubaté, ${today}`, margin, y);
  y += 15;

  // Signatures with styled lines
  const signatureY = y + 10;
  doc.setDrawColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  doc.setLineWidth(0.5);
  
  // Left signature
  doc.line(margin, signatureY, margin + 75, signatureY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('M DE A PEREIRA VEICULOS ME', margin, signatureY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('VENDEDOR', margin, signatureY + 10);
  
  // Right signature
  doc.line(pageWidth - margin - 75, signatureY, pageWidth - margin, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  doc.text(contract.customer_name.toUpperCase().substring(0, 35), pageWidth - margin - 75, signatureY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('COMPRADOR', pageWidth - margin - 75, signatureY + 10);

  addFooter(doc, 1);

  return doc;
}

export function generatePurchaseContractPDF(contract: Contract) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  addWatermark(doc);
  let y = addHeader(doc, 'CONTRATO DE COMPRA DE VEÍCULO');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);

  // Buyer info (Company)
  y = addSectionHeader(doc, 'COMPRADOR (LOJA)', y, margin);
  const buyerText = 'M DE A PEREIRA VEICULOS ME, inscrita no CNPJ sob n° 06.334.716.0001-01, com sede na Avenida Major Joaquim Monteiro Patto, 25, Chácara do Visconde, Taubaté-SP, CEP 12050-620.';
  const buyerLines = doc.splitTextToSize(buyerText, contentWidth);
  doc.text(buyerLines, margin, y);
  y += buyerLines.length * 4 + 6;

  // Seller info (Client)
  y = addSectionHeader(doc, 'VENDEDOR', y, margin);
  const sellerText = `${contract.customer_name.toUpperCase()}, ${(contract.customer_nationality || 'brasileiro(a)').toUpperCase()}, ${(contract.customer_profession || '').toUpperCase()}, ${(contract.customer_marital_status || '').toUpperCase()}, RG n° ${contract.customer_rg || '___________'}, CPF n° ${contract.customer_cpf || '___________'}, nascido em ${contract.customer_birth_date ? format(new Date(contract.customer_birth_date), 'dd/MM/yyyy') : '___/___/______'}, residente na ${contract.customer_address?.toUpperCase() || '___________'}, ${contract.customer_city?.toUpperCase() || '___________'}-${contract.customer_state?.toUpperCase() || '___'}, telefone ${contract.customer_phone || '___________'}`;
  const sellerLines = doc.splitTextToSize(sellerText, contentWidth);
  doc.text(sellerLines, margin, y);
  y += sellerLines.length * 4 + 6;

  // Purpose
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const purposeText = 'O presente instrumento particular entabulado entre as partes supramencionadas, tem como finalidade a compra do veículo:';
  doc.text(purposeText, margin, y);
  y += 8;

  // Vehicle box
  doc.setFontSize(9);
  y = addSectionHeader(doc, 'OBJETO', y, margin);
  
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(BRAND_LIGHT_GRAY.r, BRAND_LIGHT_GRAY.g, BRAND_LIGHT_GRAY.b);
  doc.roundedRect(margin, y - 3, contentWidth, 14, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  const vehicleText = `${contract.vehicle_brand.toUpperCase()} ${contract.vehicle_model.toUpperCase()}, ${contract.vehicle_year}, Placa: ${contract.vehicle_plate?.toUpperCase() || '___'}, Cor: ${contract.vehicle_color?.toUpperCase() || '___'}, RENAVAM: ${contract.vehicle_renavam || '___'}`;
  doc.text(vehicleText, margin + 4, y + 5);
  y += 18;

  // Negotiation section
  doc.setFontSize(9);
  y = addSectionHeader(doc, 'NEGOCIAÇÃO', y, margin);
  doc.setFont('helvetica', 'normal');
  
  const negotiationIntro = `Comprado pelo valor de ${formatCurrency(contract.vehicle_value)} ${currencyToWords(contract.vehicle_value)}`;
  doc.text(negotiationIntro, margin, y);
  y += 6;

  if (contract.notes) {
    const notesLines = doc.splitTextToSize(contract.notes, contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 4;
  } else if (contract.down_payment && contract.down_payment > 0) {
    doc.text(`• Pagamento: ${formatCurrency(contract.down_payment)}`, margin, y);
    y += 6;
  }
  y += 4;

  // Commitment clauses
  doc.setFontSize(8);
  const commitments = [
    'No ato da assinatura do presente instrumento o VENDEDOR compromete-se a entregar o veículo ao COMPRADOR livre e desimpedido de qualquer débito, como multas, bloqueios judiciais bem como outras taxas que possam recair.',
    'Realizada a tradição do bem, assim como definido entre as partes, quaisquer débitos que surgirem após essa data, serão única e exclusivamente de responsabilidade do VENDEDOR.'
  ];

  commitments.forEach(text => {
    const lines = doc.splitTextToSize(`• ${text}`, contentWidth - 5);
    doc.text(lines, margin + 3, y);
    y += lines.length * 3.5 + 3;
  });

  // Final clause
  y += 5;
  doc.setFontSize(9);
  const finalText = 'Por fim, nos termos do Artigo 784, III, do CPC, as partes firmam o presente contrato por livre e espontânea vontade, exarando suas assinaturas em conjunto com duas testemunhas. Elegendo, para dirimirem qualquer dúvida, o foro de Taubaté-SP.';
  const finalLines = doc.splitTextToSize(finalText, contentWidth);
  doc.text(finalLines, margin, y);
  y += finalLines.length * 4 + 8;

  // Date
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  doc.setFont('helvetica', 'italic');
  doc.text(`Taubaté, ${today}`, margin, y);
  y += 15;

  // Signatures
  const signatureY = y + 10;
  doc.setDrawColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  doc.setLineWidth(0.5);
  
  doc.line(margin, signatureY, margin + 75, signatureY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  doc.text('M DE A PEREIRA VEICULOS ME', margin, signatureY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('COMPRADOR', margin, signatureY + 10);
  
  doc.line(pageWidth - margin - 75, signatureY, pageWidth - margin, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_BLACK.r, BRAND_BLACK.g, BRAND_BLACK.b);
  doc.text(contract.customer_name.toUpperCase().substring(0, 35), pageWidth - margin - 75, signatureY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text('VENDEDOR', pageWidth - margin - 75, signatureY + 10);

  addFooter(doc, 1);

  return doc;
}

export function downloadContractPDF(contract: Contract) {
  const doc = contract.contract_type === 'venda' 
    ? generateSaleContractPDF(contract)
    : generatePurchaseContractPDF(contract);
  
  doc.save(`${contract.contract_number}.pdf`);
}

// Sample contracts for preview
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
  customer_name: 'Debora Cristina Pereira',
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
  notes: `• R$8.000,00 no cartão de crédito em 3x de R$2.970,00
• R$4.882,00 via PIX na conta da loja (BRADESCO)
• R$104,00 referente a multa por averbação
Total: R$12.986,00`,
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
  const filename = type === 'venda' ? 'MODELO_VENDA_VEICULO.pdf' : 'MODELO_COMPRA_VEICULO.pdf';
  doc.save(filename);
}

export function downloadSampleContract(type: 'venda' | 'compra') {
  const doc = generateSampleContractPDF(type);
  doc.save(`MODELO_${type.toUpperCase()}_VEICULO.pdf`);
}
