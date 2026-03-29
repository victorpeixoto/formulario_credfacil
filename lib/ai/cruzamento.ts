import type { ValidacaoIA, ResultadoCNH, ResultadoSelfie, ResultadoVideoApp, ResultadoVideoVeiculo, ResultadoBiometria } from '@/types/documentos';

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

interface ResultadosTodos {
  cnh?: { dadosExtraidos: ResultadoCNH };
  selfie?: { dadosExtraidos: ResultadoSelfie };
  videoApp?: { dadosExtraidos: ResultadoVideoApp };
  videoVeiculo?: { dadosExtraidos: ResultadoVideoVeiculo };
  biometria?: { dadosExtraidos: ResultadoBiometria };
}

export function cruzarDados(resultados: ResultadosTodos, cpfFormulario: string): ValidacaoIA {
  const cnh = resultados.cnh?.dadosExtraidos;
  const selfie = resultados.selfie?.dadosExtraidos;
  const videoApp = resultados.videoApp?.dadosExtraidos;
  const videoVeiculo = resultados.videoVeiculo?.dadosExtraidos;
  const biometria = resultados.biometria?.dadosExtraidos;

  // Nome confere: CNH vs perfil do app (Levenshtein >= 85)
  let nomeConfere: boolean | null = null;
  if (cnh?.nome && videoApp?.nomePerfil) {
    nomeConfere = calcularSimilaridade(cnh.nome, videoApp.nomePerfil) >= 85;
  }

  // CPF confere: CNH vs formulário (igualdade exata, ignorando formatação)
  let cpfConfere: boolean | null = null;
  if (cnh?.cpf) {
    const cpfCNH = cnh.cpf.replace(/\D/g, '');
    const cpfForm = cpfFormulario.replace(/\D/g, '');
    cpfConfere = cpfCNH === cpfForm;
  }

  // Placa confere: >= 2 de 3 fontes iguais
  let placaConfere: boolean | null = null;
  const placas = [selfie?.placa, videoApp?.placa, videoVeiculo?.placa]
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

  return { nomeConfere, placaConfere, cpfConfere, biometriaConfere, biometriaScore };
}
