'use client';

import React, { useState } from 'react';

interface CardCPFExistenteProps {
  onCPFSubmit: (cpf: string) => void;
  onVoltar: () => void;
  loading: boolean;
  erro?: string;
}

export default function CardCPFExistente({ onCPFSubmit, onVoltar, loading, erro }: CardCPFExistenteProps) {
  const [cpf, setCpf] = useState('');

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    // Format CPF as 000.000.000-00
    let formattedCpf = value;
    if (value.length > 3) {
      formattedCpf = value.substring(0, 3) + '.' + value.substring(3);
    }
    if (value.length > 6) {
      formattedCpf = value.substring(0, 3) + '.' + value.substring(3, 6) + '.' + value.substring(6);
    }
    if (value.length > 9) {
      formattedCpf = value.substring(0, 3) + '.' + value.substring(3, 6) + '.' + value.substring(6, 9) + '-' + value.substring(9, 11);
    }
    setCpf(formattedCpf);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.replace(/\D/g, '').length === 11) {
      onCPFSubmit(cpf.replace(/\D/g, ''));
    } else {
      alert('Por favor, insira um CPF válido.');
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
