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
        <input
          type="password"
          placeholder="Nova senha (mínimo 6 caracteres)"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRedefinir()}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
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
