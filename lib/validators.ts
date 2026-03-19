/**
 * Módulo utilitário de validação e formatação para o formulário CredFácil.
 * Funções puras, sem side-effects, reutilizáveis em qualquer componente.
 */

// ─── CPF ────────────────────────────────────────────────────────────────────

/**
 * Valida CPF com algoritmo completo de dígitos verificadores (Receita Federal).
 * Rejeita sequências repetidas como 000.000.000-00, 111.111.111-11, etc.
 */
export function validarCPF(cpf: string): boolean {
  const digitos = cpf.replace(/\D/g, '');
  if (digitos.length !== 11) return false;

  // Rejeitar sequências de dígitos iguais
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  // Calcular primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digitos.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digitos.charAt(9))) return false;

  // Calcular segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digitos.charAt(10))) return false;

  return true;
}

/**
 * Aplica máscara de CPF conforme o usuário digita: 000.000.000-00
 * Remove caracteres não-numéricos e limita a 11 dígitos.
 */
export function formatarCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9)
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

// ─── Telefone ───────────────────────────────────────────────────────────────

/**
 * Aplica máscara de telefone brasileiro:
 * - Celular (11 dígitos): (00) 00000-0000
 * - Fixo (10 dígitos):    (00) 0000-0000
 */
export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/**
 * Valida telefone brasileiro: 10-11 dígitos, DDD entre 11-99.
 */
export function validarTelefone(telefone: string): boolean {
  const digitos = telefone.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 11) return false;
  const ddd = parseInt(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  return true;
}

// ─── Email ──────────────────────────────────────────────────────────────────

/**
 * Valida e-mail com regex melhorada. Exige:
 * - Parte local (antes do @) com pelo menos 1 caractere válido
 * - Domínio com pelo menos 1 ponto
 * - TLD com pelo menos 2 caracteres
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test(email.trim());
}

// ─── Nome ───────────────────────────────────────────────────────────────────

/**
 * Valida nome completo: exige pelo menos 2 palavras com 2+ caracteres cada.
 * Exemplo válido: "João Silva", "Maria de Souza"
 * Exemplo inválido: "João", "J S"
 */
export function validarNomeCompleto(nome: string): boolean {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  return palavras.length >= 2;
}
