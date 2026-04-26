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
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <img src={foto.url} alt="Pré-visualização" className="flex-1 object-contain w-full" />
        <div className="bg-black p-4 flex flex-col gap-3 pb-8">
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
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

      <div className="flex-1 relative overflow-hidden">
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

      <div className="bg-black p-4 pb-8 flex flex-col items-center gap-3">
        <p className="text-white/80 text-xs text-center">Boa iluminação · Sem filtros · Placa legível</p>
        <button
          onClick={capturar}
          disabled={carregando || !!erro}
          aria-label="Tirar foto"
          className="w-20 h-20 rounded-full bg-white border-4 border-white/40 active:scale-95 transition-all disabled:opacity-40"
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
