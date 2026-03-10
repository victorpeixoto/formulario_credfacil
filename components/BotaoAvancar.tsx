'use client';

interface BotaoAvancarProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  loading?: boolean;
}

export default function BotaoAvancar({
  onClick,
  disabled = false,
  label = 'Continuar',
  loading = false,
}: BotaoAvancarProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="mt-8 w-full py-4 rounded-2xl text-white font-semibold text-lg
        bg-green-500 hover:bg-green-600 active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200"
    >
      {loading ? 'Aguarde...' : label}
    </button>
  );
}
