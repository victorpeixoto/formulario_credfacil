'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FlagValues } from 'flags/react';
import { track } from '@vercel/analytics';

interface UserData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

function ConteudoAprovado() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const whatsappLink = decodeURIComponent(params.get('link') ?? '');
  const [isSendingCAPI, setIsSendingCAPI] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

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
              },
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

  const handleWhatsAppClick = () => {
    track('whatsapp_click', { contactId: id });

    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase');
    }

    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'Purchase',
        userData: {
          email: userData?.email,
          firstName: userData?.firstName,
          lastName: userData?.lastName,
        },
      }),
    }).finally(() => {
      localStorage.removeItem('cf_user_data');
    });
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
          Seus dados foram recebidos. Para seguir com a análise, envie os documentos pelo WhatsApp.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 w-full text-left">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Seu código</p>
        <p className="font-mono text-gray-800 font-semibold text-sm break-all">{id}</p>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        Ao clicar no botão abaixo, o WhatsApp abrirá com uma mensagem já preenchida. Basta enviar e aguardar as instruções de documentação.
      </p>

      <a
        href={whatsappLink}
        onClick={handleWhatsAppClick}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg text-center transition-all duration-200 block"
      >
        Falar no WhatsApp
      </a>
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
