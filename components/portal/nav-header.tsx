'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const ABAS = [
  { href: '/documentos', label: 'Documentos' },
  { href: '/status', label: 'Status' },
  { href: '/meus-dados', label: 'Meus dados' },
];

export default function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <header className="w-full border-b border-gray-100 bg-white sticky top-0 z-20">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest">
          Credfácil
        </p>
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </div>
      <nav className="max-w-md mx-auto px-4 flex gap-1 overflow-x-auto">
        {ABAS.map((a) => {
          const ativo = pathname === a.href || pathname?.startsWith(a.href + '/');
          return (
            <Link
              key={a.href}
              href={a.href}
              className={
                'whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ' +
                (ativo
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700')
              }
            >
              {a.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
