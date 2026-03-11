'use client';

import BotaoAvancar from '@/components/BotaoAvancar';
import type { UltimaEntrega } from '@/types/formulario';

const OPCOES: { valor: UltimaEntrega; label: string }[] = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'esta_semana', label: 'Esta semana' },
  { valor: '8_30_dias', label: 'Entre 8 e 30 dias atrás' },
  { valor: 'mais_30_dias', label: 'Há mais de 30 dias' },
];

interface Props {
  valor: UltimaEntrega | null;
  onChange: (v: UltimaEntrega) => void;
  onAvancar: () => void;
  onVoltar?: () => void;
}

export default function CardUltimaEntrega({ valor, onChange, onAvancar, onVoltar }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Quando foi sua última corrida ou entrega?</h2>
        <p className="text-gray-500 mt-1 text-sm">Considere qualquer um dos seus aplicativos.</p>
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
