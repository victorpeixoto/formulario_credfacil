'use client';

import CardCPFExistente from '@/components/cards/CardCPFExistente';
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
import { track } from '@vercel/analytics';
import { useEffect, useState } from 'react';

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
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  cidade: '',
  estadoUF: '',
  aceitouCondicoes: false,
};

export default function Home() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [showExistingUserFlow, setShowExistingUserFlow] = useState(false);
  const [card, setCard] = useState(1);
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [loading, setLoading] = useState(false);
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [rascunhoSalvo, setRascunhoSalvo] = useState<{ card: number; estado: EstadoFormulario } | null>(null);
  const [cpfExistenteErro, setCpfExistenteErro] = useState<string | undefined>(undefined);

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
      track('form_auto_reproval', { 
        faturamento, 
        tempoAtuacao, 
        ultimaEntrega 
      });
      localStorage.removeItem(DRAFT_KEY);
      router.push('/reprovado');
      return;
    }
    avancar();
  }

  async function enviar() {
    // Validação extra de segurança
    if (!estado.faturamento || !estado.tempoAtuacao || !estado.ultimaEntrega) {
      alert('Por favor, preencha todas as etapas antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      const payload: PayloadSubmit = {
        trabalho: {
          apps: estado.apps,
          tempoAtuacao: estado.tempoAtuacao,
          ultimaCorridaData: estado.ultimaEntrega,
          faturamentoBruto: estado.faturamento,
        },
        referencias: estado.referencias,
        nomeCompleto: estado.nomeCompleto,
        cpf: estado.cpf.replace(/\D/g, ''),
        email: estado.email,
        logradouro: estado.logradouro,
        numero: estado.numero,
        complemento: estado.complemento,
        bairro: estado.bairro,
        cep: estado.cep,
        cidade: estado.cidade,
        estadoUF: estado.estadoUF,
        aceitouCondicoes: estado.aceitouCondicoes,
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Erro no servidor');

      const data = await res.json();
      track('form_completed', { contactId: data.contactId });
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead');
      }
      const fbc = document.cookie.match(/(^| )_fbc=([^;]+)/)?.[2];
      const fbp = document.cookie.match(/(^| )_fbp=([^;]+)/)?.[2];
      await fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'Lead',
          userData: {
            email: estado.email,
            firstName: estado.nomeCompleto.split(' ')[0],
            lastName: estado.nomeCompleto.split(' ').slice(1).join(' ') || undefined,
            fbc,
            fbp,
          },
          eventSourceUrl: window.location.href,
        }),
      });
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem('cf_user_data', JSON.stringify({
        email: estado.email,
        firstName: estado.nomeCompleto.split(' ')[0],
        lastName: estado.nomeCompleto.split(' ').slice(1).join(' ') || undefined,
      }));
      const link = encodeURIComponent(data.whatsappLink);
      router.push(`/aprovado?id=${data.contactId}&link=${link}`);
    } catch {
      setLoading(false);
      alert('Ocorreu um erro ao enviar. Tente novamente.');
    }
  }

  // Novo: Lógica para verificar CPF existente
  async function handleExistingCPFSubmit(cpf: string) {
    setLoading(true);
    setCpfExistenteErro(undefined);
    try {
      const res = await fetch('/api/check-cpf', { // Este endpoint será criado no próximo passo
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao verificar CPF.');
      }

                if (data.exists) {
        if (data.whatsappLink) {
          router.push(`/suporte-whatsapp?link=${encodeURIComponent(data.whatsappLink)}`);
        } else {
          setCpfExistenteErro('Não foi possível gerar o link de suporte. Tente novamente.');
        }
      } else {
        // CPF não encontrado, direcionar para novo formulário
        setStarted(true);
        setShowExistingUserFlow(false);
      }
    } catch (error: any) {
      console.error('[handleExistingCPFSubmit] Erro:', error);
      setCpfExistenteErro(error.message || 'Erro ao verificar CPF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function atualizarCampo(campo: string, valor: string) {
    setEstado((e) => ({ ...e, [campo]: valor }));
  }

  if (!started && !showExistingUserFlow) {
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
        <CardApresentacao onComecar={() => setStarted(true)} onExistingUser={() => setShowExistingUserFlow(true)} />
      </>
    );
  }

  if (showExistingUserFlow) {
    return (
      <main className="min-h-dvh bg-white flex flex-col w-full max-w-lg mx-auto sm:border-x sm:border-gray-100 sm:shadow-sm">
        <CardWrapper cardKey={0}> {/* cardKey 0 para este fluxo */}
          <CardCPFExistente
            onCPFSubmit={handleExistingCPFSubmit}
            onVoltar={() => setShowExistingUserFlow(false)}
            loading={loading}
            erro={cpfExistenteErro}
          />
        </CardWrapper>
      </main>
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
              logradouro={estado.logradouro}
              numero={estado.numero}
              complemento={estado.complemento}
              bairro={estado.bairro}
              cep={estado.cep}
              cidade={estado.cidade}
              estadoUF={estado.estadoUF}
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
