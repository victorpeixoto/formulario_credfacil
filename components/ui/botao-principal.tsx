'use client';

import { ReactNode } from 'react';

interface BotaoPrincipalProps {
  executando?: boolean;
  textoExecutando?: string;
  onClick: () => void;
  disabled?: boolean;
  variante?: 'verde' | 'cinza';
  children: ReactNode;
  className?: string;
}

const Spinner = () => (
  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
);

export function BotaoPrincipal({
  executando = false,
  textoExecutando,
  onClick,
  disabled = false,
  variante = 'verde',
  children,
  className = '',
}: BotaoPrincipalProps) {
  const base =
    'w-full py-4 rounded-2xl font-semibold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 touch-manipulation';
  const cores =
    variante === 'verde'
      ? 'bg-green-500 hover:bg-green-600 text-white'
      : 'text-gray-500 hover:bg-gray-50';
  // pointer-events-none é necessário no iOS Safari: disabled não bloqueia touchstart nativamente
  const desabilitado =
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:pointer-events-none';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || executando}
      className={`${base} ${cores} ${desabilitado} ${className}`}
    >
      {executando && <Spinner />}
      {executando && textoExecutando ? textoExecutando : children}
    </button>
  );
}
