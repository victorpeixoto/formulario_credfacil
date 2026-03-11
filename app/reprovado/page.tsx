export default function PageReprovado() {
  return (
    <main className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Obrigado pelo interesse!</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          No momento, seu perfil não se enquadra nas nossas políticas de crédito.
          <br /><br />
          Se sua situação mudar, fique à vontade para tentar novamente.
        </p>
      </div>

      <a
        href="/"
        className="text-sm text-green-600 font-medium hover:underline"
      >
        Voltar ao início
      </a>
    </main>
  );
}
