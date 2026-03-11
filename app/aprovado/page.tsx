'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConteudoAprovado() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const whatsappLink = decodeURIComponent(params.get('link') ?? '');

  return (
    <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center gap-8">
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
