'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function formatarCPF(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  return nums
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function ConteudoLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/documentos';

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async () => {
    setErro('');
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11 || !senha) {
      setErro('Preencha CPF e senha.');
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfLimpo, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? 'Erro ao fazer login.');
        return;
      }

      router.push(redirect);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto gap-8">
      <div className="w-full flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Acessar minha conta</h1>
        <p className="text-gray-500 text-sm">Entre com seu CPF e senha para continuar.</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(formatarCPF(e.target.value))}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {erro && <p className="text-red-500 text-sm">{erro}</p>}

        <button
          onClick={handleLogin}
          disabled={carregando}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all duration-200 disabled:opacity-40"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </div>

      <div className="w-full flex flex-col items-center gap-2 text-sm text-gray-400">
        <a href="/redefinir-senha" className="hover:text-gray-600 transition-colors">
          Esqueci minha senha
        </a>
        <a href="/" className="hover:text-gray-600 transition-colors">
          Não tem conta? Preencha o formulário
        </a>
      </div>
    </main>
  );
}

export default function PageLogin() {
  return (
    <Suspense>
      <ConteudoLogin />
    </Suspense>
  );
}
