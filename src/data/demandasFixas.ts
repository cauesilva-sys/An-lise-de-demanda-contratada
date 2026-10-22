/**
 * Dicionário / Mapa estático de Demanda Contratada (kW) por Usina
 * Fornecido oficialmente pela planilha de contratos
 */
export const DEMANDAS_FIXAS: Record<string, number> = {
  "Presidente Alves": 3500,
  "Canas": 2700,
  "Bom Jesus da Lapa": 1000,
  "Oliveira dos Brejinhos": 5000,
  "Salto de Pirapora I": 1000,
  "Salto de Pirapora II": 1000,
  "Salto de Pirapora III": 1000,
  "Salto de Pirapora IV": 750,
  "Niquelândia UFV01": 1000,
  "Niquelândia UFV02": 1000,
  "Niquelândia UFV03": 625,
  "Andradina I": 960,
  "Andradina II": 960,
  "Guarantã I": 960,
  "Guarantã II": 960,
  "Guarantã III": 960,
  "Guarantã IV": 960,
  "Guarantã V": 350,
  "Pirangi III": 1000,
  "Pirangi IV": 1000,
  "Tapera I": 1000,
  "Apodi": 700,
  "São João do Rio do Peixe I": 700,
  "São João do Rio do Peixe I:": 700,
  "Taubaté": 875,
  "São José do Cedro I": 875,
  "São José do Cedro II": 875,
  "Alegrete": 1080,
  "Alegrete:": 1080,
  "São Lourenço do Sul": 700,
  "Guarda Mor I": 2500,
  "Guarda Mor II": 2500,
  "Guarda Mor III": 2500,
  "Ibiá I": 2500,
  "Ibiá II": 2500,
  "Iraí de Minas I": 2500,
  "Iraí de Minas II": 2500,
  "Frutal": 2500,
  "Nova Ponte": 2500,
  "Macaubal I": 640,
  "Macaubal II": 200,
  "Pirangi I": 960,
  "Pirangi I:": 960,
  "Pirangi II": 350,
  "Pirangi II:": 350,
  "Ibiá III": 2500,
  "Uruguaiana I": 5000,
  "Alegrete II": 2500,
  "Quarai": 2500,
  "Uruguaiana II": 2500,
  "Barra do Quarai": 2500,
  "Uruguaiana IV": 2500,
  "São Borja I": 2500,
  "São Borja II": 2500,
  "Araçuaí": 2500,
  "Ibotirama": 875,
  "Sítio do Mato": 875,
  "São Mateus I": 750,
  "São Mateus II": 625,
  "Cachoeira Paulista": 875,
  "Pindamonhangaba": 875,
  "Estância UFV01": 1000,
  "Estância UFV02": 1000,
  "Estância UFV03": 1000,
  "Estância UFV04": 1000,
  "Horizonte I": 1000,
  "Horizonte II": 1000,
  "Tapera II": 1000,
  "Tapera III": 1000,
  "Niquelândia UFV04": 500,
  "Leopoldo de Bulhões UFV01": 1000,
  "Leopoldo de Bulhões UFV01:": 1000,
  "Leopoldo de Bulhões UFV02": 500,
  "Presidente Epitácio": 1000,
  "Rio das Pedras - UFV 01": 1000,
  "Rio das Pedras - UFV 02": 1000,
  "Rio das Pedras - UFV 03": 1000,
  "Rio das Pedras - UFV 04": 1000,
  "Barra do Arará - UFV01": 1000,
  "Barra do Arará - UFV02": 1000,
  "Barretos": 5000,
  "Neves Paulista": 1000,
  "Ituverava I": 2000,
  "Ituverava II": 1000,
  "São João do Rio do Peixe II": 2400,
  "Luis Eduardo Magalhaes I - UFV01": 1000,
  "Luis Eduardo Magalhaes I - UFV02": 1000,
  "Luis Eduardo Magalhaes I - UFV03": 500,
  "Santa Albertina - UFV01": 1000,
  "Santa Albertina - UFV02": 1000,
  "Santa Albertina - UFV03": 1000,
  "Brasília": 1000,
  "Irecê UFV01": 1000,
  "Irecê UFV02": 1000,
  "Irecê UFV03": 1000,
  "Irecê UFV04": 1000,
  "Irecê UFV05": 1000,
  "Campestre I": 1000,
  "Campestre II": 1000,
  "Campestre III": 1000,
  "Campestre IV": 1000,
  "Caracará A I": 1000,
  "Caracará A II": 1000,
  "Caracará A III": 400,
  "Mae do Rio I": 1000,
  "Mae do Rio II": 1000,
  "Mae do Rio III": 1000,
  "Mae do Rio IV": 1000,
  "São Bento do Una I": 1000,
  "São Bento do Una II": 1000,
  "São Bento do Una III": 1000,
  "São Bento do Una IV": 1000,
  "Panorama - UFV01": 1000,
  "Panorama - UFV02": 1000,
  "Panorama - UFV03": 500,
  "Várzea da Palma I": 700,
  "Várzea da Palma I:": 700,
  "Várzea da Palma II - UFV01": 960,
  "Várzea da Palma II - UFV02": 960,
  "Várzea da Palma II - UFV03": 960,
  "Várzea da Palma II - UFV04": 960,
  "Várzea da Palma II - UFV05": 420,
  "Buritizeiro - UFV01": 960,
  "Buritizeiro - UFV02": 960,
  "Buritizeiro - UFV03": 960,
  "Buritizeiro - UFV04": 960,
  "Buritizeiro - UFV05": 480,
  "Luis Eduardo Magalhaes II - UFV04": 1000,
  "Luis Eduardo Magalhaes II - UFV05": 1000,
  "Luis Eduardo Magalhaes II - UFV06": 500,
  "Aliança - UFV 01": 1000,
  "Aliança - UFV 02": 1000,
};

/**
 * Normaliza o nome da usina para busca robusta no mapa de demandas fixas.
 * Trata variações como:
 * - "Solar Field Alegrete II: Active Power" -> "Alegrete II"
 * - "Solar Field Presidente Alves" -> "Presidente Alves"
 * - "Alegrete:" -> "Alegrete"
 * - Espaços múltiplos, traços e dois pontos
 */
function normalizeName(name: string): string {
  return name
    .replace(/^"+|"+$/g, '')
    .replace(/: Active Power$/i, '')
    .replace(/^Solar Field\s+/i, '')
    .replace(/:\s*$/, '')
    .trim()
    .toLowerCase();
}

// Cria índice normalizado em tempo de carregamento
const NORMALIZED_DEMANDAS_MAP: Record<string, number> = {};
for (const [key, val] of Object.entries(DEMANDAS_FIXAS)) {
  if (typeof val === 'number' && !isNaN(val)) {
    NORMALIZED_DEMANDAS_MAP[normalizeName(key)] = val;
    NORMALIZED_DEMANDAS_MAP[key.trim().toLowerCase()] = val;
  }
}

/**
 * Busca a Demanda Contratada fixa de uma usina.
 * Retorna o valor fixado ou null se não encontrado no mapa.
 */
export function getDemandaFixa(rawName: string): number | null {
  if (!rawName) return null;
  const clean = rawName.trim();

  // 1. Busca direta na chave exata
  if (DEMANDAS_FIXAS[clean] !== undefined && DEMANDAS_FIXAS[clean] > 0) {
    return DEMANDAS_FIXAS[clean];
  }

  // 2. Busca sem prefixo "Solar Field"
  const withoutSolar = clean.replace(/^Solar Field\s+/i, '').replace(/:\s*$/, '').trim();
  if (DEMANDAS_FIXAS[withoutSolar] !== undefined && DEMANDAS_FIXAS[withoutSolar] > 0) {
    return DEMANDAS_FIXAS[withoutSolar];
  }

  // 3. Busca no mapa normalizado em minúsculas
  const norm = normalizeName(clean);
  if (NORMALIZED_DEMANDAS_MAP[norm] !== undefined && NORMALIZED_DEMANDAS_MAP[norm] > 0) {
    return NORMALIZED_DEMANDAS_MAP[norm];
  }

  // 4. Busca por aproximação de substring
  for (const [key, val] of Object.entries(DEMANDAS_FIXAS)) {
    if (typeof val === 'number' && val > 0) {
      const normKey = normalizeName(key);
      if (norm === normKey || norm.includes(normKey) || normKey.includes(norm)) {
        return val;
      }
    }
  }

  return null;
}
