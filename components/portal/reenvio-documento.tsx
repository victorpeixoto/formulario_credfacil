'use client';

import { useState } from 'react';
import type { TipoDocumento } from '@/types/documentos';
import CapturaDocumento from '@/components/captura/captura-documento';
import CapturaSelfie from '@/components/captura/captura-selfie';
import CapturaVideo from '@/components/captura/captura-video';

interface ReenvioDocumentoProps {
  tipo: TipoDocumento;
  motivo: string | null;
  onConcluido: () => void;
  onCancelar: () => void;
}

const LABELS: Record<TipoDocumento, string> = {
  cnh: 'CNH',
  comprovante: 'Comprovante de residência',
  selfie: 'Selfie ao lado do veículo',
  videoApp: 'Vídeo do aplicativo',
  videoVeiculo: 'Vídeo do veículo',
};

export default function ReenvioDocumento({
  tipo,
  motivo,
  onConcluido,
  onCancelar,
}: ReenvioDocumentoProps) {
  const [etapa, setEtapa] = useState<'captura' | 'enviando' | 'erro'>('captura');
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const fazerUploadEReenviar = async (file: File) => {
    setEtapa('enviando');
    setErroMsg(null);

    try {
      // 1. Obter URL de upload
      const ext = file.name.split('.').pop() ?? (file.type.split('/')[1] || 'bin');
      const presignedRes = await fetch(`/api/upload/presigned-url?tipo=${tipo}&ext=${ext}`);
      if (!presignedRes.ok) throw new Error('Falha ao obter URL de upload');
      const { uploadUrl, fileKey, contentType } = await presignedRes.json();

      // 2. Upload para R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`Upload falhou (${uploadRes.status})`);

      // 3. Iniciar validação com reenvio=true
      const iniciarRes = await fetch('/api/validacao/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentos: { [tipo]: fileKey },
          reenvio: true,
          tiposReenvio: [tipo],
        }),
      });
      if (!iniciarRes.ok) throw new Error('Falha ao iniciar validação');

      // Sucesso — voltar ao portal
      onConcluido();
    } catch (err) {
      console.error(`[reenvio] Erro ao reenviar ${tipo}:`, err);
      setErroMsg('Erro ao enviar. Verifique sua conexão e tente novamente.');
      setEtapa('erro');
    }
  };

  // Tela de enviando
  if (etapa === 'enviando') {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto gap-4">
        <div className="w-12 h-12 rounded-full border-3 border-green-200 border-t-green-500 animate-spin" />
        <p className="text-gray-700 font-semibold">Enviando {LABELS[tipo].toLowerCase()}...</p>
        <p className="text-gray-400 text-sm">Aguarde um momento</p>
      </div>
    );
  }

  // Tela de erro
  if (etapa === 'erro') {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto gap-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-gray-800 font-semibold text-center">{erroMsg}</p>
        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            onClick={() => setEtapa('captura')}
            className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all"
          >
            Tentar novamente
          </button>
          <button
            onClick={onCancelar}
            className="w-full py-3 rounded-2xl text-gray-500 font-medium text-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            Voltar ao portal
          </button>
        </div>
      </div>
    );
  }

  // Header com motivo da rejeição
  const headerRejeicao = motivo ? (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
      <p className="text-red-800 text-xs font-semibold mb-1">Motivo da rejeição anterior:</p>
      <p className="text-red-600 text-xs">{motivo}</p>
    </div>
  ) : null;

  // Renderizar componente de captura conforme o tipo
  if (tipo === 'selfie') {
    return (
      <div className="flex flex-col">
        <div className="px-6 pt-6 max-w-md mx-auto w-full">
          <button
            onClick={onCancelar}
            className="flex items-center gap-1 text-gray-500 text-sm mb-3 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar ao portal
          </button>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Reenviar {LABELS[tipo]}</h2>
          {headerRejeicao}
        </div>
        <CapturaSelfie
          onCancelar={onCancelar}
          onConfirmar={(blob) => {
            const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
            fazerUploadEReenviar(file);
          }}
        />
      </div>
    );
  }

  if (tipo === 'cnh' || tipo === 'comprovante') {
    return (
      <main className="min-h-dvh bg-white flex flex-col px-6 py-6 max-w-md mx-auto gap-5">
        <button
          onClick={onCancelar}
          className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors self-start"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Voltar ao portal
        </button>
        <h2 className="text-lg font-bold text-gray-900">Reenviar {LABELS[tipo]}</h2>
        {headerRejeicao}
        <CapturaDocumento
          tipo={tipo}
          onCancelar={onCancelar}
          onConfirmar={(file) => fazerUploadEReenviar(file)}
        />
      </main>
    );
  }

  // videoApp ou videoVeiculo
  return (
    <main className="min-h-dvh bg-white flex flex-col px-6 py-6 max-w-md mx-auto gap-5">
      <button
        onClick={onCancelar}
        className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors self-start"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Voltar ao portal
      </button>
      <h2 className="text-lg font-bold text-gray-900">Reenviar {LABELS[tipo]}</h2>
      {headerRejeicao}
      <CapturaVideo
        tipo={tipo as 'videoApp' | 'videoVeiculo'}
        onCancelar={onCancelar}
        onConfirmar={(file) => fazerUploadEReenviar(file)}
      />
    </main>
  );
}
