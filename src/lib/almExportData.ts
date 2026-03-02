// ALM Reference Data - Brands, Models, Colors, Fuels, Transmissions
// Source: vendas.almprocessamentos.com.br API format

export interface ALMMarca {
  id: number;
  nome: string;
  tipo: 'Carro' | 'Moto';
}

export interface ALMModelo {
  id: number;
  nome: string;
  marcaId: number;
}

export interface ALMCor {
  id: number;
  nome: string;
}

export interface ALMCombustivel {
  id: number;
  nome: string;
}

export interface ALMCambio {
  id: number;
  nome: string;
}

export const ALM_MARCAS: ALMMarca[] = [{"id":1,"nome":"CHEVROLET","tipo":"Carro"},{"id":2,"nome":"CITROËN","tipo":"Carro"},{"id":3,"nome":"FIAT","tipo":"Carro"},{"id":4,"nome":"FORD","tipo":"Carro"},{"id":5,"nome":"HONDA","tipo":"Carro"},{"id":6,"nome":"HYUNDAI","tipo":"Carro"},{"id":7,"nome":"MITSUBISHI","tipo":"Carro"},{"id":8,"nome":"NISSAN","tipo":"Carro"},{"id":9,"nome":"PEUGEOT","tipo":"Carro"},{"id":10,"nome":"RENAULT","tipo":"Carro"},{"id":11,"nome":"TOYOTA","tipo":"Carro"},{"id":12,"nome":"VOLKSWAGEN","tipo":"Carro"},{"id":13,"nome":"VOLVO","tipo":"Carro"},{"id":14,"nome":"ACURA","tipo":"Carro"},{"id":15,"nome":"ADAMO","tipo":"Carro"},{"id":16,"nome":"AGRALE","tipo":"Carro"},{"id":17,"nome":"ALFA ROMEO","tipo":"Carro"},{"id":18,"nome":"AMAZONAS","tipo":"Carro"},{"id":19,"nome":"AMERICAR","tipo":"Carro"},{"id":20,"nome":"ASIA","tipo":"Carro"},{"id":21,"nome":"ASTON MARTIN","tipo":"Carro"},{"id":22,"nome":"AUDI","tipo":"Carro"},{"id":23,"nome":"AUSTIN-HEALEY","tipo":"Carro"},{"id":24,"nome":"BAJA","tipo":"Carro"},{"id":25,"nome":"BENTLEY","tipo":"Carro"},{"id":26,"nome":"BMW","tipo":"Carro"},{"id":27,"nome":"BRM","tipo":"Carro"},{"id":28,"nome":"BUGRE","tipo":"Carro"},{"id":29,"nome":"BUGWAY","tipo":"Carro"},{"id":30,"nome":"BUICK","tipo":"Carro"},{"id":31,"nome":"CADILLAC","tipo":"Carro"},{"id":32,"nome":"CBT","tipo":"Carro"},{"id":33,"nome":"CHAMONIX","tipo":"Carro"},{"id":34,"nome":"CHANA","tipo":"Carro"},{"id":35,"nome":"CHERY","tipo":"Carro"},{"id":36,"nome":"CHRYSLER","tipo":"Carro"},{"id":37,"nome":"DACON","tipo":"Carro"},{"id":38,"nome":"DAEWOO","tipo":"Carro"},{"id":39,"nome":"DAIHATSU","tipo":"Carro"},{"id":40,"nome":"DATSUN","tipo":"Carro"},{"id":41,"nome":"DKW-VEMAG","tipo":"Carro"},{"id":42,"nome":"DODGE","tipo":"Carro"},{"id":43,"nome":"EFFA","tipo":"Carro"},{"id":44,"nome":"EMIS","tipo":"Carro"},{"id":45,"nome":"ENGESA","tipo":"Carro"},{"id":46,"nome":"ENVEMO","tipo":"Carro"},{"id":47,"nome":"FERCAR BUGGY","tipo":"Carro"},{"id":48,"nome":"FERRARI","tipo":"Carro"},{"id":49,"nome":"FIBRAVAN","tipo":"Carro"},{"id":50,"nome":"FOTON","tipo":"Carro"},{"id":51,"nome":"FYBER","tipo":"Carro"},{"id":52,"nome":"GEELY","tipo":"Carro"},{"id":53,"nome":"GMC","tipo":"Carro"},{"id":54,"nome":"GURGEL","tipo":"Carro"},{"id":55,"nome":"HAFEI","tipo":"Carro"},{"id":56,"nome":"HUMMER","tipo":"Carro"},{"id":57,"nome":"INFINITI","tipo":"Carro"},{"id":58,"nome":"IVECO","tipo":"Carro"},{"id":59,"nome":"JAC","tipo":"Carro"},{"id":60,"nome":"JAGUAR","tipo":"Carro"},{"id":61,"nome":"JEEP","tipo":"Carro"},{"id":62,"nome":"JINBEI","tipo":"Carro"},{"id":63,"nome":"KIA","tipo":"Carro"},{"id":64,"nome":"LADA","tipo":"Carro"},{"id":65,"nome":"LAMBORGHINI","tipo":"Carro"},{"id":66,"nome":"LAND ROVER","tipo":"Carro"},{"id":67,"nome":"LEXUS","tipo":"Carro"},{"id":68,"nome":"LIFAN","tipo":"Carro"},{"id":69,"nome":"LINCOLN","tipo":"Carro"},{"id":70,"nome":"LOBINI","tipo":"Carro"},{"id":71,"nome":"LOTUS","tipo":"Carro"},{"id":72,"nome":"MAHINDRA","tipo":"Carro"},{"id":73,"nome":"MARCOPOLO","tipo":"Carro"},{"id":74,"nome":"MASERATI","tipo":"Carro"},{"id":75,"nome":"MAZDA","tipo":"Carro"},{"id":76,"nome":"MCLAREN","tipo":"Carro"},{"id":77,"nome":"MERCEDES-BENZ","tipo":"Carro"},{"id":78,"nome":"MERCURY","tipo":"Carro"},{"id":79,"nome":"MG","tipo":"Carro"},{"id":80,"nome":"MINI","tipo":"Carro"},{"id":81,"nome":"MIURA","tipo":"Carro"},{"id":82,"nome":"MOBBY","tipo":"Carro"},{"id":83,"nome":"MORRIS","tipo":"Carro"},{"id":84,"nome":"MP LAFER","tipo":"Carro"},{"id":85,"nome":"MPLM","tipo":"Carro"},{"id":86,"nome":"OLDSMOBILE","tipo":"Carro"},{"id":87,"nome":"OPEL","tipo":"Carro"},{"id":88,"nome":"PACKARD","tipo":"Carro"},{"id":89,"nome":"PAG","tipo":"Carro"},{"id":90,"nome":"PLYMOUTH","tipo":"Carro"},{"id":91,"nome":"PONTIAC","tipo":"Carro"},{"id":92,"nome":"PORSCHE","tipo":"Carro"},{"id":93,"nome":"PUMA","tipo":"Carro"},{"id":94,"nome":"RELY","tipo":"Carro"},{"id":95,"nome":"ROLLS-ROYCE","tipo":"Carro"},{"id":96,"nome":"ROMI","tipo":"Carro"},{"id":97,"nome":"SANTA MATILDE","tipo":"Carro"},{"id":98,"nome":"SATURN","tipo":"Carro"},{"id":99,"nome":"SEAT","tipo":"Carro"},{"id":100,"nome":"SELVAGEM","tipo":"Carro"},{"id":101,"nome":"SHELBY","tipo":"Carro"},{"id":102,"nome":"SHINERAY","tipo":"Carro"},{"id":103,"nome":"SIMCA","tipo":"Carro"},{"id":104,"nome":"SMART","tipo":"Carro"},{"id":105,"nome":"SSANGYONG","tipo":"Carro"},{"id":106,"nome":"STUDEBAKER","tipo":"Carro"},{"id":107,"nome":"SUBARU","tipo":"Carro"},{"id":108,"nome":"SUZUKI","tipo":"Carro"},{"id":109,"nome":"TAC","tipo":"Carro"},{"id":110,"nome":"TESLA","tipo":"Carro"},{"id":111,"nome":"TROLLER","tipo":"Carro"},{"id":112,"nome":"WAKE","tipo":"Carro"},{"id":113,"nome":"WAY BRASIL","tipo":"Carro"},{"id":114,"nome":"WHIPPET","tipo":"Carro"},{"id":115,"nome":"WILLYS","tipo":"Carro"},{"id":116,"nome":"WILLYS OVERLAND","tipo":"Carro"},{"id":117,"nome":"BMW","tipo":"Moto"},{"id":118,"nome":"DAFRA","tipo":"Moto"},{"id":119,"nome":"DUCATI","tipo":"Moto"},{"id":120,"nome":"HARLEY-DAVIDSON","tipo":"Moto"},{"id":121,"nome":"HONDA","tipo":"Moto"},{"id":122,"nome":"KASINSKI","tipo":"Moto"},{"id":123,"nome":"KAWASAKI","tipo":"Moto"},{"id":124,"nome":"SUNDOWN","tipo":"Moto"},{"id":125,"nome":"SUZUKI","tipo":"Moto"},{"id":126,"nome":"YAMAHA","tipo":"Moto"},{"id":127,"nome":"AMAZONAS","tipo":"Moto"},{"id":128,"nome":"AME AMAZONAS","tipo":"Moto"},{"id":129,"nome":"APRILIA","tipo":"Moto"},{"id":130,"nome":"AUGURI","tipo":"Moto"},{"id":131,"nome":"BENELLI","tipo":"Moto"},{"id":132,"nome":"BENZHOU","tipo":"Moto"},{"id":133,"nome":"BIMOTA","tipo":"Moto"},{"id":134,"nome":"BUELL","tipo":"Moto"},{"id":135,"nome":"BULL","tipo":"Moto"},{"id":136,"nome":"BY CRISTO","tipo":"Moto"},{"id":137,"nome":"CAN-AM","tipo":"Moto"},{"id":138,"nome":"FOX","tipo":"Moto"},{"id":139,"nome":"FYM","tipo":"Moto"},{"id":140,"nome":"GARINNI","tipo":"Moto"},{"id":141,"nome":"GREEN","tipo":"Moto"},{"id":142,"nome":"HAOJUE","tipo":"Moto"},{"id":143,"nome":"HUSQVARNA","tipo":"Moto"},{"id":144,"nome":"INDIAN","tipo":"Moto"},{"id":145,"nome":"JAWA","tipo":"Moto"},{"id":146,"nome":"KTM","tipo":"Moto"},{"id":147,"nome":"KYMCO","tipo":"Moto"},{"id":148,"nome":"LAMBRETTA","tipo":"Moto"},{"id":149,"nome":"LINZHI","tipo":"Moto"},{"id":150,"nome":"LON-V","tipo":"Moto"},{"id":151,"nome":"MONTESA","tipo":"Moto"},{"id":152,"nome":"MOTOCAR","tipo":"Moto"},{"id":153,"nome":"MOTORINO","tipo":"Moto"},{"id":154,"nome":"MOTOVI","tipo":"Moto"},{"id":155,"nome":"MV AGUSTA","tipo":"Moto"},{"id":156,"nome":"MVK","tipo":"Moto"},{"id":157,"nome":"PIAGGIO","tipo":"Moto"},{"id":158,"nome":"REGAL RAPTOR","tipo":"Moto"},{"id":159,"nome":"RIGUETE","tipo":"Moto"},{"id":160,"nome":"SHINERAY","tipo":"Moto"},{"id":161,"nome":"TRAXX","tipo":"Moto"},{"id":162,"nome":"TRIUMPH","tipo":"Moto"},{"id":163,"nome":"TRIWAY","tipo":"Moto"},{"id":164,"nome":"YINGANG","tipo":"Moto"},{"id":165,"nome":"ZANELLA","tipo":"Moto"},{"id":166,"nome":"ZHONGYU","tipo":"Moto"},{"id":167,"nome":"BEACH","tipo":"Carro"},{"id":168,"nome":"BIANCO","tipo":"Carro"},{"id":169,"nome":"CAUYPE","tipo":"Carro"},{"id":170,"nome":"CBP","tipo":"Carro"},{"id":171,"nome":"DE SOTO","tipo":"Carro"},{"id":172,"nome":"GLASPAC","tipo":"Carro"},{"id":173,"nome":"INTERNATIONAL","tipo":"Carro"},{"id":174,"nome":"JENSEN","tipo":"Carro"},{"id":175,"nome":"JPX","tipo":"Carro"},{"id":176,"nome":"L AUTOMOBILE","tipo":"Carro"},{"id":177,"nome":"LANDWIND","tipo":"Carro"},{"id":178,"nome":"LHM","tipo":"Carro"},{"id":179,"nome":"MENON","tipo":"Carro"},{"id":180,"nome":"NASH","tipo":"Carro"},{"id":181,"nome":"RDK","tipo":"Carro"},{"id":182,"nome":"REVA-I","tipo":"Carro"},{"id":183,"nome":"VENDETTA","tipo":"Carro"},{"id":184,"nome":"AGRALE","tipo":"Moto"},{"id":185,"nome":"CAGIVA","tipo":"Moto"},{"id":186,"nome":"DAYANG","tipo":"Moto"},{"id":187,"nome":"DAYUN","tipo":"Moto"},{"id":188,"nome":"FUN MOTORS","tipo":"Moto"},{"id":189,"nome":"IROS","tipo":"Moto"},{"id":190,"nome":"JINCHENG","tipo":"Moto"},{"id":191,"nome":"MALAGUTI","tipo":"Moto"},{"id":192,"nome":"MIZA","tipo":"Moto"},{"id":193,"nome":"MOTO GUZZI","tipo":"Moto"},{"id":194,"nome":"MXF","tipo":"Moto"},{"id":195,"nome":"POLARIS","tipo":"Moto"},{"id":196,"nome":"ROYAL ENFIELD","tipo":"Moto"},{"id":197,"nome":"SANYANG","tipo":"Moto"},{"id":198,"nome":"SHERCO","tipo":"Moto"},{"id":199,"nome":"TRICICAR","tipo":"Moto"},{"id":200,"nome":"VESPA","tipo":"Moto"},{"id":201,"nome":"WUYANG","tipo":"Moto"},{"id":202,"nome":"BRASFIBRA","tipo":"Carro"},{"id":203,"nome":"CROSS LANDER","tipo":"Carro"},{"id":204,"nome":"TANGER","tipo":"Carro"},{"id":205,"nome":"LIFAN","tipo":"Moto"}];

export const ALM_CORES: ALMCor[] = [
  {id:1,nome:"Amarelo"},{id:2,nome:"Azul"},{id:3,nome:"Bege"},{id:4,nome:"Bordo"},
  {id:5,nome:"Branco"},{id:6,nome:"Branco Perola"},{id:7,nome:"Bronze"},
  {id:8,nome:"Camuflado"},{id:9,nome:"Champagne"},{id:10,nome:"Chumbo"},
  {id:11,nome:"Cinza"},{id:12,nome:"Dourado"},{id:13,nome:"Grafite"},
  {id:14,nome:"Grena"},{id:15,nome:"Laranja"},{id:16,nome:"Marrom"},
  {id:17,nome:"Prata"},{id:18,nome:"Preto"},{id:19,nome:"Preto Onix"},
  {id:20,nome:"Rosa"},{id:21,nome:"Roxo"},{id:22,nome:"Uva"},
  {id:23,nome:"Verde"},{id:24,nome:"Vermelho"},{id:25,nome:"Vinho"},{id:26,nome:"Outra"}
];

export const ALM_COMBUSTIVEIS: ALMCombustivel[] = [
  {id:1,nome:"Gasolina"},{id:2,nome:"Flex"},{id:3,nome:"Álcool"},{id:4,nome:"GNV"},{id:5,nome:"Diesel"}
];

export const ALM_CAMBIOS: ALMCambio[] = [
  {id:1,nome:"Manual"},{id:2,nome:"Automático"},{id:3,nome:"Semi-Automático"},
  {id:4,nome:"2 Marchas"},{id:5,nome:"3 Marchas"},{id:6,nome:"4 Marchas"},
  {id:7,nome:"5 Marchas"},{id:8,nome:"6 Marchas"},{id:9,nome:"7 Marchas"},{id:10,nome:"8 Marchas"}
];

export const BRAND_MAP: Record<string, string> = {
  'gm': 'CHEVROLET', 'chevrolet': 'CHEVROLET', 'general motors': 'CHEVROLET',
  'volkswagen': 'VOLKSWAGEN', 'vw': 'VOLKSWAGEN',
  'fiat': 'FIAT', 'ford': 'FORD',
  'honda': 'HONDA', 'toyota': 'TOYOTA',
  'hyundai': 'HYUNDAI', 'renault': 'RENAULT',
  'peugeot': 'PEUGEOT', 'citroen': 'CITROËN', 'citroën': 'CITROËN',
  'nissan': 'NISSAN', 'mitsubishi': 'MITSUBISHI',
  'bmw': 'BMW', 'audi': 'AUDI',
  'jeep': 'JEEP', 'kia': 'KIA',
  'land rover': 'LAND ROVER', 'volvo': 'VOLVO',
  'chery': 'CHERY', 'cherry': 'CHERY',
  'dafra': 'DAFRA', 'yamaha': 'YAMAHA',
  'kawasaki': 'KAWASAKI', 'suzuki': 'SUZUKI',
  'mercedes-benz': 'MERCEDES-BENZ', 'mercedes': 'MERCEDES-BENZ', 'mb': 'MERCEDES-BENZ',
  'porsche': 'PORSCHE', 'jaguar': 'JAGUAR', 'ferrari': 'FERRARI',
  'dodge': 'DODGE', 'chrysler': 'CHRYSLER', 'mini': 'MINI',
  'subaru': 'SUBARU', 'lexus': 'LEXUS', 'maserati': 'MASERATI',
  'lamborghini': 'LAMBORGHINI', 'bentley': 'BENTLEY',
  'troller': 'TROLLER', 'jac': 'JAC', 'lifan': 'LIFAN',
  'ssangyong': 'SSANGYONG', 'tesla': 'TESLA',
  'harley davidson': 'HARLEY-DAVIDSON', 'harley': 'HARLEY-DAVIDSON',
  'ducati': 'DUCATI', 'triumph': 'TRIUMPH', 'ktm': 'KTM',
  'shineray': 'SHINERAY', 'haojue': 'HAOJUE',
};

export const COLOR_MAP: Record<string, number> = {
  'branca': 5, 'branco': 5, 'white': 5,
  'branco perola': 6, 'branca perola': 6, 'branco perolizado': 6,
  'preta': 18, 'preto': 18, 'black': 18,
  'preto onix': 19,
  'cinza': 11, 'cinza claro': 11, 'grey': 11, 'gray': 11,
  'cinza escuro': 13, 'cinza-escuro': 13, 'grafite': 13,
  'prata': 17, 'prata metalico': 17, 'silver': 17,
  'azul': 2, 'azul escuro': 2, 'azul claro': 2, 'azul metalico': 2, 'blue': 2,
  'vermelho': 24, 'vermelha': 24, 'red': 24, 'vermelho metalico': 24,
  'verde': 23, 'verde escuro': 23, 'verde claro': 23, 'green': 23,
  'amarelo': 1, 'amarela': 1, 'yellow': 1,
  'marrom': 16, 'brown': 16, 'terra': 16,
  'bege': 3, 'beige': 3,
  'laranja': 15, 'orange': 15,
  'bordo': 4,
  'roxo': 21, 'purple': 21,
  'rosa': 20, 'pink': 20,
  'vinho': 25,
  'dourado': 12, 'dourada': 12, 'gold': 12, 'ouro': 12,
  'bronze': 7,
  'champagne': 9, 'champanhe': 9,
  'chumbo': 10,
  'grena': 14,
  'uva': 22,
  'camuflado': 8,
};

export const FUEL_MAP: Record<string, number> = {
  'gasolina': 1,
  'flex': 2,
  'alcool': 3, 'etanol': 3,
  'gasolina e alcool': 2, 'gasolina e etanol': 2, 'gasolina/alcool': 2, 'gasolina/etanol': 2,
  'gnv': 4,
  'diesel': 5,
  'eletrico': 6,
  'hibrido': 2,
};

export const CAMBIO_MAP: Record<string, number> = {
  'manual': 1,
  'automatico': 2, 'automatica': 2, 'at': 2,
  'semi automatico': 3, 'automatizado': 3,
  'cvt': 3,
};

export const TYPE_MAP: Record<string, string> = {
  'carro': 'Carro',
  'moto': 'Moto',
  'caminhonete': 'Carro',
  'van': 'Carro',
};
