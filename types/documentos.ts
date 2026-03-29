export type TipoDocumento = 'cnh' | 'comprovante' | 'selfie' | 'videoApp' | 'videoVeiculo';
export type StatusDocumento = 'pendente' | 'enviado' | 'processando' | 'aprovado' | 'rejeitado' | 'erro';
export type StatusDocumentos = 'AGUARDANDO_DOCUMENTOS' | 'PROCESSANDO' | 'APROVADO' | 'PENDENCIA' | 'ANALISE_MANUAL';

export interface DocumentoInfo {
  url: string | null;
  status: StatusDocumento;
  tentativas: number;
  resultado: ResultadoValidacao | null;
  atualizadoEm: string | null;
}

export interface ResultadoValidacao {
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: Record<string, unknown>;
}

export interface ValidacaoIA {
  nomeConfere: boolean | null;
  placaConfere: boolean | null;
  cpfConfere: boolean | null;
  biometriaConfere: boolean | null;
  biometriaScore: number | null;
}

export interface DocumentosMap {
  cnh: DocumentoInfo;
  comprovante: DocumentoInfo;
  selfie: DocumentoInfo;
  videoApp: DocumentoInfo;
  videoVeiculo: DocumentoInfo;
}

export interface ResultadoCNH {
  nome: string;
  cpf: string;
  validade: string;
  categoria: string;
  legivel: boolean;
}

export interface ResultadoComprovante {
  nome: string;
  dataEmissao: string;
  endereco: string;
  tipo: string;
  legivel: boolean;
}

export interface ResultadoSelfie {
  pessoaVisivel: boolean;
  veiculoVisivel: boolean;
  placaVisivel: boolean;
  placa: string | null;
  aparentementeAutentica: boolean;
}

export interface ResultadoBiometria {
  similarity: number;
  match: boolean;
}

export interface ResultadoVideoApp {
  nomePerfil: string | null;
  placa: string | null;
  faturamento180d: string | null;
  tempoUso: string | null;
  totalCorridas: string | null;
  temCortes: boolean;
  aplicativo: string | null;
}

export interface ResultadoVideoVeiculo {
  veiculoLigado: boolean;
  placaVisivel: boolean;
  placa: string | null;
  temCortes: boolean;
}
