export type AppTrabalho = 'Uber' | '99' | 'InDriver' | 'iFood' | 'Rappi' | 'Loggi' | 'Lalamove' | 'Outro';

export type TempoAtuacao = 'menos_3m' | '3_6m' | '6_12m' | 'mais_1ano';

export type UltimaEntrega = 'hoje' | 'esta_semana' | '8_30_dias' | 'mais_30_dias';

export type FaixaFaturamento = 'menos_2k' | '2k_3500' | '3500_5k' | 'mais_5k';

export interface Referencia {
  nome: string;
  telefone: string;
  parentesco: string;
}

export interface EstadoFormulario {
  // Card 1
  apps: AppTrabalho[];
  // Card 2
  tempoAtuacao: TempoAtuacao | null;
  // Card 3
  ultimaEntrega: UltimaEntrega | null;
  // Card 4
  faturamento: FaixaFaturamento | null;
  // Card 5
  referencias: Referencia[];
  // Card 6
  nomeCompleto: string;
  cpf: string;
  email: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  estadoUF: string;
  // Card 7
  aceitouCondicoes: boolean;
}

export interface PayloadSubmit {
  trabalho: {
    apps: AppTrabalho[];
    tempoAtuacao: TempoAtuacao;
    ultimaCorridaData: UltimaEntrega;
    faturamentoBruto: FaixaFaturamento;
  };
  referencias: Referencia[];
  nomeCompleto: string;
  cpf: string;
  email: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  estadoUF: string;
  aceitouCondicoes: boolean;
}

export interface RespostaSubmit {
  contactId: string;
  whatsappLink: string;
}
