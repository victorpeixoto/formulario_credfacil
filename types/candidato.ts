import type { StatusDocumentos } from './documentos';

export interface EnderecoCandidato {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estadoUF: string;
}

export interface DocumentoResumo {
  status: string;
  motivo: string | null;
  tentativas: number;
}

export interface CandidatoView {
  nomeCompleto: string;
  cpf: string; // mascarado: 000.***.**0-00
  email: string;
  telefone: string;
  endereco: EnderecoCandidato;
  statusDocumentos: StatusDocumentos;
  documentos: Record<string, DocumentoResumo>;
}

export type CandidatoPatchBody = Partial<{
  nomeCompleto: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estadoUF: string;
}>;

export const STATUS_EDICAO_LIBERADO: StatusDocumentos[] = [
  'AGUARDANDO_DOCUMENTOS',
  'PROCESSANDO',
  'PENDENCIA',
];

export const STATUS_EDICAO_BLOQUEADO: StatusDocumentos[] = [
  'APROVADO',
  'ANALISE_MANUAL',
];
