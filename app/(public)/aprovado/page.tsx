'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FlagValues } from 'flags/react';
import { track } from '@vercel/analytics';

interface UserData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match?.[2];
}

function ConteudoAprovado() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? '';
  const [isSendingCAPI, setIsSendingCAPI] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  useEffect(() => {
    const sendCompleteRegistrationEvent = async () => {
      if (typeof window === 'undefined') return;

      const userDataStr = localStorage.getItem('cf_user_data');
      if (!userDataStr) return;

      try {
        const parsed: UserData = JSON.parse(userDataStr);
        setUserData(parsed);

        if (parsed.email || parsed.firstName || parsed.lastName) {
          setIsSendingCAPI(true);

          await fetch('/api/meta-capi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventName: 'CompleteRegistration',
              userData: {
                email: parsed.email,
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                fbc: getCookie('_fbc'),
                fbp: getCookie('_fbp'),
              },
              eventSourceUrl: window.location.href,
            }),
          });
        }
      } catch (error) {
        console.error('Erro ao enviar evento CAPI:', error);
      } finally {
        setIsSendingCAPI(false);
      }
    };

    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration');
    }

    sendCompleteRegistrationEvent();
  }, []);

  const handleCriarConta = async () => {
    setErroSenha('');
    if (senha.length < 6) {
      setErroSenha('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem.');
      return;
    }

    setSalvando(true);
    try {
      const cpf = localStorage.getItem('cf_cpf') ?? '';
      const res = await fetch('/api/auth/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, senha }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErroSenha(data.error ?? 'Erro ao criar conta.');
        return;
      }
      track('conta_criada', { contactId: id });
      router.push('/documentos');
    } catch {
      setErroSenha('Erro de conexão. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center gap-8">
      <FlagValues values={{ resultado: 'aprovado' }} />
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Pré-cadastro concluído!</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Crie uma senha para acessar a área de documentos.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 w-full text-left">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Seu código</p>
        <p className="font-mono text-gray-800 font-semibold text-sm break-all">{id}</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <div className="relative">
          <input
            type={mostrarSenha ? 'text' : 'password'}
            placeholder="Criar senha (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {mostrarSenha ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
        <div className="relative">
          <input
            type={mostrarConfirmarSenha ? 'text' : 'password'}
            placeholder="Confirmar senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={() => setMostrarConfirmarSenha((v) => !v)}
            aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {mostrarConfirmarSenha ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
        {erroSenha && <p className="text-red-500 text-sm">{erroSenha}</p>}
        <button
          onClick={handleCriarConta}
          disabled={salvando}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-40"
        >
          {salvando ? 'Aguarde...' : 'Criar conta e continuar'}
        </button>
      </div>
    </main>
  );
}

export default function PageAprovado() {
  return (
    <Suspense>
      <ConteudoAprovado />
    </Suspense>
  );
}
