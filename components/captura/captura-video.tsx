'use client';

import { useRef, useState } from 'react';
import ChecklistConfirmacao from './checklist-confirmacao';

type TipoVideo = 'videoApp' | 'videoVeiculo';

interface CapturaVideoProps {
  tipo: TipoVideo;
  onConfirmar: (file: File, previewUrl: string) => void;
  onCancelar: () => void;
}

const CHECKLISTS: Record<TipoVideo, { titulo: string; itens: string[]; instrucoes: string[]; duracaoMaxS: number }> = {
  videoApp: {
    titulo: 'Vídeo do aplicativo',
    instrucoes: [
      'Grave a tela do seu celular usando outro aparelho (ou screen recording).',
      'Mostre: perfil → faturamento dos últimos 6 meses → corridas.',
      'O vídeo deve ser contínuo, sem cortes ou edições.',
    ],
    itens: [
      'É o meu perfil (não emprestado de outra pessoa)',
      'A placa visível no app é a mesma do meu veículo',
      'Vídeo gravado sem cortes nem edições',
      'Faturamento e número de corridas estão visíveis',
    ],
    duracaoMaxS: 90,
  },
  videoVeiculo: {
    titulo: 'Vídeo do veículo',
    instrucoes: [
      'Filme o veículo ligado, mostrando a placa por pelo menos 3 segundos.',
      'Dê uma volta lenta de 360° pelo veículo.',
      'Mostre o painel aceso (luz do motor / velocímetro).',
    ],
    itens: [
      'O veículo está ligado durante toda a gravação',
      'A placa está nítida e legível no vídeo',
      'Dei a volta completa pelo veículo',
      'O painel está aceso',
    ],
    duracaoMaxS: 60,
  },
};

const TAMANHO_MAX_MB = 50;

export default function CapturaVideo({ tipo, onConfirmar, onCancelar }: CapturaVideoProps) {
  const config = CHECKLISTS[tipo];
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const [checklistOk, setChecklistOk] = useState(false);
  const [arquivo, setArquivo] = useState<{ file: File; url: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const validarDuracao = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });

  const handleArquivo = async (file: File) => {
    setErro(null);
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErro(`Arquivo muito grande (máximo ${TAMANHO_MAX_MB}MB).`);
      return;
    }
    const duracao = await validarDuracao(file);
    if (duracao > config.duracaoMaxS + 5) {
      setErro(`Vídeo muito longo (máximo ${config.duracaoMaxS}s). Refaça mais curto.`);
      return;
    }
    if (duracao > 0 && duracao < 3) {
      setErro('Vídeo muito curto. Grave por pelo menos 3 segundos.');
      return;
    }
    const url = URL.createObjectURL(file);
    setArquivo({ file, url });
  };

  const refazer = () => {
    if (arquivo) URL.revokeObjectURL(arquivo.url);
    setArquivo(null);
    setErro(null);
  };

  if (arquivo) {
    return (
      <div className="flex flex-col gap-4 flex-1">
        <video
          src={arquivo.url}
          controls
          playsInline
          className="w-full max-h-[55vh] object-contain rounded-2xl bg-black"
        />
        <p className="text-gray-600 text-sm text-center">Confira se o vídeo atende todos os requisitos.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onConfirmar(arquivo.file, arquivo.url)}
            className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all"
          >
            Usar este vídeo
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
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-blue-900 text-sm font-semibold mb-2">Como gravar:</p>
        <ul className="space-y-1.5">
          {config.instrucoes.map((inst, i) => (
            <li key={i} className="text-blue-800 text-xs flex gap-2">
              <span className="text-blue-500">•</span>
              <span>{inst}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-gray-700 text-sm font-semibold">Confirme antes de continuar:</p>
        <ChecklistConfirmacao itens={config.itens} onTodosMarcados={setChecklistOk} />
      </div>

      {erro && <p className="text-red-500 text-sm">{erro}</p>}

      <input
        ref={inputCameraRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleArquivo(file);
        }}
      />
      <input
        ref={inputGaleriaRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleArquivo(file);
        }}
      />

      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={() => inputCameraRef.current?.click()}
          disabled={!checklistOk}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {checklistOk ? 'Gravar vídeo agora' : 'Marque todos os itens acima'}
        </button>
        <button
          onClick={() => inputGaleriaRef.current?.click()}
          disabled={!checklistOk}
          className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 17l4-4a2 2 0 012.8 0L14 16m-2-3l2-2a2 2 0 012.8 0L20 14" />
          </svg>
          Escolher da galeria
        </button>
        <button
          onClick={onCancelar}
          className="w-full py-3 rounded-2xl text-gray-500 font-medium text-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
