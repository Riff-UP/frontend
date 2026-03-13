import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/app/components/layout/Footer';
import { FaUsers } from 'react-icons/fa';
import { IoShareSocialSharp } from "react-icons/io5";
import { MdOutlineRocketLaunch } from 'react-icons/md';
import { Sora } from 'next/font/google';
import { CiCalendarDate } from "react-icons/ci";

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
});

const benefits = [
  {
    title: 'Publica tu contenido',
    text: 'Comparte tus canciones, videos y fotos para mantener a tu comunidad siempre conectada.',
    icon: IoShareSocialSharp,
  },
  {
    title: 'Organiza tus eventos',
    text: 'Publica fechas, lugar y descripción para que tus seguidores no se pierdan nada.',
    icon: CiCalendarDate,
  },
  {
    title: 'Haz crecer tu comunidad',
    text: 'Conecta con nuevos oyentes y convierte reproducciones en asistentes reales.',
    icon: FaUsers,
  },
];

const faqs = [
  {
    q: '¿Riff tiene costo para artistas?',
    a: 'No. Puedes crear tu perfil, subir contenido y publicar eventos sin costo.',
  },
  {
    q: '¿Qué tipo de música puedo compartir?',
    a: 'Cualquier género. Riff está pensado para artistas independientes y bandas emergentes.',
  },
  {
    q: '¿Puedo editar o eliminar publicaciones?',
    a: 'Sí. Tienes control total sobre tus publicaciones y eventos desde tu panel.',
  },
  {
    q: '¿Necesito equipo técnico para usarlo?',
    a: 'No. La plataforma está diseñada para que empieces a publicar desde el primer día.',
  },
];

export default function LandingPage() {
  return (
    <div className={`${sora.className} min-h-screen bg-riff-background-b text-white`}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(0,123,255,0.28),transparent_42%),radial-gradient(circle_at_80%_8%,rgba(0,34,102,0.38),transparent_50%),linear-gradient(180deg,#121212_0%,#1c1c1c_100%)]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full border border-riff-primary/30" />
        <div className="absolute top-40 -left-16 h-44 w-44 rounded-full border border-white/10" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/images/logo_riff.png" alt="Riff" width={82} height={40} className="object-contain" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="rounded-sm border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:text-white sm:px-4 sm:text-sm"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/register"
                className="rounded-sm bg-gradient-to-r from-riff-primary-dark to-riff-primary px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:from-riff-primary hover:to-riff-primary-dark sm:px-4 sm:text-sm"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-riff-primary/40 bg-riff-primary/10 px-3 py-1 text-xs font-semibold text-riff-primary">
              <MdOutlineRocketLaunch className="h-4 w-4" />
              Plataforma para despegar tu proyecto
            </p>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Impulsa tu música y llena tus eventos desde un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-sm text-white/75 sm:text-base">
              Riff te ayuda a publicar canciones, compartir tu historia y conectar con personas que quieren descubrirte en vivo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="rounded-sm bg-gradient-to-r from-riff-primary-dark to-riff-primary px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:from-riff-primary hover:to-riff-primary-dark"
              >
                Empieza gratis
              </Link>
              
            </div>
            <div className="mt-10 grid grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-3">
              <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-riff-primary">Sin costos para empezar</p>
                <p className="mt-1 text-xs text-white/70">Crea perfil, sube musica y publica eventos gratis.</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-riff-primary">Enfocado en nuevos artistas</p>
                <p className="mt-1 text-xs text-white/70">Pensado para proyectos independientes.</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-riff-primary">Lanzamiento en progreso</p>
                <p className="mt-1 text-xs text-white/70">Estamos mejorando para ofrecer la mejor experiencia.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-riff-primary/30 to-riff-primary-dark/40 blur-xl" />
            <div className="relative overflow-hidden rounded-xl border border-white/15 bg-riff-header/90 p-4 shadow-xl backdrop-blur">
              <Image
                src="/images/land.png"
                alt="Escenario musical"
                width={900}
                height={700}
                className="h-56 w-full rounded-lg object-cover sm:h-72"
              />
            </div>
          </div>
        </section>
      </div>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl">Todo lo que necesitas para mover tu proyecto</h2>
            <p className="mt-2 text-sm text-white/70 sm:text-base">
              Menos herramientas sueltas, más tiempo para crear.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-sm border border-white/10 bg-riff-header/80 p-5">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-riff-primary/15 text-riff-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-white/10 bg-riff-header/40">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Cómo funciona</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-sm border border-white/10 bg-riff-card/70 p-5">
                <p className="text-xs font-bold text-riff-primary">PASO 1</p>
                <h3 className="mt-2 text-lg font-semibold">Crea tu perfil</h3>
                <p className="mt-2 text-sm text-white/70">Muestra quién eres, tu estilo y enlaces de contacto en minutos.</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-riff-card/70 p-5">
                <p className="text-xs font-bold text-riff-primary">PASO 2</p>
                <h3 className="mt-2 text-lg font-semibold">Publica canciones y eventos</h3>
                <p className="mt-2 text-sm text-white/70">Comparte contenido constante para mantener activa tu comunidad.</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-riff-card/70 p-5">
                <p className="text-xs font-bold text-riff-primary">PASO 3</p>
                <h3 className="mt-2 text-lg font-semibold">Convierte oyentes en fans</h3>
                <p className="mt-2 text-sm text-white/70">Usa cada lanzamiento para llevar público a tus siguientes shows.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Preguntas frecuentes</h2>
              <p className="mt-2 text-sm text-white/70">Respuestas rápidas para empezar sin problemas.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-sm border border-white/10 bg-riff-header/70 p-5">
                <h3 className="text-base font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm text-white/70">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mb-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-riff-primary/35 bg-gradient-to-r from-riff-primary-dark/65 to-riff-primary/45 p-7 sm:p-10">
            <h2 className="text-2xl font-extrabold sm:text-4xl">Construye tu comunidad y conecta con tu audiencia.</h2>
            <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
              Crea tu cuenta hoy y empieza a construir una comunidad real alrededor de tu musica.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-sm bg-white px-5 py-3 text-sm font-bold text-riff-primary-dark transition-opacity hover:opacity-90"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="rounded-sm border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
