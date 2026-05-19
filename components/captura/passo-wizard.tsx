'use client';

import { ReactNode } from 'react';
import { useAcaoUnica } from '@/lib/hooks/use-acao-unica';

interface PassoWizardProps {
  passoAtual: number;
  totalPassos: number;
  titulo: string;
  subtitulo?: string;
  onVoltar?: () => void;
  children: ReactNode;
}

export default function PassoWizard({
  passoAtual,
  totalPassos,
  titulo,
  subtitulo,
  onVoltar,
  children,
}: PassoWizardProps) {
  const progresso = (passoAtual / totalPassos) * 100;
  const acaoVoltar = useAcaoUnica();

  return (
    <main className="flex-1 w-full bg-white flex flex-col px-6 py-6 max-w-md mx-auto gap-5">
      <div className="flex items-center gap-3">
        {onVoltar && (
          <button
            onClick={() => acaoVoltar.executar(onVoltar)}
            disabled={acaoVoltar.executando}
            type="button"
            aria-label="Voltar"
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Passo {passoAtual} de {totalPassos}</span>
            <span>{Math.round(progresso)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
        {subtitulo && <p className="text-gray-500 text-sm">{subtitulo}</p>}
      </div>

      <div className="flex-1 flex flex-col">{children}</div>
    </main>
  );
}
