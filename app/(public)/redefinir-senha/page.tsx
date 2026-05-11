'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ConteudoRedefinir() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  if (!token) {
    return (
      <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto gap-4 text-center">
        <p className="text-red-500 text-sm">Link inválido ou expirado.</p>
        <a href="/login" className="text-green-600 text-sm underline">Voltar ao login</a>
      </main>
    );
  }

  const handleRedefinir = async () => {
    setErro('');
    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/auth/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao redefinir senha.');
        return;
      }

      router.push('/login?mensagem=senha-redefinida');
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto gap-8">
      <div className="w-full flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Redefinir senha</h1>
        <p className="text-gray-500 text-sm">Escolha uma nova senha para sua conta.</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <div className="relative">
          <input
            type={mostrarNovaSenha ? 'text' : 'password'}
            placeholder="Nova senha (mínimo 6 caracteres)"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={() => setMostrarNovaSenha((v) => !v)}
            aria-label={mostrarNovaSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {mostrarNovaSenha ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
        <div className="relative">
          <input
            type={mostrarConfirmar ? 'text' : 'password'}
            placeholder="Confirmar nova senha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRedefinir()}
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={() => setMostrarConfirmar((v) => !v)}
            aria-label={mostrarConfirmar ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {mostrarConfirmar ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
        {erro && <p className="text-red-500 text-sm">{erro}</p>}
        <button
          onClick={handleRedefinir}
          disabled={salvando}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-40"
        >
          {salvando ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </div>
    </main>
  );
}

export default function PageRedefinirSenha() {
  return (
    <Suspense>
      <ConteudoRedefinir />
    </Suspense>
  );
}
