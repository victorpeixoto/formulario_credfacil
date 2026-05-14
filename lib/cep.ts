export interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estadoUF: string;
  encontrado: boolean;
}

export type ResultadoBuscaCep =
  | { ok: true; endereco: EnderecoViaCep }
  | { ok: false; erro: string };

export async function buscarCep(valor: string): Promise<ResultadoBuscaCep> {
  const apenasNumeros = valor.replace(/\D/g, '');
  if (apenasNumeros.length !== 8) {
    return { ok: false, erro: 'CEP incompleto.' };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
    const data = await res.json();
    if (data.erro) return { ok: false, erro: 'CEP não encontrado.' };
    return {
      ok: true,
      endereco: {
        cep: apenasNumeros,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estadoUF: data.uf || '',
        encontrado: !!data.logradouro,
      },
    };
  } catch {
    return { ok: false, erro: 'Erro ao buscar CEP. Tente novamente.' };
  }
}
