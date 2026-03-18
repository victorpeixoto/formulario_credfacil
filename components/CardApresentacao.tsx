'use client';

import { motion } from 'framer-motion';

interface Props {
  onComecar: () => void;
  onExistingUser: () => void;
}

export default function CardApresentacao({ onComecar, onExistingUser }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-dvh flex flex-col items-center justify-between px-6 py-12 bg-white"
    >
      {/* Logo + Slogan */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-3xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10"
            >
              {/* Símbolo: cifrao estilizado */}
              <path
                d="M24 6v4M24 38v4M16 14c0-3.314 3.582-6 8-6s8 2.686 8 6-3.582 6-8 6-8 2.686-8 6 3.582 6 8 6 8-2.686 8-6"
                stroke="#fff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Cred<span className="text-green-500">fácil</span>
            </h1>
          </div>
        </div>

        {/* Slogan */}
        <div className="flex flex-col gap-2 max-w-xs">
          <p className="text-lg font-semibold text-gray-700 leading-snug">
            Crédito rápido para quem trabalha com aplicativos.
          </p>
          <p className="text-sm text-gray-400">
            Preencha o formulário em minutos e saiba se você se qualifica.
          </p>
        </div>

        {/* Bullets */}
        <div className="flex flex-col gap-3 mt-2 w-full max-w-xs text-left">
          {[
            '100% online, sem burocracia',
            'Resposta rápida após análise',
            'Sem consulta ao SPC/Serasa',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botão */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onComecar}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95
            text-white font-semibold text-lg shadow-md shadow-green-200 transition-all duration-200"
        >
          Quero solicitar crédito
        </button>
        <button
          onClick={onExistingUser}
          className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200"
        >
          Já sou cliente
        </button>
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Ao continuar, você concorda com o uso dos seus dados para análise de crédito.
        </p>
      </div>
    </motion.div>
  );
}
