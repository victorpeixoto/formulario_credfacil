'use client';

import BotaoAvancar from '@/components/BotaoAvancar';
import type { FaixaFaturamento } from '@/types/formulario';

const OPCOES: { valor: FaixaFaturamento; label: string }[] = [
  { valor: 'ate_1k', label: 'Até R$ 1.000' },
  { valor: '1k_2k', label: 'De R$ 1.000 a R$ 2.000' },
  { valor: '2k_3500', label: 'De R$ 2.000 a R$ 3.499' },
  { valor: 'mais_3500', label: 'Acima de R$ 3.500' },
];

interface Props {
  valor: FaixaFaturamento | null;
  onChange: (v: FaixaFaturamento) => void;
  ciente: boolean;
  onCienteChange: (v: boolean) => void;
  onAvancar: () => void;
  onVoltar?: () => void;
}

export default function CardFaturamento({ valor, onChange, ciente, onCienteChange, onAvancar, onVoltar }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Qual é o seu faturamento bruto mensal somando todos os aplicativos?</h2>
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

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-orange-800 text-xs font-medium leading-relaxed">
          Essa informação será conferida na análise, caso você minta, será bloqueado para sempre em nossa empresa.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={ciente}
          onChange={(e) => onCienteChange(e.target.checked)}
          className="mt-1 w-5 h-5 accent-green-500 cursor-pointer"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          Estou ciente de que declarar renda falsa resulta em desclassificação e confirmo que o valor informado é verdadeiro.
        </span>
      </label>

      <BotaoAvancar onClick={onAvancar} disabled={valor === null || !ciente} onVoltar={onVoltar} />
    </div>
  );
}
