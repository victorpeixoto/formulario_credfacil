'use client';

interface BotaoAvancarProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  loading?: boolean;
  onVoltar?: () => void;
}

export default function BotaoAvancar({
  onClick,
  disabled = false,
  label = 'Continuar',
  loading = false,
  onVoltar,
}: BotaoAvancarProps) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full py-4 rounded-2xl text-white font-semibold text-lg
          bg-green-500 hover:bg-green-600 active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200"
      >
        {loading ? 'Aguarde...' : label}
      </button>

      {onVoltar && (
        <button
          onClick={onVoltar}
          type="button"
          className="w-full py-3 rounded-2xl text-gray-500 font-medium text-sm
            hover:text-gray-700 hover:bg-gray-50 active:scale-95
            transition-all duration-200"
        >
          Voltar
        </button>
      )}
    </div>
  );
}
