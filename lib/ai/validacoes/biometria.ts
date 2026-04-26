import { compararRostos } from '../rekognition';
import type { ResultadoBiometria } from '@/types/documentos';

export async function validarBiometria(cnhUrl: string, selfieUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoBiometria;
}> {
  const resultado = await compararRostos(cnhUrl, selfieUrl);

  if (resultado.rostoNaoDetectado) {
    return {
      aprovado: false,
      motivo: resultado.motivo ?? 'Não detectamos rosto na CNH ou na selfie. Refaça com boa iluminação.',
      dadosExtraidos: { similarity: resultado.similarity, match: resultado.match },
    };
  }

  if (resultado.similarity >= 90) {
    return { aprovado: true, motivo: null, dadosExtraidos: { similarity: resultado.similarity, match: resultado.match } };
  }

  if (resultado.similarity >= 80) {
    return {
      aprovado: false,
      motivo: `Similaridade intermediária (${resultado.similarity.toFixed(1)}%) — requer revisão humana`,
      dadosExtraidos: { similarity: resultado.similarity, match: resultado.match },
    };
  }

  return {
    aprovado: false,
    motivo: `Biometria não confirmada (similaridade: ${resultado.similarity.toFixed(1)}%)`,
    dadosExtraidos: { similarity: resultado.similarity, match: resultado.match },
  };
}
