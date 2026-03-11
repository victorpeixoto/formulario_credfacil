'use client';

import BotaoAvancar from '@/components/BotaoAvancar';
import type { FaixaFaturamento } from '@/types/formulario';

const OPCOES: { valor: FaixaFaturamento; label: string }[] = [
  { valor: 'menos_2k', label: 'Menos de R$ 2.000' },
  { valor: '2k_3500', label: 'Entre R$ 2.000 e R$ 3.500' },
  { valor: '3500_5k', label: 'Entre R$ 3.500 e R$ 5.000' },
  { valor: 'mais_5k', label: 'Mais de R$ 5.000' },
];

interface Props {
  valor: FaixaFaturamento | null;
  onChange: (v: FaixaFaturamento) => void;
  onAvancar: () => void;
  onVoltar?: () => void;
}

export default function CardFaturamento({ valor, onChange, onAvancar, onVoltar }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Qual seu faturamento bruto mensal?</h2>
        <p className="text-gray-500 mt-1 text-sm">Valor total recebido, sem descontar despesas.</p>
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
