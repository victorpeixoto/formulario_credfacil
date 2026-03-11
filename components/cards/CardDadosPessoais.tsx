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
  onVoltar?: () => void;
}

interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
}

function cpfValido(cpf: string): boolean {
  return cpf.replace(/\D/g, '').length === 11;
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function montarEnderecoCompleto(e: Endereco): string {
  const partes = [e.logradouro, e.numero, e.bairro, `${e.cidade} - ${e.uf}`, e.cep].filter(Boolean);
  return partes.join(', ');
}

export default function CardDadosPessoais({ nomeCompleto, cpf, email, onChange, onAvancar, onVoltar }: Props) {
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [endereco, setEndereco] = useState<Endereco>({ cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '' });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  const [logradouroManual, setLogradouroManual] = useState(false);

  function marcarTocado(campo: string) {
    setTocados((t) => ({ ...t, [campo]: true }));
  }

  async function buscarCep(cep: string) {
    const apenasNumeros = cep.replace(/\D/g, '');
    if (apenasNumeros.length !== 8) return;

    setBuscandoCep(true);
    setErroCep('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErroCep('CEP não encontrado.');
        return;
      }
      const novo = {
        ...endereco,
        cep: apenasNumeros,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      };
      setEndereco(novo);
      if (!data.logradouro) {
        setLogradouroManual(true);
      }
      if (data.logradouro && novo.cidade) {
        onChange('enderecoCompleto', montarEnderecoCompleto(novo));
      }
    } catch {
      setErroCep('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setBuscandoCep(false);
    }
  }

  function atualizarEndereco(campo: keyof Endereco, valor: string) {
    const novo = { ...endereco, [campo]: valor };
    setEndereco(novo);
    if (novo.logradouro && novo.numero && novo.cidade) {
      onChange('enderecoCompleto', montarEnderecoCompleto(novo));
    }
  }

  const cpfOk = cpfValido(cpf);
  const emailOk = emailValido(email);
  const enderecoOk = !!(endereco.logradouro && endereco.numero && endereco.cidade);
  const podeContinuar = nomeCompleto.trim().length > 2 && cpfOk && emailOk && enderecoOk;

  const camposTexto = [
    {
      key: 'nomeCompleto',
      label: 'Nome completo',
      valor: nomeCompleto,
      placeholder: 'Como consta no documento',
      type: 'text',
      inputMode: undefined as React.HTMLAttributes<HTMLInputElement>['inputMode'],
      erro: tocados['nomeCompleto'] && nomeCompleto.trim().length <= 2 ? 'Digite seu nome completo.' : '',
    },
    {
      key: 'cpf',
      label: 'CPF',
      valor: cpf,
      placeholder: 'Apenas números (11 dígitos)',
      type: 'text',
      inputMode: 'numeric' as React.HTMLAttributes<HTMLInputElement>['inputMode'],
      erro: tocados['cpf'] && !cpfOk ? 'CPF deve ter 11 dígitos.' : '',
    },
    {
      key: 'email',
      label: 'E-mail',
      valor: email,
      placeholder: 'seu@email.com',
      type: 'email',
      inputMode: 'email' as React.HTMLAttributes<HTMLInputElement>['inputMode'],
      erro: tocados['email'] && !emailOk ? 'E-mail inválido.' : '',
    },
  ];

  const inputBase = 'w-full bg-white border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors';
  const inputNormal = `${inputBase} border-gray-200 focus:border-green-400`;
  const inputErro = `${inputBase} border-red-400 focus:border-red-500`;
  const inputPreenchido = `${inputBase} border-green-300 bg-green-50 text-gray-700 cursor-not-allowed`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dados pessoais</h2>
        <p className="text-gray-500 mt-1 text-sm">Preencha com atenção — serão usados para análise.</p>
      </div>

      {camposTexto.map((c) => (
        <div key={c.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{c.label}</label>
          <input
            type={c.type}
            inputMode={c.inputMode}
            placeholder={c.placeholder}
            value={c.valor}
            onChange={(e) => onChange(c.key, e.target.value)}
            onBlur={() => marcarTocado(c.key)}
            className={c.erro ? inputErro : inputNormal}
          />
          {c.erro && <p className="text-red-500 text-xs">{c.erro}</p>}
        </div>
      ))}

      {/* Endereço via CEP */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-700">Endereço</label>

        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="CEP (apenas números)"
                value={endereco.cep}
                maxLength={8}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  atualizarEndereco('cep', val);
                  if (val.length === 8) buscarCep(val);
                }}
                onBlur={() => marcarTocado('cep')}
                className={inputNormal}
              />
              {buscandoCep && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Buscando...
                </span>
              )}
            </div>
            {erroCep && <p className="text-red-500 text-xs">{erroCep}</p>}
          </div>

          <div className="w-28">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Número"
              value={endereco.numero}
              onChange={(e) => atualizarEndereco('numero', e.target.value)}
              className={inputNormal}
            />
          </div>
        </div>

        {(endereco.logradouro || logradouroManual) && endereco.cidade && (
          <div className="flex flex-col gap-2">
            {logradouroManual ? (
              <input
                type="text"
                placeholder="Rua, Av, Travessa..."
                value={endereco.logradouro}
                onChange={(e) => atualizarEndereco('logradouro', e.target.value)}
                className={inputNormal}
              />
            ) : (
              <input
                type="text"
                value={endereco.logradouro}
                readOnly
                className={inputPreenchido}
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={endereco.bairro}
                readOnly
                className={`${inputPreenchido} flex-1`}
              />
              <input
                type="text"
                value={`${endereco.cidade} - ${endereco.uf}`}
                readOnly
                className={`${inputPreenchido} flex-1`}
              />
            </div>
          </div>
        )}

        {tocados['cep'] && !enderecoOk && !buscandoCep && (
          <p className="text-red-500 text-xs">Preencha o CEP e o número.</p>
        )}
      </div>

      <BotaoAvancar onClick={onAvancar} disabled={!podeContinuar} onVoltar={onVoltar} />
    </div>
  );
}
