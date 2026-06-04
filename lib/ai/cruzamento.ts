import type { ValidacaoIA, ResultadoCNH, ResultadoComprovante, ResultadoSelfie, ResultadoVideoApp, ResultadoVideoVeiculo, ResultadoBiometria } from '@/types/documentos';

export function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, (_, i) =>
    Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      matrix[i][j] =
        s1[i - 1] === s2[j - 1]
          ? matrix[i - 1][j - 1]
          : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }

  const distancia = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return Math.round(((maxLen - distancia) / maxLen) * 100);
}

function normalizarEndereco(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DadosCadastro {
  nomeCompleto: string;
  cpf: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estadoUF: string;
  cep: string;
}

interface ResultadosTodos {
  cnh?: { dadosExtraidos: ResultadoCNH };
  comprovante?: { dadosExtraidos: ResultadoComprovante };
  selfie?: { dadosExtraidos: ResultadoSelfie };
  videoApp?: { dadosExtraidos: ResultadoVideoApp };
  videoVeiculo?: { dadosExtraidos: ResultadoVideoVeiculo };
  biometria?: { dadosExtraidos: ResultadoBiometria };
}

export function cruzarDados(resultados: ResultadosTodos, cadastro: DadosCadastro): ValidacaoIA {
  const cnh = resultados.cnh?.dadosExtraidos;
  const comp = resultados.comprovante?.dadosExtraidos;
  const selfie = resultados.selfie?.dadosExtraidos;
  const videoApp = resultados.videoApp?.dadosExtraidos;
  const biometria = resultados.biometria?.dadosExtraidos;

  // Nome do cadastro confere com CNH (Levenshtein >= 85)
  let nomeCadastroConfere: boolean | null = null;
  if (cnh?.nome) {
    const sim = calcularSimilaridade(cnh.nome, cadastro.nomeCompleto);
    nomeCadastroConfere = sim >= 85;
    console.log(`[cruzamento] nome cadastro="${cadastro.nomeCompleto}" vs CNH="${cnh.nome}" → ${sim}%`);
  }

  // Nome confere: CNH vs perfil do app (Levenshtein >= 85)
  let nomeConfere: boolean | null = null;
  if (cnh?.nome && videoApp?.nomePerfil) {
    const sim = calcularSimilaridade(cnh.nome, videoApp.nomePerfil);
    nomeConfere = sim >= 85;
    console.log(`[cruzamento] nome CNH="${cnh.nome}" vs app="${videoApp.nomePerfil}" → ${sim}%`);
  }

  // CPF confere: CNH vs cadastro (igualdade exata, ignorando formatação)
  let cpfConfere: boolean | null = null;
  if (cnh?.cpf) {
    const cpfCNH = cnh.cpf.replace(/\D/g, '');
    const cpfCad = cadastro.cpf.replace(/\D/g, '');
    cpfConfere = cpfCNH === cpfCad;
    console.log(`[cruzamento] CPF cadastro="${cpfCad}" vs CNH="${cpfCNH}" → ${cpfConfere ? 'OK' : 'DIVERGENTE'}`);
  }

  // Endereço confere: comprovante vs cadastro
  let enderecoConfere: boolean | null = null;
  if (comp) {
    const checks: boolean[] = [];

    if (comp.logradouro) {
      checks.push(calcularSimilaridade(comp.logradouro, cadastro.logradouro) >= 80);
    }
    if (comp.numero) {
      checks.push(normalizarEndereco(comp.numero) === normalizarEndereco(cadastro.numero));
    }
    if (comp.bairro && cadastro.bairro) {
      checks.push(calcularSimilaridade(comp.bairro, cadastro.bairro) >= 80);
    }
    if (comp.cidade) {
      checks.push(calcularSimilaridade(comp.cidade, cadastro.cidade) >= 85);
    }
    if (comp.estadoUF) {
      checks.push(comp.estadoUF.toUpperCase() === cadastro.estadoUF.toUpperCase());
    }
    if (comp.cep && cadastro.cep) {
      checks.push(comp.cep.replace(/\D/g, '') === cadastro.cep.replace(/\D/g, ''));
    }

    const acertos = checks.filter(Boolean).length;
    enderecoConfere = checks.length > 0 && acertos >= Math.ceil(checks.length * 0.7);

    console.log(`[cruzamento] endereço: ${acertos}/${checks.length} campos conferem → ${enderecoConfere ? 'OK' : 'DIVERGENTE'}`);
    console.log(`[cruzamento] comprovante: log="${comp.logradouro}" n="${comp.numero}" bairro="${comp.bairro}" cidade="${comp.cidade}" uf="${comp.estadoUF}" cep="${comp.cep}"`);
    console.log(`[cruzamento] cadastro:    log="${cadastro.logradouro}" n="${cadastro.numero}" bairro="${cadastro.bairro}" cidade="${cadastro.cidade}" uf="${cadastro.estadoUF}" cep="${cadastro.cep}"`);
  }

  // Placa confere: selfie × vídeo do app
  let placaConfere: boolean | null = null;
  const placas = [selfie?.placa, videoApp?.placa]
    .filter(Boolean)
    .map((p) => p!.replace(/\s/g, '').toUpperCase());

  if (placas.length >= 2) {
    const contagem = new Map<string, number>();
    for (const p of placas) contagem.set(p, (contagem.get(p) ?? 0) + 1);
    placaConfere = Array.from(contagem.values()).some((v) => v >= 2);
  }

  // Biometria confere
  let biometriaConfere: boolean | null = null;
  let biometriaScore: number | null = null;
  if (biometria) {
    biometriaScore = biometria.similarity;
    biometriaConfere = biometria.similarity >= 90;
  }

  // Comprovante em nome de terceiro
  let comprovanteNomeDivergente: boolean | null = null;
  if (comp?.nome) {
    comprovanteNomeDivergente = calcularSimilaridade(comp.nome, cadastro.nomeCompleto) < 85;
  }

  return { nomeCadastroConfere, nomeConfere, placaConfere, cpfConfere, enderecoConfere, biometriaConfere, biometriaScore, comprovanteNomeDivergente };
}
