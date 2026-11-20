import SignInForm from "@/components/auth/SignInForm";
import PageMeta from "@/components/common/PageMeta";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Iniciar sessão | SMART DELIVERY"
        description="Inicie sessão na SMART DELIVERY para gerir encomendas e acompanhar entregas."
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 lg:grid lg:grid-cols-2">
        {/* Painel visual */}
        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-blue-950 p-12 text-white lg:flex xl:p-16">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950" />

          <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <img
              src="/images/logo/smart.png"
              alt="SMART DELIVERY"
              className="max-h-20 w-auto object-contain"
            />
          </div>

          <div className="relative z-10 max-w-xl">
            <span className="mb-5 inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-100">
              Plataforma de gestão logística
            </span>

            <h2 className="text-4xl font-bold leading-tight xl:text-5xl">
              As suas entregas.
              <br />
              O seu controlo.
              <br />
              Num só lugar.
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/80">
              Acompanhe encomendas, organize rotas e gira motoristas e
              veículos através de uma plataforma centralizada.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100/70">Encomendas</p>
                <p className="mt-2 text-lg font-semibold">Gestão</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100/70">Distribuição</p>
                <p className="mt-2 text-lg font-semibold">Rotas</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100/70">Operação</p>
                <p className="mt-2 text-lg font-semibold">Controlo</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-sm text-blue-100/60">
            SMART DELIVERY · Gestão inteligente de entregas
          </div>
        </section>

        {/* Área de autenticação */}
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <img
                src="/images/logo/smart.png"
                alt="SMART DELIVERY"
                className="mb-6 max-h-20 w-auto object-contain"
              />

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                SMART DELIVERY
              </h1>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none sm:p-9">
              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Bem-vindo de volta
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Iniciar sessão
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Introduza as suas credenciais para aceder à plataforma.
                </p>
              </div>

              <SignInForm />

              <div className="mt-8 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  © {new Date().getFullYear()} SMART DELIVERY. Todos os
                  direitos reservados.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
              Plataforma de gestão de encomendas e distribuição.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

