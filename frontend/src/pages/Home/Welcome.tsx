import { Link } from "react-router";
import PageMeta from "@/components/common/PageMeta";

export default function Welcome() {
  const features = [
    {
      number: "01",
      title: "Gestão de Encomendas",
      description:
        "Registe, organize e acompanhe as encomendas desde a sua criação até à entrega.",
      icon: "📦",
    },
    {
      number: "02",
      title: "Gestão de Motoristas",
      description:
        "Consulte e organize os motoristas responsáveis pelas operações de distribuição.",
      icon: "🚚",
    },
    {
      number: "03",
      title: "Gestão de Veículos",
      description:
        "Mantenha o controlo dos veículos utilizados nas operações logísticas.",
      icon: "🚛",
    },
    {
      number: "04",
      title: "Planeamento de Rotas",
      description:
        "Organize os percursos e acompanhe o planeamento das entregas.",
      icon: "📍",
    },
    {
      number: "05",
      title: "Gestão de Clientes",
      description:
        "Centralize as informações dos clientes e facilite a consulta dos seus dados.",
      icon: "👥",
    },
    {
      number: "06",
      title: "Relatórios",
      description:
        "Consulte informações e acompanhe os resultados da atividade operacional.",
      icon: "📊",
    },
  ];

  const dashboardItems = [
    ["📦", "Encomendas", "Organização"],
    ["🚚", "Motoristas", "Coordenação"],
    ["🚛", "Veículos", "Controlo"],
    ["📍", "Rotas", "Planeamento"],
  ];

  const benefits = [
    "Centralização da informação",
    "Organização das encomendas",
    "Gestão de recursos logísticos",
    "Acompanhamento das operações",
  ];

  return (
    <>
      <PageMeta
        title="SMART DELIVERY | Gestão Inteligente de Encomendas"
        description="Conheça a SMART DELIVERY, uma plataforma de gestão de encomendas, motoristas, veículos e distribuição."
      />

      <div className="min-h-screen bg-white text-gray-800">

        {/* CABEÇALHO */}
        <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">

            <Link to="/" className="flex items-center">
              <img
                src="/images/logo/smart.png"
                alt="SMART DELIVERY"
                className="h-14 w-auto object-contain"
              />
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              <a
                href="#inicio"
                className="text-sm font-medium text-gray-600 transition hover:text-blue-700"
              >
                Início
              </a>

              <a
                href="#sobre"
                className="text-sm font-medium text-gray-600 transition hover:text-blue-700"
              >
                Sobre nós
              </a>

              <a
                href="#funcionalidades"
                className="text-sm font-medium text-gray-600 transition hover:text-blue-700"
              >
                Funcionalidades
              </a>

              <a
                href="#contactos"
                className="text-sm font-medium text-gray-600 transition hover:text-blue-700"
              >
                Contactos
              </a>
            </nav>

            {/* ÚNICO BOTÃO DE LOGIN */}
            <Link
              to="/signin"
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800 sm:px-7"
            >
              Iniciar sessão →
            </Link>

          </div>
        </header>

        <main>

          {/* SECÇÃO PRINCIPAL */}
          <section
            id="inicio"
            className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950"
          >
            <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-2 lg:py-32">

              <div className="text-white">

                <span className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-200">
                  Plataforma de Gestão Logística
                </span>

                <h1 className="mt-8 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                  A gestão das suas entregas,
                  <span className="block text-blue-400">
                    num só lugar.
                  </span>
                </h1>

                <p className="mt-7 max-w-xl text-base leading-8 text-blue-100/80 sm:text-lg">
                  A SMART DELIVERY é uma plataforma desenvolvida para
                  simplificar a gestão de encomendas, motoristas,
                  veículos e rotas, proporcionando uma gestão logística
                  mais organizada e eficiente.
                </p>

                {/* APENAS BOTÃO PARA FUNCIONALIDADES */}
                <div className="mt-10 flex flex-wrap gap-4">
                  <a
                    href="#funcionalidades"
                    className="rounded-xl border border-white/30 px-7 py-4 font-semibold text-white transition hover:bg-white/10"
                  >
                    Conhecer funcionalidades →
                  </a>
                </div>

                <div className="mt-12 flex flex-wrap gap-8 border-t border-white/10 pt-8">

                  <div>
                    <p className="text-2xl font-bold text-white">01</p>
                    <p className="mt-1 text-sm text-blue-200/70">
                      Gestão centralizada
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-white">02</p>
                    <p className="mt-1 text-sm text-blue-200/70">
                      Controlo logístico
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-white">03</p>
                    <p className="mt-1 text-sm text-blue-200/70">
                      Organização operacional
                    </p>
                  </div>

                </div>
              </div>

              {/* PAINEL VISUAL */}
              <div className="relative">

                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl sm:p-8">

                  <div className="flex items-center justify-between border-b border-white/10 pb-6">

                    <div>
                      <p className="text-sm text-blue-200">
                        SMART DELIVERY
                      </p>

                      <h2 className="mt-2 text-2xl font-bold text-white">
                        Gestão de entregas
                      </h2>
                    </div>

                    <div className="rounded-xl bg-blue-400/20 p-3 text-2xl">
                      🚚
                    </div>

                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-4">

                    {dashboardItems.map(([icon, title, subtitle]) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                      >
                        <span className="text-3xl">{icon}</span>

                        <h3 className="mt-4 font-semibold text-white">
                          {title}
                        </h3>

                        <p className="mt-1 text-sm text-blue-200/70">
                          {subtitle}
                        </p>
                      </div>
                    ))}

                  </div>

                  <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-5">

                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-green-400" />

                      <p className="font-medium text-white">
                        Plataforma de gestão centralizada
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-blue-100/70">
                      Todas as principais operações logísticas organizadas
                      numa única plataforma.
                    </p>

                  </div>

                </div>
              </div>

            </div>
          </section>

          {/* SOBRE A PLATAFORMA */}
          <section id="sobre" className="px-6 py-24">

            <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">

              <div>

                <span className="text-sm font-bold uppercase tracking-widest text-blue-700">
                  Sobre a plataforma
                </span>

                <h2 className="mt-4 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
                  Simplificar a gestão.
                  <span className="block text-blue-700">
                    Melhorar a organização.
                  </span>
                </h2>

                <p className="mt-6 leading-8 text-gray-500">
                  A SMART DELIVERY foi concebida para apoiar a gestão
                  das operações de distribuição e entrega de encomendas.
                  Através de uma interface intuitiva, permite centralizar
                  informações importantes e facilitar o acompanhamento
                  das diferentes atividades logísticas.
                </p>

                <p className="mt-4 leading-8 text-gray-500">
                  O objetivo é proporcionar uma solução que facilite
                  a organização dos processos, a consulta de informações
                  e a gestão dos recursos envolvidos nas entregas.
                </p>

              </div>

              <div className="rounded-3xl bg-blue-50 p-8 sm:p-12">

                <h3 className="text-2xl font-bold text-gray-900">
                  Uma plataforma. Várias soluções.
                </h3>

                <p className="mt-4 leading-7 text-gray-500">
                  Reúna num único ambiente as ferramentas essenciais
                  para a gestão das operações logísticas.
                </p>

                <div className="mt-8 space-y-5">

                  {benefits.map((item) => (
                    <div key={item} className="flex items-center gap-3">

                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-sm text-white">
                        ✓
                      </span>

                      <span className="font-medium text-gray-700">
                        {item}
                      </span>

                    </div>
                  ))}

                </div>

              </div>

            </div>
          </section>

          {/* FUNCIONALIDADES */}
          <section
            id="funcionalidades"
            className="bg-gray-50 px-6 py-24"
          >

            <div className="mx-auto max-w-7xl">

              <div className="mx-auto max-w-2xl text-center">

                <span className="text-sm font-bold uppercase tracking-widest text-blue-700">
                  Funcionalidades
                </span>

                <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
                  Tudo o que precisa para gerir as suas entregas
                </h2>

                <p className="mt-5 leading-7 text-gray-500">
                  Conheça as principais funcionalidades disponibilizadas
                  pela SMART DELIVERY.
                </p>

              </div>

              <div className="mt-16 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">

                {features.map((feature) => (
                  <article
                    key={feature.number}
                    className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-4xl">
                        {feature.icon}
                      </span>

                      <span className="text-sm font-bold text-blue-200">
                        {feature.number}
                      </span>

                    </div>

                    <h3 className="mt-7 text-xl font-bold text-gray-900">
                      {feature.title}
                    </h3>

                    <p className="mt-4 leading-7 text-gray-500">
                      {feature.description}
                    </p>

                  </article>
                ))}

              </div>

            </div>
          </section>

          {/* CONTACTOS */}
          <section id="contactos" className="px-6 py-24">

            <div className="mx-auto max-w-5xl text-center">

              <span className="text-sm font-bold uppercase tracking-widest text-blue-700">
                Contactos
              </span>

              <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
                Estamos disponíveis para si
              </h2>

              <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-500">
                Para informações, esclarecimentos ou questões relacionadas
                com a plataforma SMART DELIVERY, entre em contacto
                connosco através dos nossos canais de comunicação.
              </p>

              <div className="mt-12 grid gap-6 sm:grid-cols-2">

                <div className="rounded-2xl border border-gray-100 p-8 shadow-sm">

                  <div className="text-3xl">✉️</div>

                  <h3 className="mt-4 font-bold text-gray-900">
                    Correio eletrónico
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Email de contacto a definir
                  </p>

                </div>

                <div className="rounded-2xl border border-gray-100 p-8 shadow-sm">

                  <div className="text-3xl">🌐</div>

                  <h3 className="mt-4 font-bold text-gray-900">
                    Plataforma
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    SMART DELIVERY — Gestão de Encomendas
                  </p>

                </div>

              </div>

            </div>
          </section>

        </main>

        {/* RODAPÉ */}
        <footer className="bg-slate-950 px-6 py-10 text-center">

          <img
            src="/images/logo/smart.png"
            alt="SMART DELIVERY"
            className="mx-auto h-12 w-auto object-contain"
          />

          <p className="mt-5 text-sm text-gray-400">
            Gestão inteligente de encomendas e distribuição.
          </p>

          <div className="mt-7 border-t border-white/10 pt-7">

            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} SMART DELIVERY.
              Todos os direitos reservados.
            </p>

          </div>

        </footer>

      </div>
    </>
  );
}