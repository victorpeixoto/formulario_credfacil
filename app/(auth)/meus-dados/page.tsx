'use client';

import { useEffect, useState } from 'react';
import FormCadastro from '@/components/meus-dados/form-cadastro';
import { STATUS_EDICAO_BLOQUEADO } from '@/types/candidato';
import type { CandidatoView } from '@/types/candidato';

const MENSAGEM_BLOQUEIO: Record<string, string> = {
  APROVADO: 'Seu cadastro já foi aprovado. Para alterar dados, fale com o suporte.',
  ANALISE_MANUAL: 'Seu cadastro está em análise manual. Para alterar, aguarde o retorno do suporte.',
};

const BANNER_PENDENCIA =
  'Algum documento foi reprovado. Após corrigir seus dados, reenvie o documento na aba "Documentos".';

export default function PageMeusDados() {
  const [dados, setDados] = useState<CandidatoView | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/candidato')
      .then(async (r) => {
        if (!r.ok) throw new Error('falha');
        return (await r.json()) as CandidatoView;
      })
      .then((d) => {
        if (!cancelado) setDados(d);
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar seus dados.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (carregando) {
    return (
      <main className="max-w-md mx-auto px-6 py-8">
        <p className="text-sm text-gray-400">Carregando…</p>
      </main>
    );
  }

  if (erro || !dados) {
    return (
      <main className="max-w-md mx-auto px-6 py-8">
        <p className="text-sm text-red-500">{erro ?? 'Erro ao carregar.'}</p>
      </main>
    );
  }

  const bloqueado = STATUS_EDICAO_BLOQUEADO.includes(dados.statusDocumentos);
  const motivoBloqueio = MENSAGEM_BLOQUEIO[dados.statusDocumentos];
  const mostrarBannerPendencia = dados.statusDocumentos === 'PENDENCIA';

  return (
    <main className="max-w-md mx-auto px-6 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus dados</h1>
        <p className="text-gray-500 text-sm mt-1">
          Atualize seus dados cadastrais. CPF não pode ser alterado.
        </p>
      </div>

      {mostrarBannerPendencia && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {BANNER_PENDENCIA}
        </div>
      )}

      <FormCadastro
        inicial={dados}
        bloqueado={bloqueado}
        motivoBloqueio={motivoBloqueio}
        onSalvo={setDados}
      />
    </main>
  );
}
