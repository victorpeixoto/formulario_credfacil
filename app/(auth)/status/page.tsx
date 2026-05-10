'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { TipoDocumento, StatusDocumentos } from '@/types/documentos';
import CardDocumento from '@/components/portal/card-documento';
import ReenvioDocumento from '@/components/portal/reenvio-documento';
import SecaoContato from '@/components/portal/secao-contato';

const TIPOS: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];

interface DadosCandidato {
  nomeCompleto: string;
  cpf: string;
  statusDocumentos: StatusDocumentos;
  documentos: Record<TipoDocumento, {
    status: string;
    motivo: string | null;
    tentativas: number;
  }>;
}

function extrairPrimeiroNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length === 0 || !partes[0]) return '';
  return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
}

export default function PagePortal() {
  const [dados, setDados] = useState<DadosCandidato | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [reenviarTipo, setReenviarTipo] = useState<TipoDocumento | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [whatsappCarregando, setWhatsappCarregando] = useState(false);
  const [reconectando, setReconectando] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Buscar dados do candidato
  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch('/api/candidato');
      if (!res.ok) return;
      const json = await res.json();
      setDados(json);
      return json as DadosCandidato;
    } catch {
      // Silenciar erro — será exibido estado de loading
    } finally {
      setCarregando(false);
    }
  }, []);

  // Buscar link WhatsApp
  const buscarWhatsApp = useCallback(async () => {
    setWhatsappCarregando(true);
    try {
      const res = await fetch('/api/whatsapp-link', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWhatsappLink(data.whatsappLink ?? null);
      }
    } catch {
      // Link opcional
    } finally {
      setWhatsappCarregando(false);
    }
  }, []);

  // SSE para atualizações em tempo real
  const conectarSSE = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource('/api/validacao/status');
    esRef.current = es;

    es.addEventListener('documento', (e) => {
      const evento = JSON.parse(e.data);
      setDados((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documentos: {
            ...prev.documentos,
            [evento.tipo]: {
              ...prev.documentos[evento.tipo as TipoDocumento],
              status: mapearStatus(evento.status),
              motivo: evento.resultado?.motivo ?? prev.documentos[evento.tipo as TipoDocumento]?.motivo ?? null,
            },
          },
        };
      });
    });

    es.addEventListener('concluido', async (e) => {
      const evento = JSON.parse(e.data);
      setDados((prev) => prev ? { ...prev, statusDocumentos: evento.statusFinal } : prev);
      es.close();

      if (evento.statusFinal === 'APROVADO') {
        buscarWhatsApp();
      }
    });

    es.onerror = () => {
      es.close();
      setReconectando(true);
      setTimeout(() => {
        setReconectando(false);
        conectarSSE();
      }, 3000);
    };
  }, [buscarWhatsApp]);

  // Mapear status do SSE para status do DB
  function mapearStatus(statusSSE: string): string {
    if (statusSSE === 'analisando') return 'processando';
    return statusSSE;
  }

  // Carregamento inicial
  useEffect(() => {
    carregarDados().then((d) => {
      if (d && d.statusDocumentos === 'PROCESSANDO') {
        conectarSSE();
      } else if (d && d.statusDocumentos === 'APROVADO') {
        buscarWhatsApp();
      }
    });
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Callback quando um reenvio é concluído
  const handleReConcluido = useCallback(() => {
    setReenviarTipo(null);
    // Recarregar dados e reconectar SSE
    carregarDados().then(() => {
      conectarSSE();
    });
  }, [carregarDados, conectarSSE]);

  // Se está no modo reenvio, renderizar componente de reenvio
  if (reenviarTipo && dados) {
    const docInfo = dados.documentos[reenviarTipo];
    return (
      <ReenvioDocumento
        tipo={reenviarTipo}
        motivo={docInfo?.motivo ?? null}
        onConcluido={handleReConcluido}
        onCancelar={() => setReenviarTipo(null)}
      />
    );
  }

  // Loading
  if (carregando) {
    return (
      <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        <div className="w-10 h-10 rounded-full border-3 border-gray-200 border-t-green-500 animate-spin" />
        <p className="text-gray-400 text-sm mt-4">Carregando portal...</p>
      </main>
    );
  }

  // Erro ao carregar
  if (!dados) {
    return (
      <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto gap-4">
        <p className="text-gray-600 font-semibold">Não foi possível carregar seus dados.</p>
        <button
          onClick={() => { setCarregando(true); carregarDados(); }}
          className="px-6 py-3 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold transition-all"
        >
          Tentar novamente
        </button>
      </main>
    );
  }

  const primeiroNome = extrairPrimeiroNome(dados.nomeCompleto);
  const statusFinal = dados.statusDocumentos;
  const processando = statusFinal === 'PROCESSANDO';
  const temPendencia = statusFinal === 'PENDENCIA';
  const aprovado = statusFinal === 'APROVADO';
  const analiseManual = statusFinal === 'ANALISE_MANUAL';

  // Calcular progresso
  const totalAprovados = TIPOS.filter((t) => dados.documentos[t]?.status === 'aprovado').length;

  return (
    <main className="min-h-dvh bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {primeiroNome ? `Olá, ${primeiroNome}!` : 'Meu Portal'}
          </h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${aprovado ? 'bg-green-500' : processando ? 'bg-blue-500 animate-pulse' : temPendencia ? 'bg-orange-400' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-400">{dados.cpf}</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          {processando && 'Estamos analisando seus documentos...'}
          {temPendencia && 'Alguns documentos precisam ser corrigidos.'}
          {aprovado && 'Seus documentos foram aprovados!'}
          {analiseManual && 'Seus documentos estão em análise pela equipe.'}
          {!processando && !temPendencia && !aprovado && !analiseManual && 'Acompanhe o status dos seus documentos.'}
        </p>

        {/* Barra de progresso */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${aprovado ? 'bg-green-500' : 'bg-green-400'}`}
              style={{ width: `${(totalAprovados / TIPOS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">{totalAprovados}/{TIPOS.length}</span>
        </div>
      </div>

      {/* Reconectando */}
      {reconectando && (
        <div className="mx-6 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
          <p className="text-amber-700 text-xs">Reconectando...</p>
        </div>
      )}

      {/* Documentos */}
      <div className="flex flex-col gap-3 px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Documentos</h2>
        {TIPOS.map((tipo) => {
          const doc = dados.documentos[tipo];
          return (
            <CardDocumento
              key={tipo}
              tipo={tipo}
              status={doc?.status ?? 'pendente'}
              motivo={doc?.motivo ?? null}
              tentativas={doc?.tentativas ?? 0}
              onReenviar={() => setReenviarTipo(tipo)}
              desabilitado={processando}
            />
          );
        })}
      </div>

      {/* Seção de contato (quando aprovado) */}
      {aprovado && (
        <div className="px-6 pb-8">
          <SecaoContato whatsappLink={whatsappLink} carregando={whatsappCarregando} />
        </div>
      )}

      {/* Banner de pendência */}
      {temPendencia && (
        <div className="px-6 pb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
            <p className="text-orange-800 text-sm font-semibold">Documentos pendentes</p>
            <p className="text-orange-600 text-xs mt-1">
              Toque nos documentos rejeitados acima para reenviá-los.
            </p>
          </div>
        </div>
      )}

      {/* Banner de análise manual */}
      {analiseManual && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
            <p className="text-blue-800 font-semibold text-sm">Em análise pela equipe</p>
            <p className="text-blue-600 text-xs mt-1">
              Nossa equipe irá analisar seus documentos e entrará em contato em breve.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
