'use client';

import BotaoAvancar from '@/components/BotaoAvancar';

interface Props {
  aceito: boolean;
  onChange: (v: boolean) => void;
  onAvancar: () => void;
  loading?: boolean;
  onVoltar?: () => void;
}

export default function CardAceite({ aceito, onChange, onAvancar, loading, onVoltar }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Condições do crédito</h2>
        <p className="text-gray-500 mt-1 text-sm">Leia e confirme antes de prosseguir.</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 text-sm text-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-500">Valor</span>
          <span className="font-semibold">R$ 500,00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Parcelas</span>
          <span className="font-semibold">4x de R$ 200,00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Frequência</span>
          <span className="font-semibold">1x por semana</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Primeiro pagamento</span>
          <span className="font-semibold">Em 7 dias</span>
        </div>
        <hr className="border-gray-200" />
        <p className="text-xs text-gray-400 leading-relaxed">
          A análise está sujeita a aprovação. O envio deste formulário não garante a liberação do crédito.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 accent-green-500 cursor-pointer"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          Li e concordo com as condições acima e autorizo o contato para análise do meu pedido.
        </span>
      </label>

      <BotaoAvancar
        onClick={onAvancar}
        disabled={!aceito}
        label="Enviar solicitação"
        loading={loading}
        onVoltar={onVoltar}
      />
    </div>
  );
}
