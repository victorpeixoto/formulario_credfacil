'use client';

import React, { useState } from 'react';
import { formatarCPF, validarCPF } from '@/lib/validators';

interface CardCPFExistenteProps {
  onCPFSubmit: (cpf: string) => void;
  onVoltar: () => void;
  loading: boolean;
  erro?: string;
}

export default function CardCPFExistente({ onCPFSubmit, onVoltar, loading, erro }: CardCPFExistenteProps) {
  const [cpf, setCpf] = useState('');

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatarCPF(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validarCPF(cpf)) {
      onCPFSubmit(cpf.replace(/\D/g, ''));
    } else {
      alert('CPF inválido. Verifique os dígitos e tente novamente.');
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Já sou cliente</h2>
      <p className="text-gray-500 mb-6">
        Se você já preencheu o formulário antes, digite seu CPF para verificar o status.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-grow">
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
            CPF
          </label>
          <input
            type="text"
            id="cpf"
            name="cpf"
            value={cpf}
            onChange={handleCpfChange}
            maxLength={14} // 11 digits + 3 separators
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border"
            placeholder="000.000.000-00"
            required
            disabled={loading}
          />
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
        </div>

        <div className="flex flex-col gap-3 mt-auto">
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-lg transition-all duration-200"
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Verificar CPF'}
          </button>
          <button
            type="button"
            onClick={onVoltar}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200"
            disabled={loading}
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
}
