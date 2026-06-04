'use client';

import { useRef, useState } from 'react';

type TipoDoc = 'cnh' | 'comprovante';

interface CapturaDocumentoProps {
  tipo: TipoDoc;
  onConfirmar: (file: File, previewUrl: string | undefined) => void;
  onCancelar: () => void;
}

const TAMANHO_MAX_MB = 50;

const CONFIG: Record<TipoDoc, { dicas: string[]; aviso?: string }> = {
  cnh: {
    dicas: [
      'Abra o app CNH Digital e exporte sua CNH como PDF.',
      'Envie o PDF aqui; é o formato exigido para a conferência.',
      'Confira que nome, CPF e validade aparecem no documento.',
    ],
  },
  comprovante: {
    dicas: [
      'Conta de luz, água, telefone, internet ou similar.',
      'Endereço e nome completo bem visíveis.',
      'Aceita imagem ou PDF.',
    ],
    aviso: 'Atenção: o comprovante deve ter sido emitido nos últimos 90 dias.',
  },
};

export default function CapturaDocumento({ tipo, onConfirmar, onCancelar }: CapturaDocumentoProps) {
  const config = CONFIG[tipo];
  const cnhSomentePdf = tipo === 'cnh';
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<{ file: File; url?: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleArquivo = (file: File) => {
    setErro(null);
    if (cnhSomentePdf && !file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Envie a CNH em PDF exportado do app CNH Digital.');
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErro(`Arquivo muito grande (máximo ${TAMANHO_MAX_MB}MB).`);
      return;
    }
    const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setArquivo({ file, url });
  };

  const refazer = () => {
    if (arquivo?.url) URL.revokeObjectURL(arquivo.url);
    setArquivo(null);
    setErro(null);
  };

  if (arquivo) {
    return (
      <div className="flex flex-col gap-4 flex-1">
        {arquivo.url ? (
          <img
            src={arquivo.url}
            alt="Pré-visualização"
            className="w-full max-h-[55vh] object-contain rounded-2xl border border-gray-200 bg-gray-50"
          />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-2">
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-gray-600 text-sm font-medium">{arquivo.file.name}</p>
            <p className="text-gray-400 text-xs">{(arquivo.file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        )}
        <p className="text-gray-600 text-sm text-center">Está legível? Todos os dados aparecem?</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onConfirmar(arquivo.file, arquivo.url)}
            className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all"
          >
            Usar este arquivo
          </button>
          <button
            onClick={refazer}
            className="w-full py-3 rounded-2xl text-gray-500 font-medium text-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            Refazer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1">
      {config.aviso && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
          <p className="text-orange-800 text-xs font-medium">{config.aviso}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-blue-900 text-sm font-semibold mb-2">Dicas:</p>
        <ul className="space-y-1.5">
          {config.dicas.map((d, i) => (
            <li key={i} className="text-blue-800 text-xs flex gap-2">
              <span className="text-blue-500">•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>

      {erro && <p className="text-red-500 text-sm">{erro}</p>}

      {!cnhSomentePdf && (
        <input
          ref={inputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleArquivo(file);
          }}
        />
      )}
      <input
        ref={inputArquivoRef}
        type="file"
        accept={cnhSomentePdf ? 'application/pdf,.pdf' : 'image/*,.pdf'}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleArquivo(file);
        }}
      />

      <div className="flex flex-col gap-3 mt-auto">
        {!cnhSomentePdf && (
          <button
            onClick={() => inputCameraRef.current?.click()}
            className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
              <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.81-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.67.9l.8 1.2A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
            Tirar foto agora
          </button>
        )}
        <button
          onClick={() => inputArquivoRef.current?.click()}
          className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          {cnhSomentePdf ? 'Escolher PDF da CNH Digital' : 'Escolher arquivo do celular'}
        </button>
        <button
          onClick={onCancelar}
          className="w-full py-2 text-gray-400 text-xs hover:text-gray-600 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
