'use client';

import { useMemo, useState } from 'react';
import { buscarCep } from '@/lib/cep';
import { formatarTelefone, validarEmail, validarNomeCompleto, validarTelefone } from '@/lib/validators';
import type { CandidatoView, CandidatoPatchBody } from '@/types/candidato';

interface Props {
  inicial: CandidatoView;
  bloqueado: boolean;
  motivoBloqueio?: string;
  onSalvo?: (atualizado: CandidatoView) => void;
}

type Erros = Partial<Record<keyof CandidatoPatchBody, string>>;

const inputBase =
  'w-full bg-white border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors';
const inputNormal = `${inputBase} border-gray-200 focus:border-green-400`;
const inputErro = `${inputBase} border-red-400 focus:border-red-500`;
const inputReadOnly = `${inputBase} border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed`;

export default function FormCadastro({ inicial, bloqueado, motivoBloqueio, onSalvo }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState(inicial.nomeCompleto);
  const [email, setEmail] = useState(inicial.email);
  const [telefone, setTelefone] = useState(formatarTelefone(inicial.telefone));
  const [cep, setCep] = useState(inicial.endereco.cep);
  const [logradouro, setLogradouro] = useState(inicial.endereco.logradouro);
  const [numero, setNumero] = useState(inicial.endereco.numero);
  const [complemento, setComplemento] = useState(inicial.endereco.complemento);
  const [bairro, setBairro] = useState(inicial.endereco.bairro);
  const [cidade, setCidade] = useState(inicial.endereco.cidade);
  const [estadoUF, setEstadoUF] = useState(inicial.endereco.estadoUF);

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const erros: Erros = useMemo(() => {
    const e: Erros = {};
    if (nomeCompleto && !validarNomeCompleto(nomeCompleto)) e.nomeCompleto = 'Informe nome e sobrenome.';
    if (email && !validarEmail(email)) e.email = 'E-mail inválido.';
    if (telefone) {
      const digitos = telefone.replace(/\D/g, '');
      if (digitos && !validarTelefone(digitos)) e.telefone = 'Telefone inválido.';
    } else {
      e.telefone = 'Informe o telefone.';
    }
    if (cep && cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP deve ter 8 dígitos.';
    return e;
  }, [nomeCompleto, email, telefone, cep]);

  const dirty =
    nomeCompleto !== inicial.nomeCompleto ||
    email !== inicial.email ||
    telefone.replace(/\D/g, '') !== inicial.telefone.replace(/\D/g, '') ||
    cep !== inicial.endereco.cep ||
    logradouro !== inicial.endereco.logradouro ||
    numero !== inicial.endereco.numero ||
    complemento !== inicial.endereco.complemento ||
    bairro !== inicial.endereco.bairro ||
    cidade !== inicial.endereco.cidade ||
    estadoUF !== inicial.endereco.estadoUF;

  const camposObrigatorios =
    nomeCompleto && email && telefone && logradouro && numero && cep && bairro && cidade && estadoUF;
  const podeSalvar = dirty && !bloqueado && Object.keys(erros).length === 0 && !!camposObrigatorios && !salvando;

  async function aoMudarCep(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    setCep(digitos);
    setErroCep('');
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    const r = await buscarCep(digitos);
    setBuscandoCep(false);
    if (!r.ok) {
      setErroCep(r.erro);
      return;
    }
    setLogradouro(r.endereco.logradouro || logradouro);
    setBairro(r.endereco.bairro || bairro);
    setCidade(r.endereco.cidade || cidade);
    setEstadoUF(r.endereco.estadoUF || estadoUF);
  }

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    setFeedback(null);
    try {
      const body: CandidatoPatchBody = {
        nomeCompleto,
        email,
        telefone: telefone.replace(/\D/g, ''),
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estadoUF,
      };
      const res = await fetch('/api/candidato', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'erro', texto: data.error ?? 'Não foi possível salvar.' });
        return;
      }
      setFeedback({ tipo: 'ok', texto: 'Dados atualizados.' });
      onSalvo?.(data as CandidatoView);
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Erro de conexão. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {bloqueado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {motivoBloqueio ?? 'Edição indisponível neste momento.'}
        </div>
      )}

      <Campo label="Nome completo" erro={erros.nomeCompleto}>
        <input
          type="text"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          disabled={bloqueado}
          className={erros.nomeCompleto ? inputErro : inputNormal}
        />
      </Campo>

      <Campo label="CPF">
        <div className="relative">
          <input type="text" value={inicial.cpf} readOnly className={inputReadOnly} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">🔒</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Para alterar o CPF, fale com o suporte pelo WhatsApp.</p>
      </Campo>

      <Campo label="E-mail" erro={erros.email}>
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={bloqueado}
          className={erros.email ? inputErro : inputNormal}
        />
      </Campo>

      <Campo label="Telefone *" erro={erros.telefone}>
        <input
          type="tel"
          inputMode="numeric"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          disabled={bloqueado}
          placeholder="(11) 99999-0000"
          className={erros.telefone ? inputErro : inputNormal}
        />
      </Campo>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-700">Endereço</label>

        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="CEP (8 dígitos)"
                value={cep}
                maxLength={8}
                onChange={(e) => aoMudarCep(e.target.value)}
                disabled={bloqueado}
                className={erros.cep || erroCep ? inputErro : inputNormal}
              />
              {buscandoCep && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Buscando…</span>
              )}
            </div>
            {(erros.cep || erroCep) && (
              <p className="text-red-500 text-xs">{erros.cep ?? erroCep}</p>
            )}
          </div>
          <div className="w-28">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Número"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              disabled={bloqueado}
              className={inputNormal}
            />
          </div>
        </div>

        <input
          type="text"
          placeholder="Rua, Av, Travessa..."
          value={logradouro}
          onChange={(e) => setLogradouro(e.target.value)}
          disabled={bloqueado}
          className={inputNormal}
        />
        <input
          type="text"
          placeholder="Complemento (opcional)"
          value={complemento}
          onChange={(e) => setComplemento(e.target.value)}
          disabled={bloqueado}
          className={inputNormal}
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            disabled={bloqueado}
            className={`${inputNormal} flex-1`}
          />
          <input
            type="text"
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            disabled={bloqueado}
            className={`${inputNormal} flex-1`}
          />
          <input
            type="text"
            placeholder="UF"
            value={estadoUF}
            onChange={(e) => setEstadoUF(e.target.value.toUpperCase().slice(0, 2))}
            disabled={bloqueado}
            maxLength={2}
            className={`${inputNormal} w-16`}
          />
        </div>
      </div>

      {feedback && (
        <p
          className={
            'text-sm ' +
            (feedback.tipo === 'ok' ? 'text-green-600' : 'text-red-500')
          }
        >
          {feedback.texto}
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={!podeSalvar}
        className="w-full py-4 rounded-2xl bg-green-500 text-white font-semibold text-base disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
      >
        {salvando ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </div>
  );
}

function Campo({
  label,
  erro,
  children,
}: {
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {erro && <p className="text-red-500 text-xs">{erro}</p>}
    </div>
  );
}
