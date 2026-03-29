'use client';

import { useEffect, useState, useRef } from 'react';
import type { StatusDocumentos } from '@/types/documentos';

interface DocumentoStatus {
  tipo: string;
  status: 'aguardando' | 'analisando' | 'aprovado' | 'rejeitado' | 'erro';
  motivo?: string | null;
}

const LABELS: Record<string, string> = {
  cnh: 'CNH',
  comprovante: 'Comprovante de residência',
  selfie: 'Selfie ao lado do veículo',
  videoApp: 'Vídeo do aplicativo',
  videoVeiculo: 'Vídeo do veículo',
};

const ICONE: Record<string, string> = {
  aguardando: '○',
  analisando: '⏳',
  aprovado: '✓',
  rejeitado: '✗',
  erro: '⚠',
};

const COR: Record<string, string> = {
  aguardando: 'text-gray-400',
  analisando: 'text-blue-500',
  aprovado: 'text-green-500',
  rejeitado: 'text-red-500',
  erro: 'text-yellow-500',
};

export default function PageStatus() {
  const [documentos, setDocumentos] = useState<Record<string, DocumentoStatus>>(
    Object.fromEntries(
      ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'].map((t) => [
        t,
        { tipo: t, status: 'aguardando' },
      ])
    )
  );
  const [statusFinal, setStatusFinal] = useState<StatusDocumentos | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [reconectando, setReconectando] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const conectar = () => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource('/api/validacao/status');
    esRef.current = es;

    es.addEventListener('documento', (e) => {
      const dados = JSON.parse(e.data);
      setDocumentos((prev) => ({
        ...prev,
        [dados.tipo]: {
          tipo: dados.tipo,
          status: dados.status,
          motivo: dados.resultado?.motivo ?? null,
        },
      }));
    });

    es.addEventListener('concluido', async (e) => {
      const dados = JSON.parse(e.data);
      setStatusFinal(dados.statusFinal);
      es.close();

      if (dados.statusFinal === 'APROVADO') {
        try {
          const res = await fetch('/api/submit', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setWhatsappLink(data.whatsappLink ?? null);
          }
        } catch {
          // WhatsApp link opcional
        }
      }
    });

    es.onerror = () => {
      es.close();
      setReconectando(true);
      setTimeout(() => {
        setReconectando(false);
        conectar();
      }, 3000);
    };
  };

  useEffect(() => {
    // Marcar todos como analisando ao conectar
    setDocumentos((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, { ...v, status: 'analisando' as const }])
      )
    );
    conectar();
    return () => esRef.current?.close();
  }, []);

  return (
    <main className="min-h-dvh bg-white flex flex-col px-6 py-10 max-w-md mx-auto gap-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {statusFinal ? 'Análise concluída' : 'Analisando seus documentos...'}
        </h1>
        {!statusFinal && (
          <p className="text-gray-500 text-sm">
            {reconectando ? 'Reconectando...' : 'Aguarde enquanto verificamos seus documentos.'}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {Object.values(documentos).map((doc) => (
          <div key={doc.tipo} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
            <span className={`text-lg font-bold w-6 text-center ${COR[doc.status]}`}>
              {ICONE[doc.status]}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{LABELS[doc.tipo]}</p>
              {doc.motivo && <p className="text-xs text-red-400 mt-0.5">{doc.motivo}</p>}
            </div>
            <span className={`text-xs font-semibold ${COR[doc.status]}`}>
              {doc.status === 'aguardando' ? 'Aguardando' :
               doc.status === 'analisando' ? 'Analisando' :
               doc.status === 'aprovado' ? 'Aprovado' :
               doc.status === 'rejeitado' ? 'Rejeitado' : 'Erro'}
            </span>
          </div>
        ))}
      </div>

      {statusFinal === 'APROVADO' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-gray-700 text-sm text-center">
            Documentos aprovados! Fale com a nossa equipe para prosseguir.
          </p>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg text-center transition-all duration-200 block"
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      )}

      {statusFinal === 'PENDENCIA' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-700 text-sm text-center">
            Alguns documentos precisam ser corrigidos. Verifique os motivos acima.
          </p>
          <a
            href="/documentos"
            className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold text-lg text-center transition-all duration-200 block"
          >
            Corrigir documentos
          </a>
        </div>
      )}

      {statusFinal === 'ANALISE_MANUAL' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
          <p className="text-blue-800 font-semibold text-sm">Em análise pela equipe</p>
          <p className="text-blue-600 text-xs mt-1">
            Nossa equipe irá analisar seus documentos e entrará em contato em breve.
          </p>
        </div>
      )}
    </main>
  );
}
