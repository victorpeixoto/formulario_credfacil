'use client';

import { useState, useEffect } from 'react';
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
  const formCode = params.get('code') ?? '';

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!formCode) return;
    fetch('/api/auth/resolve-cpf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formCode }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.cpf) setCpf(formatarCPF(data.cpf)); })
      .catch(() => {});
  }, [formCode]);

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
        <div className="relative">
          <input
            type={mostrarSenha ? 'text' : 'password'}
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {mostrarSenha ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.02 0 2.004.163 2.925.463M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

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
