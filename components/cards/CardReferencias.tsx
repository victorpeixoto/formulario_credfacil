'use client';

import { useState } from 'react';
import BotaoAvancar from '@/components/BotaoAvancar';
import type { Referencia } from '@/types/formulario';
import { formatarTelefone, validarTelefone } from '@/lib/validators';

interface Props {
  valor: Referencia[];
  onChange: (refs: Referencia[]) => void;
  onAvancar: () => void;
  onVoltar?: () => void;
}

const TOTAL = 4;

const vazio: Referencia = { nome: '', telefone: '', parentesco: '' };

function telRepetido(refs: Referencia[], tel: string): boolean {
  const base = tel.replace(/\D/g, '').slice(-8);
  return refs.some((r) => r.telefone.replace(/\D/g, '').slice(-8) === base);
}

export default function CardReferencias({ valor, onChange, onAvancar, onVoltar }: Props) {
  const [novo, setNovo] = useState<Referencia>(vazio);
  const [erro, setErro] = useState('');
  const [confirmou, setConfirmou] = useState(false);

  function adicionar() {
    const { nome, telefone, parentesco } = novo;
    if (!nome.trim() || !telefone.trim() || !parentesco.trim()) {
      setErro('Preencha nome, telefone e parentesco.');
      return;
    }
    if (!validarTelefone(telefone)) {
      setErro('Telefone inválido. Inclua DDD + número (10 ou 11 dígitos).');
      return;
    }
    if (telRepetido(valor, telefone)) {
      setErro('Esse telefone já foi adicionado.');
      return;
    }
    if (!confirmou) {
      setErro('Confirme que este contato tem ciência antes de adicionar.');
      return;
    }
    onChange([...valor, novo]);
    setNovo(vazio);
    setErro('');
    setConfirmou(false);
  }

  function remover(i: number) {
    onChange(valor.filter((_, idx) => idx !== i));
  }

  const faltam = TOTAL - valor.length;
  const formularioPreenchido = novo.nome.trim() && novo.telefone.trim() && novo.parentesco.trim();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Referências pessoais</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Precisamos de {TOTAL} contatos de parentes ou amigos.
          {faltam > 0 && <span className="text-green-600 font-medium"> Faltam {faltam}.</span>}
        </p>
      </div>

      {/* Aviso de verificação */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <span className="text-amber-500 text-base mt-0.5">⚠️</span>
        <p className="text-amber-800 text-xs leading-relaxed">
          Esses contatos <strong>serão chamados</strong> pela nossa equipe para confirmação. A inserção de dados falsos resulta na <strong>reprovação automática</strong> da solicitação.
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
            placeholder="(00) 00000-0000"
            value={novo.telefone}
            onChange={(e) => setNovo({ ...novo, telefone: formatarTelefone(e.target.value) })}
            type="tel"
            inputMode="numeric"
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400"
          />
          <input
            placeholder="Parentesco (ex: Mãe, Amigo)"
            value={novo.parentesco}
            onChange={(e) => setNovo({ ...novo, parentesco: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400"
          />

          {/* Checkbox de confirmação — aparece só quando o formulário está preenchido */}
          {formularioPreenchido && (
            <label className="flex items-start gap-3 cursor-pointer select-none mt-1">
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={confirmou}
                  onChange={(e) => {
                    setConfirmou(e.target.checked);
                    if (erro) setErro('');
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    confirmou ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                  }`}
                >
                  {confirmou && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 leading-relaxed">
                Este contato <strong>tem ciência</strong> de que pode ser chamado e autorizou o uso do número.
              </span>
            </label>
          )}

          {erro && <p className="text-red-500 text-xs">{erro}</p>}
          <button
            onClick={adicionar}
            className="w-full py-3 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Adicionar contato
          </button>
        </div>
      )}

      <BotaoAvancar onClick={onAvancar} disabled={valor.length < TOTAL} onVoltar={onVoltar} />
    </div>
  );
}
