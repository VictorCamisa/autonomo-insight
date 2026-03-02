
# Exportar Estoque para ALM

## Objetivo
Adicionar um botao "Exportar ALM" na pagina de Estoque que abre uma tela completa de exportacao, replicando toda a logica do HTML fornecido para mapear veiculos do sistema para o formato da API ALM (vendas.almprocessamentos.com.br).

## O que sera criado

### 1. Novo arquivo: `src/lib/almExportData.ts`
Contem todos os dados de referencia do ALM que estao hardcoded no HTML:
- `ALM_MARCAS` - Lista de marcas com IDs e tipo (Carro/Moto)
- `ALM_MODELOS` - Lista de modelos vinculados a marcas
- `ALM_CORES` - Cores com IDs
- `ALM_COMBUSTIVEIS` - Combustiveis com IDs
- `ALM_CAMBIOS` - Cambios com IDs
- `BRAND_MAP` - Mapeamento de nomes do sistema para nomes ALM
- `COLOR_MAP` - Mapeamento de cores para IDs ALM
- `FUEL_MAP` - Mapeamento de combustiveis
- `CAMBIO_MAP` - Mapeamento de cambios
- `TYPE_MAP` - Mapeamento de tipos

### 2. Novo arquivo: `src/lib/almExportUtils.ts`
Funcoes de matching e construcao de payload:
- `normStr()` - Normalizacao de strings (lowercase, remove acentos, etc.)
- `matchBrand()` - Encontra marca ALM correspondente
- `matchModel()` - Encontra modelo ALM correspondente
- `matchColor()` - Encontra cor ALM correspondente
- `matchFuel()` - Encontra combustivel ALM correspondente
- `matchCambio()` - Encontra cambio ALM correspondente
- `mapVehicle()` - Mapeia veiculo completo para formato ALM, retornando match level (ok/warn/err)
- `buildPayload()` - Constroi o objeto final para exportacao
- `generateJSON()` / `generateXML()` / `exportCSV()` - Funcoes de download dos arquivos

### 3. Novo arquivo: `src/components/inventory/ALMExportPage.tsx`
Pagina completa de exportacao com:
- **Header** com titulo e contagem de veiculos
- **Barra de filtros** - Status (todos/disponiveis/vendidos), nivel de match (ok/warn/err), busca por texto
- **Stats** - Contadores de prontos, atencao, problema (com dots coloridos)
- **Painel de mapeamento** - Grid mostrando campos nao mapeados com selects para correcao manual (marcas, cores nao reconhecidas)
- **Tabela principal** - Todas as colunas do HTML: foto, tipo, marca (sistema -> ALM), modelo (sistema -> ALM), versao, placa, ano/mod, km, cor -> ALM ID, combustivel -> ALM ID, cambio -> ALM ID, preco, status, match
- **Barra de exportacao** - Botoes para Gerar JSON, Gerar XML, Pre-visualizar, Gerar CSV, com checkbox "incluir veiculos com atencao"
- **Modal de preview** - Mostra JSON formatado dos primeiros 3 veiculos com botao de download

### 4. Nova rota em `src/App.tsx`
- Rota `/estoque/exportar-alm` apontando para `ALMExportPage`

### 5. Botao na pagina de Estoque (`src/pages/Inventory.tsx`)
- Adicionar botao "Exportar ALM" na area de acoes do gerente, ao lado dos botoes existentes (Mercado Livre, Importar XML, etc.)
- Navega para `/estoque/exportar-alm`

## Detalhes Tecnicos

### Dados
- Os veiculos serao carregados do hook `useVehicles()` (dados reais do Supabase)
- Os dados de referencia ALM (marcas, modelos, cores) ficam como constantes no codigo (exatamente como no HTML)
- O mapeamento manual (overrides) sera armazenado em state local (useState)

### Exportacao
- JSON: Blob download com `application/json`
- XML: Construcao manual de XML string com escape de caracteres especiais
- CSV: Separador `;`, headers das chaves do payload

### UI
- Tabela com cores de status: verde (ok), amarelo (warn), vermelho (err)
- Selects inline na tabela para correcao manual de modelos nao encontrados
- Badges de tipo (Carro azul, Moto roxo)
- Thumbnails das fotos na tabela
- Responsivo com Tailwind, usando componentes UI existentes (Table, Badge, Button, Select, Dialog)

### Fluxo
1. Usuario clica "Exportar ALM" no estoque
2. Abre pagina com todos os veiculos ja mapeados automaticamente
3. Veiculos com problemas aparecem destacados para correcao manual
4. Usuario ajusta mapeamentos se necessario
5. Clica em Gerar JSON/XML/CSV para baixar o arquivo
