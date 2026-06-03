import type { StatusDocumento, TipoDocumento, ValidacaoIA } from '@/types/documentos';

/** Documento ou biometria — chave de entrada do cruzamento. */
export type TipoExtraido = TipoDocumento | 'biometria';

/**
 * Resultado cru de uma validação, antes do cruzamento documento × cadastro.
 * `aprovadoRegraPropria` reflete apenas a regra interna do documento
 * (legibilidade, validade, faturamento, etc.) — sem comparação com o cadastro.
 */
export interface EntradaExtraida {
  aprovadoRegraPropria: boolean;
  motivo: string | null;
  dadosExtraidos: Record<string, unknown>;
}

export type DadosExtraidosMap = Partial<Record<TipoExtraido, EntradaExtraida>>;

/** Saída da função pura de cruzamento: status por doc + validacaoIA + motivos. */
export interface ResultadoCruzamento {
  statusPorDoc: Partial<Record<TipoDocumento, StatusDocumento>>;
  motivos: Partial<Record<TipoDocumento, string | null>>;
  validacaoIA: ValidacaoIA;
}
