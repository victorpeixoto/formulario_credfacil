'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { TipoDocumento } from '@/types/documentos';
import PassoWizard from '@/components/captura/passo-wizard';
import CapturaDocumento from '@/components/captura/captura-documento';
import CapturaSelfie from '@/components/captura/captura-selfie';
import CapturaVideo from '@/components/captura/captura-video';
import { BotaoPrincipal } from '@/components/ui/botao-principal';
import { useAcaoUnica } from '@/lib/hooks/use-acao-unica';

type ModoCaptura = 'documento-cnh' | 'documento-comprovante' | 'selfie' | 'videoApp' | 'videoVeiculo' | null;

interface ItemEnviado {
  tipo: TipoDocumento;
  fileKey: string;
  previewUrl?: string;
  enviando?: boolean;
}

const ORDEM: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];

const TITULOS: Record<TipoDocumento, { titulo: string; subtitulo: string }> = {
  cnh: {
    titulo: 'Sua CNH',
    subtitulo: 'Envie sua CNH em PDF, exportado do app CNH Digital (Carteira Digital de Trânsito). É o formato que garante a leitura correta dos seus dados.',
  },
  comprovante: {
    titulo: 'Comprovante de residência',
    subtitulo: 'Conta de luz, água, internet — emitido nos últimos 90 dias.',
  },
  selfie: {
    titulo: 'Selfie ao lado do veículo',
    subtitulo: 'Seu rosto e a placa do veículo, no mesmo enquadramento.',
  },
  videoApp: {
    titulo: 'Vídeo do aplicativo',
    subtitulo: 'Mostre seu perfil no app de motorista, com faturamento e corridas.',
  },
  videoVeiculo: {
    titulo: 'Vídeo do veículo',
    subtitulo: 'Veículo ligado, placa visível, volta de 360°.',
  },
};

export default function PageDocumentos() {
  const router = useRouter();
  const [verificandoRedirect, setVerificandoRedirect] = useState(true);
  const [passo, setPasso] = useState(0); // 0..4 = capturas, 5 = resumo
  const [enviados, setEnviados] = useState<Record<TipoDocumento, ItemEnviado | undefined>>({
    cnh: undefined,
    comprovante: undefined,
    selfie: undefined,
    videoApp: undefined,
    videoVeiculo: undefined,
  });
  const [modoCaptura, setModoCaptura] = useState<ModoCaptura>(null);
  const [enviandoPipeline, setEnviandoPipeline] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);

  const acaoAbrirCaptura = useAcaoUnica();
  const acaoContinuar = useAcaoUnica();
  const acaoRefazer = useAcaoUnica();
  const acaoEnviarAnalise = useAcaoUnica(0);
  const acaoRefazerResumo = useAcaoUnica();

  // Verificar se já tem documentos — se sim, redirecionar para o portal
  useEffect(() => {
    fetch('/api/candidato')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.statusDocumentos !== 'AGUARDANDO_DOCUMENTOS') {
          router.replace('/status');
          return;
        }
        setVerificandoRedirect(false);
      })
      .catch(() => setVerificandoRedirect(false));
  }, [router]);

  const tipoAtual = ORDEM[passo];
  const todosCompletos = ORDEM.every((t) => enviados[t]?.fileKey);

  // Mostrar loading enquanto verifica redirect
  if (verificandoRedirect) {
    return (
      <main className="flex-1 w-full bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-green-500 animate-spin" />
      </main>
    );
  }

  const fazerUpload = async (tipo: TipoDocumento, file: File, previewUrl?: string) => {
    setErroUpload(null);
    setEnviados((prev) => ({
      ...prev,
      [tipo]: { tipo, fileKey: '', previewUrl, enviando: true },
    }));
    try {
      const ext = file.name.split('.').pop() ?? (file.type.split('/')[1] || 'bin');
      const res = await fetch(`/api/upload/presigned-url?tipo=${tipo}&ext=${ext}`);
      if (!res.ok) throw new Error('Falha ao obter URL de upload');
      const { uploadUrl, fileKey, contentType } = await res.json();

      const upRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!upRes.ok) throw new Error(`Upload falhou (${upRes.status})`);

      setEnviados((prev) => ({
        ...prev,
        [tipo]: { tipo, fileKey, previewUrl, enviando: false },
      }));
      setModoCaptura(null);
      // Avança automaticamente
      setPasso((p) => Math.min(p + 1, ORDEM.length));
    } catch (err) {
      console.error('[documentos] upload erro:', err);
      setEnviados((prev) => ({ ...prev, [tipo]: undefined }));
      setErroUpload('Erro ao enviar. Verifique sua conexão e tente novamente.');
      setModoCaptura(null);
    }
  };

  const abrirCapturaPara = (tipo: TipoDocumento) => {
    if (tipo === 'cnh') setModoCaptura('documento-cnh');
    else if (tipo === 'comprovante') setModoCaptura('documento-comprovante');
    else if (tipo === 'selfie') setModoCaptura('selfie');
    else if (tipo === 'videoApp') setModoCaptura('videoApp');
    else if (tipo === 'videoVeiculo') setModoCaptura('videoVeiculo');
  };

  const enviarParaAnalise = async () => {
    setEnviandoPipeline(true);
    try {
      const documentos = Object.fromEntries(
        ORDEM.map((t) => [t, enviados[t]!.fileKey])
      ) as Record<TipoDocumento, string>;

      const res = await fetch('/api/validacao/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentos }),
      });
      if (!res.ok) throw new Error('Erro ao iniciar validação');
      router.refresh();
      router.push('/status');
    } catch (err) {
      console.error('[documentos] iniciar erro:', err);
      setEnviandoPipeline(false);
      setErroUpload('Não foi possível iniciar a análise. Tente novamente.');
    }
  };

  // Tela de captura ativa
  if (modoCaptura === 'selfie') {
    return (
      <CapturaSelfie
        onCancelar={() => setModoCaptura(null)}
        onConfirmar={(blob, url) => {
          const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
          fazerUpload('selfie', file, url);
        }}
      />
    );
  }

  // Resumo (passo 5)
  if (passo >= ORDEM.length) {
    return (
      <PassoWizard
        passoAtual={ORDEM.length}
        totalPassos={ORDEM.length}
        titulo="Tudo pronto!"
        subtitulo="Confira seus documentos antes de enviar para análise."
        onVoltar={() => setPasso(ORDEM.length - 1)}
      >
        <div className="flex flex-col gap-3 mt-2">
          {ORDEM.map((tipo) => {
            const item = enviados[tipo];
            return (
              <div key={tipo} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                {item?.previewUrl ? (
                  <img src={item.previewUrl} alt={TITULOS[tipo].titulo} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">{tipo.startsWith('video') ? '🎥' : '📄'}</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{TITULOS[tipo].titulo}</p>
                  <p className="text-xs text-green-500">✓ Enviado</p>
                </div>
                <button
                  type="button"
                  disabled={acaoRefazerResumo.executando}
                  onClick={() =>
                    acaoRefazerResumo.executar(() => {
                      setEnviados((prev) => ({ ...prev, [tipo]: undefined }));
                      setPasso(ORDEM.indexOf(tipo));
                    })
                  }
                  className="text-xs text-blue-500 hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none touch-manipulation"
                >
                  {acaoRefazerResumo.executando ? 'Resetando...' : 'Refazer'}
                </button>
              </div>
            );
          })}
        </div>

        {erroUpload && <p className="text-red-500 text-sm mt-3">{erroUpload}</p>}

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <BotaoPrincipal
            executando={enviandoPipeline || acaoEnviarAnalise.executando}
            textoExecutando="Iniciando análise..."
            disabled={!todosCompletos}
            onClick={() => acaoEnviarAnalise.executar(enviarParaAnalise)}
          >
            Enviar para análise
          </BotaoPrincipal>
        </div>
      </PassoWizard>
    );
  }

  const titulo = TITULOS[tipoAtual];
  const itemAtual = enviados[tipoAtual];

  return (
    <PassoWizard
      passoAtual={passo + 1}
      totalPassos={ORDEM.length}
      titulo={titulo.titulo}
      subtitulo={titulo.subtitulo}
      onVoltar={passo > 0 ? () => setPasso(passo - 1) : undefined}
    >
      {modoCaptura === 'documento-cnh' && (
        <CapturaDocumento
          tipo="cnh"
          onCancelar={() => setModoCaptura(null)}
          onConfirmar={(file, url) => fazerUpload('cnh', file, url)}
        />
      )}
      {modoCaptura === 'documento-comprovante' && (
        <CapturaDocumento
          tipo="comprovante"
          onCancelar={() => setModoCaptura(null)}
          onConfirmar={(file, url) => fazerUpload('comprovante', file, url)}
        />
      )}
      {modoCaptura === 'videoApp' && (
        <CapturaVideo
          tipo="videoApp"
          onCancelar={() => setModoCaptura(null)}
          onConfirmar={(file, url) => fazerUpload('videoApp', file, url)}
        />
      )}
      {modoCaptura === 'videoVeiculo' && (
        <CapturaVideo
          tipo="videoVeiculo"
          onCancelar={() => setModoCaptura(null)}
          onConfirmar={(file, url) => fazerUpload('videoVeiculo', file, url)}
        />
      )}

      {!modoCaptura && (
        <div className="flex flex-col gap-5 flex-1">
          {itemAtual?.enviando && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
              <p className="text-blue-800 text-sm">Enviando arquivo...</p>
            </div>
          )}

          {itemAtual?.fileKey && !itemAtual.enviando && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
              {itemAtual.previewUrl ? (
                <img src={itemAtual.previewUrl} alt="Pré-visualização" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">{tipoAtual.startsWith('video') ? '🎥' : '📄'}</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-green-800 text-sm font-semibold">Documento enviado</p>
                <p className="text-green-600 text-xs">Pronto para o próximo passo</p>
              </div>
            </div>
          )}

          {erroUpload && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-red-700 text-sm">{erroUpload}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-auto pt-6">
            {!itemAtual?.fileKey && (
              <BotaoPrincipal
                executando={acaoAbrirCaptura.executando}
                textoExecutando="Abrindo..."
                onClick={() => acaoAbrirCaptura.executar(() => abrirCapturaPara(tipoAtual))}
              >
                {tipoAtual.startsWith('video') ? 'Continuar' : tipoAtual === 'selfie' ? 'Abrir câmera' : 'Enviar documento'}
              </BotaoPrincipal>
            )}

            {itemAtual?.fileKey && !itemAtual.enviando && (
              <>
                <BotaoPrincipal
                  executando={acaoContinuar.executando}
                  textoExecutando="Avançando..."
                  onClick={() =>
                    acaoContinuar.executar(() =>
                      setPasso((p) => (p === passo ? p + 1 : p))
                    )
                  }
                >
                  Continuar
                </BotaoPrincipal>
                <BotaoPrincipal
                  variante="cinza"
                  executando={acaoRefazer.executando}
                  textoExecutando="Resetando..."
                  onClick={() =>
                    acaoRefazer.executar(() => {
                      setEnviados((prev) => ({ ...prev, [tipoAtual]: undefined }));
                      abrirCapturaPara(tipoAtual);
                    })
                  }
                  className="py-3 text-sm font-medium"
                >
                  Refazer
                </BotaoPrincipal>
              </>
            )}
          </div>
        </div>
      )}
    </PassoWizard>
  );
}
