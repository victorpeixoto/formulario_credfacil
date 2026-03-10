'use client';

import { useState } from 'react';
import BotaoAvancar from '@/components/BotaoAvancar';

interface Props {
  nomeCompleto: string;
  cpf: string;
  email: string;
  enderecoCompleto: string;
  onChange: (campo: string, valor: string) => void;
  onAvancar: () => void;
}

function cpfValido(cpf: string): boolean {
  return cpf.replace(/\D/g, '').length === 11;
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CardDadosPessoais({ nomeCompleto, cpf, email, enderecoCompleto, onChange, onAvancar }: Props) {
  const [tocados, setTocados] = useState<Record<string, boolean>>({});

  function marcarTocado(campo: string) {
    setTocados((t) => ({ ...t, [campo]: true }));
  }

  const cpfOk = cpfValido(cpf);
  const emailOk = emailValido(email);
  const podeContinuar = nomeCompleto.trim().length > 2 && cpfOk && emailOk && enderecoCompleto.trim().length > 5;

  const campos = [
    {
      key: 'nomeCompleto',
      label: '👤 Nome completo',
      valor: nomeCompleto,
      placeholder: 'Como consta no documento',
      type: 'text',
      erro: tocados['nomeCompleto'] && nomeCompleto.trim().length <= 2 ? 'Digite seu nome completo.' : '',
    },
    {
      key: 'cpf',
      label: '📄 CPF',
      valor: cpf,
      placeholder: 'Apenas números',
      type: 'text',
      inputMode: 'numeric' as const,
      erro: tocados['cpf'] && !cpfOk ? 'CPF deve ter 11 dígitos.' : '',
    },
    {
      key: 'email',
      label: '📧 E-mail',
      valor: email,
      placeholder: 'seu@email.com',
      type: 'email',
      erro: tocados['email'] && !emailOk ? 'E-mail inválido.' : '',
    },
    {
      key: 'enderecoCompleto',
      label: '🏠 Endereço completo',
      valor: enderecoCompleto,
      placeholder: 'Rua, número, bairro, cidade',
      type: 'text',
      erro: tocados['enderecoCompleto'] && enderecoCompleto.trim().length <= 5 ? 'Informe o endereço completo.' : '',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Seus dados pessoais</h2>
        <p className="text-gray-500 mt-1 text-sm">Preencha com atenção — serão usados para análise.</p>
      </div>

      {campos.map((c) => (
        <div key={c.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{c.label}</label>
          <input
            type={c.type}
            inputMode={c.inputMode}
            placeholder={c.placeholder}
            value={c.valor}
            onChange={(e) => onChange(c.key, e.target.value)}
            onBlur={() => marcarTocado(c.key)}
            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors
              ${c.erro ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'}`}
          />
          {c.erro && <p className="text-red-500 text-xs">{c.erro}</p>}
        </div>
      ))}

      <BotaoAvancar onClick={onAvancar} disabled={!podeContinuar} />
    </div>
  );
}
