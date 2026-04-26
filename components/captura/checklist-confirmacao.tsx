'use client';

import { useState } from 'react';

interface ChecklistConfirmacaoProps {
  itens: string[];
  onTodosMarcados: (marcados: boolean) => void;
}

export default function ChecklistConfirmacao({ itens, onTodosMarcados }: ChecklistConfirmacaoProps) {
  const [marcados, setMarcados] = useState<boolean[]>(() => itens.map(() => false));

  const alternar = (idx: number) => {
    const novos = marcados.map((m, i) => (i === idx ? !m : m));
    setMarcados(novos);
    onTodosMarcados(novos.every(Boolean));
  };

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => alternar(idx)}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
            marcados[idx]
              ? 'border-green-400 bg-green-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
              marcados[idx] ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'
            }`}
          >
            {marcados[idx] && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="text-sm text-gray-800 flex-1">{item}</span>
        </button>
      ))}
    </div>
  );
}
