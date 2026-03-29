'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConteudoSuporteWhatsApp() {
  const router = useRouter();
  const params = useSearchParams();
  const whatsappLink = decodeURIComponent(params.get('link') ?? '');

  return (
    <main className="min-h-dvh bg-white flex flex-col w-full max-w-lg mx-auto sm:border-x sm:border-gray-100 sm:shadow-sm">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest">Credfácil</p>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24">
              <path
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1M15 3H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4h4a2 2 0 002-2V5a2 2 0 00-2-2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta!</h1>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Encontramos seu cadastro. Nossa equipe está pronta para te atender pelo WhatsApp.
            </p>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 w-full text-left mt-2">
            <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">O que acontece agora?</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Você será direcionado para o WhatsApp da Credfácil, aguarde o atendimento da equipe.
            </p>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="px-6 pb-10 flex flex-col gap-3">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg text-center transition-all duration-200 block shadow-md shadow-green-200"
        >
          Falar com Suporte
        </a>
        <button
          onClick={() => router.push('/')}
          className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200"
        >
          Voltar ao início
        </button>
      </div>
    </main>
  );
}

export default function PageSuporteWhatsApp() {
  return (
    <Suspense>
      <ConteudoSuporteWhatsApp />
    </Suspense>
  );
}
