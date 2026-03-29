'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { TipoDocumento } from '@/types/documentos';

const TAMANHO_MAX_MB = 50;

interface SlotConfig {
  tipo: TipoDocumento;
  label: string;
  instrucao: string;
  aceita: string;
}

const SLOTS: SlotConfig[] = [
  { tipo: 'cnh', label: 'CNH', instrucao: 'Foto frente e verso, legível', aceita: 'image/*,.pdf' },
  { tipo: 'comprovante', label: 'Comprovante de residência', instrucao: 'Emitido há no máximo 90 dias', aceita: 'image/*,.pdf' },
  { tipo: 'selfie', label: 'Selfie ao lado do veículo', instrucao: 'Seu rosto e a placa visíveis', aceita: 'image/*' },
  { tipo: 'videoApp', label: 'Vídeo do aplicativo', instrucao: 'Tela do app sem cortes', aceita: 'video/*' },
  { tipo: 'videoVeiculo', label: 'Vídeo do veículo', instrucao: 'Veículo ligado, placa visível', aceita: 'video/*' },
];

interface UploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  fileKey?: string;
  preview?: string;
  erro?: string;
}

export default function PageDocumentos() {
  const router = useRouter();
  const [uploads, setUploads] = useState<Record<TipoDocumento, UploadState>>({
    cnh: { status: 'idle' },
    comprovante: { status: 'idle' },
    selfie: { status: 'idle' },
    videoApp: { status: 'idle' },
    videoVeiculo: { status: 'idle' },
  });
  const [enviando, setEnviando] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const todosEnviados = SLOTS.every((s) => uploads[s.tipo].status === 'done');

  const handleSelecionar = async (tipo: TipoDocumento, file: File) => {
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setUploads((prev) => ({
        ...prev,
        [tipo]: { status: 'error', erro: `Arquivo muito grande (máx. ${TAMANHO_MAX_MB}MB)` },
      }));
      return;
    }

    setUploads((prev) => ({ ...prev, [tipo]: { status: 'uploading' } }));

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const res = await fetch(`/api/upload/presigned-url?tipo=${tipo}&ext=${ext}`);
      if (!res.ok) throw new Error('Erro ao obter URL de upload');
      const { uploadUrl, fileKey } = await res.json();

      await fetch(uploadUrl, { method: 'PUT', body: file });

      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      setUploads((prev) => ({
        ...prev,
        [tipo]: { status: 'done', fileKey, preview },
      }));
    } catch (err) {
      console.error('[documentos] upload error:', err);
      setUploads((prev) => ({
        ...prev,
        [tipo]: { status: 'error', erro: 'Erro no envio. Tente novamente.' },
      }));
    }
  };

  const handleIniciarValidacao = async () => {
    setEnviando(true);
    try {
      const documentos = Object.fromEntries(
        SLOTS.map((s) => [s.tipo, uploads[s.tipo].fileKey!])
      ) as Record<TipoDocumento, string>;

      const res = await fetch('/api/validacao/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentos }),
      });

      if (!res.ok) throw new Error('Erro ao iniciar validação');
      router.push('/status');
    } catch (err) {
      console.error('[documentos] iniciar error:', err);
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-dvh bg-white flex flex-col px-6 py-10 max-w-md mx-auto gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Envie seus documentos</h1>
        <p className="text-gray-500 text-sm">Todos os 5 documentos são obrigatórios.</p>
      </div>

      <div className="flex flex-col gap-4">
        {SLOTS.map(({ tipo, label, instrucao, aceita }) => {
          const upload = uploads[tipo];
          return (
            <div key={tipo} className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{label}</p>
                  <p className="text-gray-400 text-xs">{instrucao}</p>
                </div>
                {upload.status === 'done' && (
                  <span className="text-green-500 text-xs font-semibold">✓ Enviado</span>
                )}
                {upload.status === 'uploading' && (
                  <span className="text-blue-400 text-xs">Enviando...</span>
                )}
                {upload.status === 'error' && (
                  <span className="text-red-400 text-xs">Erro</span>
                )}
              </div>

              {upload.preview && (
                <img src={upload.preview} alt={label} className="w-full h-32 object-cover rounded-xl" />
              )}

              {upload.erro && <p className="text-red-400 text-xs">{upload.erro}</p>}

              <input
                ref={(el) => { inputRefs.current[tipo] = el; }}
                type="file"
                accept={aceita}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSelecionar(tipo, file);
                }}
              />
              <button
                onClick={() => inputRefs.current[tipo]?.click()}
                disabled={upload.status === 'uploading'}
                className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {upload.status === 'done' ? 'Trocar arquivo' : 'Selecionar arquivo'}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleIniciarValidacao}
        disabled={!todosEnviados || enviando}
        className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? 'Aguarde...' : `Enviar para análise (${SLOTS.filter((s) => uploads[s.tipo].status === 'done').length}/5)`}
      </button>
    </main>
  );
}
