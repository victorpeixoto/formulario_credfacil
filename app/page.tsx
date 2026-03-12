'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardWrapper from '@/components/CardWrapper';
import ProgressBar from '@/components/ProgressBar';
import CardApps from '@/components/cards/CardApps';
import CardTempo from '@/components/cards/CardTempo';
import CardUltimaEntrega from '@/components/cards/CardUltimaEntrega';
import CardFaturamento from '@/components/cards/CardFaturamento';
import CardReferencias from '@/components/cards/CardReferencias';
import CardDadosPessoais from '@/components/cards/CardDadosPessoais';
import CardAceite from '@/components/cards/CardAceite';
import CardApresentacao from '@/components/CardApresentacao';
import { FlagValues } from 'flags/react';
import { candidatoAprovado } from '@/lib/avaliar';
import type { EstadoFormulario, PayloadSubmit } from '@/types/formulario';

const DRAFT_KEY = 'cf_draft';
const TOTAL_CARDS = 7;

const estadoInicial: EstadoFormulario = {
  apps: [],
  tempoAtuacao: null,
  ultimaEntrega: null,
  faturamento: null,
  referencias: [],
  nomeCompleto: '',
  cpf: '',
  email: '',
  enderecoCompleto: '',
  aceitouCondicoes: false,
};

export default function Home() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [card, setCard] = useState(1);
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [loading, setLoading] = useState(false);
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [rascunhoSalvo, setRascunhoSalvo] = useState<{ card: number; estado: EstadoFormulario } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.card && draft.estado) {
          setRascunhoSalvo(draft);
          setMostrarBanner(true);
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (card === 1 && estado.apps.length === 0) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ card, estado }));
    } catch {}
  }, [card, estado]);

  function continuarRascunho() {
    if (rascunhoSalvo) {
      setCard(rascunhoSalvo.card);
      setEstado(rascunhoSalvo.estado);
    }
    setMostrarBanner(false);
  }

  function recomecar() {
    localStorage.removeItem(DRAFT_KEY);
    setMostrarBanner(false);
    setEstado(estadoInicial);
    setCard(1);
  }

  function voltar() {
    setCard((c) => Math.max(1, c - 1));
  }

  function avancar() {
    setCard((c) => c + 1);
  }

  function avaliarEAvancar() {
    const { faturamento, tempoAtuacao, ultimaEntrega } = estado;
    if (!faturamento || !tempoAtuacao || !ultimaEntrega) return;
    if (!candidatoAprovado(faturamento, tempoAtuacao, ultimaEntrega)) {
      localStorage.removeItem(DRAFT_KEY);
      router.push('/reprovado');
      return;
    }
    avancar();
  }

  async function enviar() {
    setLoading(true);
    try {
      const payload: PayloadSubmit = {
        trabalho: {
          apps: estado.apps,
          tempoAtuacao: estado.tempoAtuacao!,
          ultimaCorridaData: estado.ultimaEntrega!,
          faturamentoBruto: estado.faturamento!,
        },
        referencias: estado.referencias,
        nomeCompleto: estado.nomeCompleto,
        cpf: estado.cpf.replace(/\D/g, ''),
        email: estado.email,
        enderecoCompleto: estado.enderecoCompleto,
        aceitouCondicoes: estado.aceitouCondicoes,
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Erro no servidor');

      const data = await res.json();
      localStorage.removeItem(DRAFT_KEY);
      const link = encodeURIComponent(data.whatsappLink);
      router.push(`/aprovado?id=${data.contactId}&link=${link}`);
    } catch {
      setLoading(false);
      alert('Ocorreu um erro ao enviar. Tente novamente.');
    }
  }

  function atualizarCampo(campo: string, valor: string) {
    setEstado((e) => ({ ...e, [campo]: valor }));
  }

  if (!started) {
    return (
      <>
        {mostrarBanner && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="font-bold text-gray-900 text-lg">Continuar de onde parou?</h3>
              <p className="text-gray-500 text-sm mt-1">Encontramos um preenchimento salvo.</p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={recomecar}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium"
                >
                  Começar do zero
                </button>
                <button
                  onClick={() => { continuarRascunho(); setStarted(true); }}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-white text-sm font-medium"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
        <CardApresentacao onComecar={() => setStarted(true)} />
      </>
    );
  }

  return (
    <main className="min-h-dvh bg-white flex flex-col w-full max-w-lg mx-auto sm:border-x sm:border-gray-100 sm:shadow-sm">
      <FlagValues values={{ etapa: `etapa_${card}` }} />
      <div className="px-6 pt-8 pb-4">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">Credfácil</p>
        <ProgressBar atual={card} total={TOTAL_CARDS} />
        <p className="text-xs text-gray-400 mt-2">Etapa {card} de {TOTAL_CARDS}</p>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <CardWrapper cardKey={card}>
          {card === 1 && (
            <CardApps
              valor={estado.apps}
              onChange={(apps) => setEstado((e) => ({ ...e, apps }))}
              onAvancar={avancar}
            />
          )}
          {card === 2 && (
            <CardTempo
              valor={estado.tempoAtuacao}
              onChange={(v) => setEstado((e) => ({ ...e, tempoAtuacao: v }))}
              onAvancar={avancar}
              onVoltar={voltar}
            />
          )}
          {card === 3 && (
            <CardUltimaEntrega
              valor={estado.ultimaEntrega}
              onChange={(v) => setEstado((e) => ({ ...e, ultimaEntrega: v }))}
              onAvancar={avancar}
              onVoltar={voltar}
            />
          )}
          {card === 4 && (
            <CardFaturamento
              valor={estado.faturamento}
              onChange={(v) => setEstado((e) => ({ ...e, faturamento: v }))}
              onAvancar={avaliarEAvancar}
              onVoltar={voltar}
            />
          )}
          {card === 5 && (
            <CardReferencias
              valor={estado.referencias}
              onChange={(refs) => setEstado((e) => ({ ...e, referencias: refs }))}
              onAvancar={avancar}
              onVoltar={voltar}
            />
          )}
          {card === 6 && (
            <CardDadosPessoais
              nomeCompleto={estado.nomeCompleto}
              cpf={estado.cpf}
              email={estado.email}
              enderecoCompleto={estado.enderecoCompleto}
              onChange={atualizarCampo}
              onAvancar={avancar}
              onVoltar={voltar}
            />
          )}
          {card === 7 && (
            <CardAceite
              aceito={estado.aceitouCondicoes}
              onChange={(v) => setEstado((e) => ({ ...e, aceitouCondicoes: v }))}
              onAvancar={enviar}
              loading={loading}
              onVoltar={voltar}
            />
          )}
        </CardWrapper>
      </div>
    </main>
  );
}
