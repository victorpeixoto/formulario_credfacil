'use client';

import BotaoAvancar from '@/components/BotaoAvancar';
import type { AppTrabalho } from '@/types/formulario';

const APPS: AppTrabalho[] = ['Uber', '99', 'InDriver', 'iFood', 'Rappi', 'Loggi', 'Lalamove', 'Outro'];

interface Props {
  valor: AppTrabalho[];
  onChange: (apps: AppTrabalho[]) => void;
  onAvancar: () => void;
}

export default function CardApps({ valor, onChange, onAvancar }: Props) {
  function toggle(app: AppTrabalho) {
    if (valor.includes(app)) {
      onChange(valor.filter((a) => a !== app));
    } else {
      onChange([...valor, app]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Com quais apps você trabalha?</h2>
        <p className="text-gray-500 mt-1 text-sm">Selecione todos que usa.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {APPS.map((app) => {
          const selecionado = valor.includes(app);
          return (
            <button
              key={app}
              onClick={() => toggle(app)}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all duration-150
                ${selecionado
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {app}
            </button>
          );
        })}
      </div>

      <BotaoAvancar onClick={onAvancar} disabled={valor.length === 0} />
    </div>
  );
}
