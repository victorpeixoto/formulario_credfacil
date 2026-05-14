'use client';

import { useEffect, useRef, useState } from 'react';

interface CapturaSelfieProps {
  onConfirmar: (blob: Blob, previewUrl: string) => void;
  onCancelar: () => void;
}

type Camera = 'user' | 'environment';

export default function CapturaSelfie({ onConfirmar, onCancelar }: CapturaSelfieProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [camera, setCamera] = useState<Camera>('user');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);

  const pararCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const iniciarCamera = async (modo: Camera) => {
    setErro(null);
    setCarregando(true);
    pararCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: modo, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('[captura-selfie] erro câmera:', err);
      setErro('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    iniciarCamera(camera);
    return () => pararCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  const capturar = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (camera === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setFoto({ blob, url });
          pararCamera();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const refazer = () => {
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto(null);
    iniciarCamera(camera);
  };

  if (foto) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex flex-col"
        style={{ height: '100svh' }}
      >
        <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
          <img
            src={foto.url}
            alt="Pré-visualização"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div
          className="bg-black p-4 flex flex-col gap-3 shrink-0"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-white text-center text-sm">A foto ficou boa? O rosto e a placa do veículo estão visíveis?</p>
          <div className="flex gap-3">
            <button
              onClick={refazer}
              className="flex-1 py-4 rounded-2xl bg-gray-800 text-white font-semibold active:scale-95 transition-all"
            >
              Refazer
            </button>
            <button
              onClick={() => onConfirmar(foto.blob, foto.url)}
              className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-semibold active:scale-95 transition-all"
            >
              Usar esta foto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      style={{ height: '100dvh' }}
    >
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        <button
          onClick={onCancelar}
          aria-label="Fechar"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => setCamera((c) => (c === 'user' ? 'environment' : 'user'))}
          aria-label="Trocar câmera"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
            <path d="M20 12a8 8 0 10-3.5 6.6M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {erro ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="text-white text-sm">{erro}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${camera === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {carregando && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-sm">Abrindo câmera...</p>
              </div>
            )}
            {/* Overlay de orientação */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <svg className="w-48 h-48 text-white/40" fill="none" viewBox="0 0 200 200">
                <ellipse cx="100" cy="80" rx="40" ry="48" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
                <path d="M40 180 Q100 130 160 180" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" fill="none" />
              </svg>
              <div className="mt-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur">
                <p className="text-white text-xs">Rosto + placa do veículo no quadro</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className="bg-black p-4 flex flex-col items-center gap-3 shrink-0"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <p className="text-white/80 text-xs text-center">Boa iluminação · Sem filtros · Placa legível</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            setFoto({ blob: f, url });
            pararCamera();
          }}
        />

        <div className="flex items-center justify-center gap-8 w-full">
          <div className="w-14" aria-hidden />
          <button
            onClick={capturar}
            disabled={carregando || !!erro}
            aria-label="Tirar foto"
            className="w-20 h-20 rounded-full bg-white border-4 border-white/40 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center shadow-lg ring-4 ring-white/20"
          >
            <svg className="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 7h3l2-3h8l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
              <circle cx="12" cy="13" r="4" strokeWidth="2" />
            </svg>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Escolher da galeria"
            className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 active:scale-95 transition-all flex flex-col items-center justify-center text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 17l4-4a2 2 0 012.8 0L14 16m-2-3l2-2a2 2 0 012.8 0L20 14" />
              <circle cx="9" cy="10" r="1.2" fill="currentColor" />
            </svg>
            <span className="text-[10px] mt-0.5">Galeria</span>
          </button>
        </div>
        <p className="text-white text-xs">Toque para tirar a foto ou escolher da galeria</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
