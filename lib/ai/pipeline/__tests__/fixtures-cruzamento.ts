// Vetores de regressão (baseline AS-IS) para o cruzamento documento × cadastro.
//
// `intent` → expectativa derivada das REGRAS DE NEGÓCIO (não-circular): os campos
//            que decidem aprovação/rejeição. É o que precisa permanecer idêntico.
//
// A rede de segurança usa o oráculo `avaliarCruzamentoAtual` (que compõe as funções
// de produção atuais) como baseline vivo:
//   - T2: o oráculo satisfaz o `intent` de cada caso (baseline verde, não-circular).
//   - T5: `avaliarCruzamento` (novo módulo) === oráculo, campo a campo (comportamento idêntico).
//
// Os endereços dos casos de comprovante foram escolhidos para que a regra inline e a
// de `cruzarDados` concordem (evita o gap de divergência das duas implementações atuais).
import type { DadosCadastro } from '@/lib/ai/cruzamento';
import type { DadosExtraidosMap } from '@/lib/ai/pipeline/tipos-cruzamento';
import type { StatusDocumento, TipoDocumento, ValidacaoIA } from '@/types/documentos';

export interface CasoFixture {
  nome: string;
  descricao: string;
  cadastro: DadosCadastro;
  extraidos: DadosExtraidosMap;
  intent: {
    statusPorDoc?: Partial<Record<TipoDocumento, StatusDocumento>>;
    validacaoIA?: Partial<ValidacaoIA>;
  };
}

const CADASTRO: DadosCadastro = {
  nomeCompleto: 'JOAO DA SILVA SANTOS',
  cpf: '123.456.789-00',
  logradouro: 'Rua das Flores',
  numero: '100',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estadoUF: 'SP',
  cep: '01000-000',
};

const cnhOk = {
  aprovadoRegraPropria: true,
  motivo: null,
  dadosExtraidos: { nome: 'JOAO DA SILVA SANTOS', cpf: '123.456.789-00', validade: '2030-01-01', categoria: 'B', legivel: true },
};

const comprovanteEnderecoOk = {
  logradouro: 'Rua das Flores',
  numero: '100',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estadoUF: 'SP',
  cep: '01000-000',
};

export const casos: CasoFixture[] = [
  {
    nome: 'cnh-ok',
    descricao: 'CNH com nome e CPF batendo com o cadastro → aprovada',
    cadastro: CADASTRO,
    extraidos: { cnh: cnhOk },
    intent: { statusPorDoc: { cnh: 'aprovado' }, validacaoIA: { nomeCadastroConfere: true, cpfConfere: true } },
  },
  {
    nome: 'cnh-cpf-divergente',
    descricao: 'CPF da CNH diferente do cadastro → CNH rejeitada',
    cadastro: CADASTRO,
    extraidos: {
      cnh: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { ...cnhOk.dadosExtraidos, cpf: '999.888.777-66' } },
    },
    intent: { statusPorDoc: { cnh: 'rejeitado' }, validacaoIA: { cpfConfere: false } },
  },
  {
    nome: 'cnh-nome-divergente',
    descricao: 'Nome da CNH diferente do cadastro (CPF ok) → CNH rejeitada',
    cadastro: CADASTRO,
    extraidos: {
      cnh: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { ...cnhOk.dadosExtraidos, nome: 'MARIA OLIVEIRA COSTA' } },
    },
    intent: { statusPorDoc: { cnh: 'rejeitado' }, validacaoIA: { nomeCadastroConfere: false, cpfConfere: true } },
  },
  {
    nome: 'comprovante-ok',
    descricao: 'Comprovante com endereço e nome do próprio candidato → aprovado',
    cadastro: CADASTRO,
    extraidos: {
      comprovante: {
        aprovadoRegraPropria: true,
        motivo: null,
        dadosExtraidos: { nome: 'JOAO DA SILVA SANTOS', dataEmissao: '2026-05-01', ...comprovanteEnderecoOk, tipo: 'luz', legivel: true },
      },
    },
    intent: { statusPorDoc: { comprovante: 'aprovado' }, validacaoIA: { enderecoConfere: true, comprovanteNomeDivergente: false } },
  },
  {
    nome: 'comprovante-endereco-divergente',
    descricao: 'Endereço do comprovante totalmente diferente do cadastro → rejeitado',
    cadastro: CADASTRO,
    extraidos: {
      comprovante: {
        aprovadoRegraPropria: true,
        motivo: null,
        dadosExtraidos: {
          nome: 'JOAO DA SILVA SANTOS',
          dataEmissao: '2026-05-01',
          logradouro: 'Avenida Brasil Central',
          numero: '4567',
          bairro: 'Jardim Distante',
          cidade: 'Belo Horizonte',
          estadoUF: 'MG',
          cep: '30100-100',
          tipo: 'luz',
          legivel: true,
        },
      },
    },
    intent: { statusPorDoc: { comprovante: 'rejeitado' }, validacaoIA: { enderecoConfere: false } },
  },
  {
    nome: 'comprovante-nome-terceiro',
    descricao: 'Endereço bate mas comprovante está em nome de terceiro → analise_manual',
    cadastro: CADASTRO,
    extraidos: {
      comprovante: {
        aprovadoRegraPropria: true,
        motivo: null,
        dadosExtraidos: { nome: 'ANA PAULA FERREIRA', dataEmissao: '2026-05-01', ...comprovanteEnderecoOk, tipo: 'agua', legivel: true },
      },
    },
    intent: { statusPorDoc: { comprovante: 'analise_manual' }, validacaoIA: { enderecoConfere: true, comprovanteNomeDivergente: true } },
  },
  {
    nome: 'videoapp-nome-divergente',
    descricao: 'Nome do perfil no app diverge do cadastro/CNH → videoApp rejeitado',
    cadastro: CADASTRO,
    extraidos: {
      cnh: cnhOk,
      videoApp: {
        aprovadoRegraPropria: true,
        motivo: null,
        dadosExtraidos: { nomePerfil: 'CARLOS EDUARDO MENDES', placa: 'ABC1D23', temCortes: false, formatoGanhos: 'mensal' },
      },
    },
    intent: { statusPorDoc: { cnh: 'aprovado', videoApp: 'rejeitado' }, validacaoIA: { nomeConfere: false } },
  },
  {
    nome: 'placa-divergente-entre-fontes',
    descricao: 'Placa da selfie diverge da do vídeo do app → rejeita só esses dois; vídeo do veículo permanece aprovado',
    cadastro: CADASTRO,
    extraidos: {
      cnh: cnhOk,
      selfie: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { pessoaVisivel: true, veiculoVisivel: true, placaVisivel: true, placa: 'ABC1D23', aparentementeAutentica: true } },
      videoApp: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { nomePerfil: 'JOAO DA SILVA SANTOS', placa: 'XYZ9K88', temCortes: false, formatoGanhos: 'mensal' } },
      videoVeiculo: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { veiculoLigado: true, temCortes: false } },
    },
    intent: {
      statusPorDoc: { selfie: 'rejeitado', videoApp: 'rejeitado', videoVeiculo: 'aprovado' },
      validacaoIA: { placaConfere: false },
    },
  },
  {
    nome: 'biometria-95',
    descricao: 'Biometria 95% → confere',
    cadastro: CADASTRO,
    extraidos: {
      cnh: cnhOk,
      selfie: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { pessoaVisivel: true, veiculoVisivel: true, placaVisivel: true, placa: 'ABC1D23', aparentementeAutentica: true } },
      biometria: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { similarity: 95, match: true } },
    },
    intent: { statusPorDoc: { cnh: 'aprovado', selfie: 'aprovado' }, validacaoIA: { biometriaConfere: true, biometriaScore: 95 } },
  },
  {
    nome: 'biometria-85',
    descricao: 'Biometria 85% (banda intermediária) → não confere no cruzamento (>=90)',
    cadastro: CADASTRO,
    extraidos: {
      cnh: cnhOk,
      selfie: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { pessoaVisivel: true, veiculoVisivel: true, placaVisivel: true, placa: 'ABC1D23', aparentementeAutentica: true } },
      biometria: { aprovadoRegraPropria: false, motivo: 'Similaridade intermediária (85.0%) — requer revisão humana', dadosExtraidos: { similarity: 85, match: true } },
    },
    intent: { statusPorDoc: { cnh: 'aprovado', selfie: 'aprovado' }, validacaoIA: { biometriaConfere: false, biometriaScore: 85 } },
  },
  {
    nome: 'biometria-70',
    descricao: 'Biometria 70% → não confere',
    cadastro: CADASTRO,
    extraidos: {
      cnh: cnhOk,
      selfie: { aprovadoRegraPropria: true, motivo: null, dadosExtraidos: { pessoaVisivel: true, veiculoVisivel: true, placaVisivel: true, placa: 'ABC1D23', aparentementeAutentica: true } },
      biometria: { aprovadoRegraPropria: false, motivo: 'Biometria não confirmada (similaridade: 70.0%)', dadosExtraidos: { similarity: 70, match: false } },
    },
    intent: { statusPorDoc: { cnh: 'aprovado', selfie: 'aprovado' }, validacaoIA: { biometriaConfere: false, biometriaScore: 70 } },
  },
];
