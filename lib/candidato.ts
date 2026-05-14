import { validarEmail, validarNomeCompleto, validarTelefone } from '@/lib/validators';
import type { CandidatoPatchBody } from '@/types/candidato';

const CAMPOS_PERMITIDOS = [
  'nomeCompleto',
  'email',
  'telefone',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estadoUF',
] as const satisfies ReadonlyArray<keyof CandidatoPatchBody>;

type Campo = (typeof CAMPOS_PERMITIDOS)[number];

export interface ErroValidacao {
  mensagem: string;
  campo: Campo | null;
}

export interface ResultadoSanitizacao {
  campos: Partial<Record<Campo, string>>;
  erro: ErroValidacao | null;
}

function erro(campo: Campo | null, mensagem: string): ResultadoSanitizacao {
  return { campos: {}, erro: { mensagem, campo } };
}

export function sanitizarECriarUpdate(body: unknown): ResultadoSanitizacao {
  if (!body || typeof body !== 'object') {
    return erro(null, 'Body inválido');
  }

  const campos: Partial<Record<Campo, string>> = {};
  for (const k of CAMPOS_PERMITIDOS) {
    const v = (body as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (typeof v !== 'string') {
      return erro(k, `Campo ${k} deve ser string`);
    }
    campos[k] = v.trim();
  }

  if (campos.email !== undefined) {
    if (campos.email === '' || !validarEmail(campos.email)) {
      return erro('email', 'E-mail inválido');
    }
    campos.email = campos.email.toLowerCase();
  }

  if (campos.nomeCompleto !== undefined && !validarNomeCompleto(campos.nomeCompleto)) {
    return erro('nomeCompleto', 'Informe nome e sobrenome');
  }

  if (campos.telefone !== undefined) {
    const digitos = campos.telefone.replace(/\D/g, '');
    if (digitos && !validarTelefone(digitos)) {
      return erro('telefone', 'Telefone inválido');
    }
    campos.telefone = digitos;
  }

  if (campos.cep !== undefined) {
    const digitos = campos.cep.replace(/\D/g, '');
    if (digitos.length !== 8) {
      return erro('cep', 'CEP deve ter 8 dígitos');
    }
    campos.cep = digitos;
  }

  if (campos.estadoUF !== undefined) {
    campos.estadoUF = campos.estadoUF.toUpperCase();
    if (campos.estadoUF && campos.estadoUF.length !== 2) {
      return erro('estadoUF', 'UF deve ter 2 letras');
    }
  }

  const obrigatoriosNaoVazios: Campo[] = ['nomeCompleto', 'email', 'logradouro', 'numero', 'bairro', 'cidade', 'estadoUF'];
  for (const c of obrigatoriosNaoVazios) {
    if (campos[c] !== undefined && campos[c] === '') {
      return erro(c, `Campo ${c} não pode ficar vazio`);
    }
  }

  return { campos, erro: null };
}
