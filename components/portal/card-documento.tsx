'use client';

import type { TipoDocumento } from '@/types/documentos';

interface CardDocumentoProps {
  tipo: TipoDocumento;
  status: string;
  motivo: string | null;
  tentativas: number;
  onReenviar?: () => void;
  desabilitado?: boolean;
}

const LABELS: Record<TipoDocumento, string> = {
  cnh: 'CNH',
  comprovante: 'Comprovante de residência',
  selfie: 'Selfie ao lado do veículo',
  videoApp: 'Vídeo do aplicativo',
  videoVeiculo: 'Vídeo do veículo',
};

const ICONES: Record<TipoDocumento, string> = {
  cnh: '🪪',
  comprovante: '🏠',
  selfie: '🤳',
  videoApp: '📱',
  videoVeiculo: '🚗',
};

const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string }> = {
  pendente: { label: 'Pendente', cor: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200' },
  enviado: { label: 'Enviado', cor: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  processando: { label: 'Analisando', cor: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  aprovado: { label: 'Aprovado', cor: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  rejeitado: { label: 'Rejeitado', cor: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  erro: { label: 'Erro', cor: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  analise_manual: { label: 'Em análise', cor: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300' },
};

export default function CardDocumento({
  tipo,
  status,
  motivo,
  tentativas,
  onReenviar,
  desabilitado,
}: CardDocumentoProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
  const podeReenviar = (status === 'rejeitado' || status === 'erro') && !desabilitado;
  const analisando = status === 'processando' || status === 'enviado';

  return (
    <div
      className={`
        rounded-2xl border p-4 transition-all duration-300
        ${config.border}
        ${podeReenviar ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]' : ''}
        ${analisando ? 'animate-pulse' : ''}
      `}
      onClick={podeReenviar ? onReenviar : undefined}
      role={podeReenviar ? 'button' : undefined}
      tabIndex={podeReenviar ? 0 : undefined}
      onKeyDown={podeReenviar ? (e) => { if (e.key === 'Enter') onReenviar?.(); } : undefined}
    >
      <div className="flex items-center gap-3">
        {/* Ícone */}
        <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center text-xl shrink-0`}>
          {status === 'aprovado' ? (
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            ICONES[tipo]
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{LABELS[tipo]}</p>
          {motivo && (status === 'rejeitado' || status === 'erro') && (
            <p className="text-xs text-red-400 mt-0.5 line-clamp-2">{motivo}</p>
          )}
          {status === 'erro' && !motivo && (
            <p className="text-xs text-amber-500 mt-0.5">Erro técnico — reenvie o documento</p>
          )}
          {status === 'analise_manual' && (
            <p className="text-xs text-amber-600 mt-0.5">Comprovante em nome de terceiro — aguardando análise</p>
          )}
          {analisando && (
            <p className="text-xs text-blue-400 mt-0.5">Validação em andamento...</p>
          )}
        </div>

        {/* Badge de status + ação */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.cor}`}>
            {config.label}
          </span>
          {podeReenviar && (
            <span className="text-xs text-blue-500 font-medium">
              Reenviar →
            </span>
          )}
          {tentativas >= 3 && status === 'rejeitado' && (
            <span className="text-[10px] text-gray-400">Em análise manual</span>
          )}
        </div>
      </div>
    </div>
  );
}
