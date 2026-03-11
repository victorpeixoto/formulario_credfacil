'use client';

import BotaoAvancar from '@/components/BotaoAvancar';
import type { TempoAtuacao } from '@/types/formulario';

const OPCOES: { valor: TempoAtuacao; label: string }[] = [
  { valor: 'menos_3m', label: 'Menos de 3 meses' },
  { valor: '3_6m', label: '3 a 6 meses' },
  { valor: '6_12m', label: '6 meses a 1 ano' },
  { valor: 'mais_1ano', label: 'Mais de 1 ano' },
];

interface Props {
  valor: TempoAtuacao | null;
  onChange: (v: TempoAtuacao) => void;
  onAvancar: () => void;
  onVoltar?: () => void;
}

export default function CardTempo({ valor, onChange, onAvancar, onVoltar }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Há quanto tempo você dirige?</h2>
        <p className="text-gray-500 mt-1 text-sm">Tempo total trabalhando com aplicativos.</p>
      </div>

      <div className="flex flex-col gap-3">
        {OPCOES.map((op) => (
          <button
            key={op.valor}
            onClick={() => onChange(op.valor)}
            className={`w-full py-4 px-5 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150
              ${valor === op.valor
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      <BotaoAvancar onClick={onAvancar} disabled={valor === null} onVoltar={onVoltar} />
    </div>
  );
}
