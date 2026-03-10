'use client';

import { useState } from 'react';
import BotaoAvancar from '@/components/BotaoAvancar';
import type { Referencia } from '@/types/formulario';

interface Props {
  valor: Referencia[];
  onChange: (refs: Referencia[]) => void;
  onAvancar: () => void;
}

const TOTAL = 4;

const vazio: Referencia = { nome: '', telefone: '', parentesco: '' };

function telRepetido(refs: Referencia[], tel: string): boolean {
  const base = tel.replace(/\D/g, '').slice(-8);
  return refs.some((r) => r.telefone.replace(/\D/g, '').slice(-8) === base);
}

export default function CardReferencias({ valor, onChange, onAvancar }: Props) {
  const [novo, setNovo] = useState<Referencia>(vazio);
  const [erro, setErro] = useState('');

  function adicionar() {
    const { nome, telefone, parentesco } = novo;
    if (!nome.trim() || !telefone.trim() || !parentesco.trim()) {
      setErro('Preencha nome, telefone e parentesco.');
      return;
    }
    if (telefone.replace(/\D/g, '').length < 10) {
      setErro('Telefone inválido. Inclua o DDD.');
      return;
    }
    if (telRepetido(valor, telefone)) {
      setErro('Esse telefone já foi adicionado.');
      return;
    }
    onChange([...valor, novo]);
    setNovo(vazio);
    setErro('');
  }

  function remover(i: number) {
    onChange(valor.filter((_, idx) => idx !== i));
  }

  const faltam = TOTAL - valor.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Referências pessoais</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Precisamos de {TOTAL} contatos de parentes ou amigos.
          {faltam > 0 && <span className="text-green-600 font-medium"> Faltam {faltam}.</span>}
        </p>
      </div>

      {valor.map((ref, i) => (
        <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{ref.nome}</p>
            <p className="text-gray-500 text-xs">{ref.telefone} · {ref.parentesco}</p>
          </div>
          <button onClick={() => remover(i)} className="text-red-400 hover:text-red-600 text-xs ml-4">
            Remover
          </button>
        </div>
      ))}

      {valor.length < TOTAL && (
        <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Contato {valor.length + 1} de {TOTAL}
          </p>
          <input
            placeholder="Nome completo"
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400"
          />
          <input
            placeholder="Telefone com DDD"
            value={novo.telefone}
            onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
            type="tel"
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400"
          />
          <input
            placeholder="Parentesco (ex: Mãe, Amigo)"
            value={novo.parentesco}
            onChange={(e) => setNovo({ ...novo, parentesco: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400"
          />
          {erro && <p className="text-red-500 text-xs">{erro}</p>}
          <button
            onClick={adicionar}
            className="w-full py-3 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Adicionar contato
          </button>
        </div>
      )}

      <BotaoAvancar onClick={onAvancar} disabled={valor.length < TOTAL} />
    </div>
  );
}
