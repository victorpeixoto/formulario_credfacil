export default function PageReprovado() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
          🙏
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
