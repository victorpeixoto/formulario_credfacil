import { calcularSimilaridade, type DadosCadastro } from '@/lib/ai/cruzamento';
import { THRESHOLD_NOME, THRESHOLD_BIOMETRIA } from './config';
import type { ResultadoTarefa } from './executar-validacoes';

export function cruzarCNH(resultado: ResultadoTarefa, cadastro: DadosCadastro): ResultadoTarefa {
  if (!resultado.aprovado) return resultado;

  const dados = resultado.dadosExtraidos as Record<string, unknown>;
  const cpfCNH = String(dados.cpf ?? '').replace(/\D/g, '');
  const cpfCad = cadastro.cpf.replace(/\D/g, '');

  console.log(`[cruzamento] CNH: nome="${dados.nome}" | cadastro: nome="${cadastro.nomeCompleto}" cpf="${cpfCad}"`);

  if (cpfCNH && cpfCNH !== cpfCad) {
    console.log(`[cruzamento] CNH rejeitada: CPF divergente`);
    return { ...resultado, aprovado: false, motivo: 'CPF da CNH não confere com o cadastro' };
  }

  if (cadastro.nomeCompleto && dados.nome) {
    const sim = calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto);
    console.log(`[cruzamento] CNH nome: "${dados.nome}" vs "${cadastro.nomeCompleto}" → ${sim}%`);
    if (sim < THRESHOLD_NOME) {
      return { ...resultado, aprovado: false, motivo: 'Nome da CNH não confere com o cadastro' };
    }
  }

  return resultado;
}

export function cruzarComprovante(resultado: ResultadoTarefa, cadastro: DadosCadastro): ResultadoTarefa {
  if (!resultado.aprovado) return resultado;

  const dados = resultado.dadosExtraidos as Record<string, unknown>;
  const checks: boolean[] = [];

  if (dados.logradouro) checks.push(calcularSimilaridade(String(dados.logradouro), cadastro.logradouro) >= 80);
  if (dados.numero) checks.push(String(dados.numero).trim() === cadastro.numero.trim());
  if (dados.bairro && cadastro.bairro) checks.push(calcularSimilaridade(String(dados.bairro), cadastro.bairro) >= 80);
  if (dados.cidade) checks.push(calcularSimilaridade(String(dados.cidade), cadastro.cidade) >= 85);
  if (dados.estadoUF) checks.push(String(dados.estadoUF).toUpperCase() === cadastro.estadoUF.toUpperCase());
  if (dados.cep && cadastro.cep) checks.push(String(dados.cep).replace(/\D/g, '') === cadastro.cep.replace(/\D/g, ''));

  const acertos = checks.filter(Boolean).length;
  if (checks.length > 0 && acertos < Math.ceil(checks.length * 0.7)) {
    console.log(`[cruzamento] Comprovante rejeitado: ${acertos}/${checks.length} campos conferem`);
    console.log(`[cruzamento] comprovante: log="${dados.logradouro}" n="${dados.numero}" bairro="${dados.bairro}" cidade="${dados.cidade}" uf="${dados.estadoUF}" cep="${dados.cep}"`);
    console.log(`[cruzamento] cadastro:    log="${cadastro.logradouro}" n="${cadastro.numero}" bairro="${cadastro.bairro}" cidade="${cadastro.cidade}" uf="${cadastro.estadoUF}" cep="${cadastro.cep}"`);
    return { ...resultado, aprovado: false, motivo: 'Endereço do comprovante não confere com o cadastro' };
  }

  return resultado;
}

export function cruzarBiometria(resultado: ResultadoTarefa): ResultadoTarefa {
  if (!resultado.aprovado) return resultado;

  const dados = resultado.dadosExtraidos as Record<string, unknown>;
  if (typeof dados.similarity === 'number' && dados.similarity < THRESHOLD_BIOMETRIA) {
    console.log(`[cruzamento] Biometria rejeitada: ${dados.similarity.toFixed(1)}%`);
    return {
      ...resultado,
      aprovado: false,
      motivo: `Biometria não confirmada (similaridade: ${dados.similarity.toFixed(1)}%)`,
    };
  }

  return resultado;
}

export function cruzarVideoApp(resultado: ResultadoTarefa, cadastro: DadosCadastro): ResultadoTarefa {
  if (!resultado.aprovado) return resultado;

  const dados = resultado.dadosExtraidos as Record<string, unknown>;
  const nomePerfil = String(dados.nomePerfil ?? '').trim();

  if (nomePerfil && cadastro.nomeCompleto) {
    const sim = calcularSimilaridade(nomePerfil, cadastro.nomeCompleto);
    console.log(`[cruzamento] videoApp nomePerfil="${nomePerfil}" vs cadastro="${cadastro.nomeCompleto}" → ${sim}%`);
    if (sim < THRESHOLD_NOME) {
      return { ...resultado, aprovado: false, motivo: 'Nome do perfil no app não confere com o cadastro' };
    }
  }

  return resultado;
}

export function aplicarCruzamentoInline(
  tipo: string,
  resultado: ResultadoTarefa,
  cadastro: DadosCadastro
): ResultadoTarefa {
  switch (tipo) {
    case 'cnh': return cruzarCNH(resultado, cadastro);
    case 'comprovante': return cruzarComprovante(resultado, cadastro);
    case 'biometria': return cruzarBiometria(resultado);
    case 'videoApp': return cruzarVideoApp(resultado, cadastro);
    default: return resultado;
  }
}
