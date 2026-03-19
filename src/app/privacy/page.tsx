import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-riff-background-b py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-riff-header border border-white/5 rounded-lg p-6 sm:p-10 shadow-xl">
        
        <div className="mb-8">
          <Link 
            href="/" 
            className="text-riff-primary hover:text-riff-primary-dark font-medium transition-colors flex items-center gap-2 w-fit"
          >
            &larr; Volver al inicio
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Política de Privacidad y Términos</h1>
        <p className="text-white/50 text-sm mb-8">Última actualización: 19 de marzo de 2026</p>

        <div className="space-y-8 text-white/80 leading-relaxed text-sm sm:text-base">
          
          <section className="p-4 bg-riff-primary/10 border border-riff-primary/20 rounded-md">
            <h2 className="text-lg font-semibold text-riff-primary mb-2">1. Naturaleza y Propósito de la Plataforma</h2>
            <p className="text-white/90">
              ReSet es una herramienta digital de acompañamiento diseñada para adultos (mayores de 18 años)
              que se encuentran en etapa de abstinencia activa o recuperación avanzada. La plataforma te permite
              llevar una bitácora diaria de tu estado emocional, gestionar un sistema de rachas de sobriedad,
              y mantener un enlace directo con una red de apoyo y un foro comunitario.
            </p>
            <p className="text-white/90 mt-3">
              <strong>Importante:</strong> ReSet es una herramienta de apoyo y automonitoreo; en ningún
              momento sustituye el diagnóstico, tratamiento médico, psicológico o psiquiátrico profesional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Uso de Datos para Investigación Científica</h2>
            <p>
              Además de proporcionarte una red de apoyo, ReSet es un proyecto desarrollado por un equipo
              de ingeniería de software integrado por:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Gilberto Málaga Fernández</li>
              <li>Luis Alberto Náfate Hernández</li>
              <li>Jeshua Isaac Luna Zúñiga</li>
            </ul>
            <p className="mt-3">
              El proyecto tiene un propósito de investigación académica avalado bajo las normativas de salud.
              Al utilizar la plataforma, aceptas que los datos estadísticos generados por tu interacción sirvan
              para comprobar la siguiente hipótesis de investigación:
            </p>
            <blockquote className="mt-3 border-l-2 border-riff-primary/40 pl-4 text-white/90 italic">
              "La integración de un canal de enlace social dentro de la plataforma Reset actúa como un facilitador
              para la apertura emocional del usuario. Se postula que la existencia de este recurso técnico incrementa
              la frecuencia de los registros de vulnerabilidad, al reducir la percepción de aislamiento durante el
              proceso de recuperación, independientemente de la naturaleza (química o conductual) de la adicción."
            </blockquote>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Información que recopilamos</h2>
            <p>En Riff, recopilamos la información mínima necesaria para brindarte la mejor experiencia musical. Esto incluye:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Datos de cuenta (vía Google OAuth):</strong> Nombre, dirección de correo electrónico y foto de perfil pública.</li>
              <li><strong>Datos de uso:</strong> Eventos a los que asistes, reseñas que publicas, artistas que sigues y publicaciones que guardas.</li>
            </ul>
          </section>

          {/* NUEVA SECCIÓN: Contenido Multimedia */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Contenido Generado por el Usuario (Fotos y Videos)</h2>
            <p>
              Como usuario o artista, puedes subir contenido multimedia (fotografías, videos, portadas de eventos o publicaciones) a Riff. Al hacerlo, aceptas que:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Tú conservas todos los derechos de propiedad intelectual sobre tu contenido original.</li>
              <li>Nos otorgas una licencia no exclusiva para mostrar, reproducir y distribuir ese contenido públicamente dentro de Riff.</li>
              <li>Eres responsable de asegurarte de que tu contenido no infrinja derechos de autor de terceros ni contenga material ofensivo, ilegal o inapropiado.</li>
              <li>El equipo de Riff se reserva el derecho de eliminar cualquier contenido multimedia que incumpla estas normas sin previo aviso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cómo usamos tu información</h2>
            <p>Utilizamos tus datos para el funcionamiento de la plataforma y para el análisis académico del proyecto:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Para crear y gestionar tu cuenta de Usuario o Artista.</li>
              <li>Para mostrarte eventos relevantes y permitirte interactuar con ellos.</li>
              <li>Para enviarte notificaciones sobre cambios en eventos o actualizaciones.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Autenticación con Google (OAuth)</h2>
            <p>
              Riff utiliza los servicios de Google para facilitar tu acceso de forma segura. Nuestra aplicación solo 
              solicita acceso a tu perfil básico y correo electrónico. <strong>No tenemos acceso a tus contraseñas de Google</strong>, 
              no leemos tus correos personales ni alteramos la información de tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Tus Derechos (ARCO)</h2>
            <p>
              De acuerdo con la legislación vigente aplicable en México, tienes derecho a acceder, rectificar, 
              cancelar u oponerte al uso de tus datos personales. Puedes eliminar tus reseñas, dejar de seguir 
              artistas o solicitar la eliminación permanente de tu cuenta en cualquier momento.
            </p>
          </section>

          {/* SECCIÓN DE CONTACTO */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contacto</h2>
            <p>
              Si tienes preguntas, dudas o solicitudes relacionadas con esta Política de Privacidad, 
              el manejo de tus datos o el contenido publicado en Riff, por favor contáctanos en:
            </p>
            <div className="mt-4 p-5 bg-white/5 rounded-md border border-white/10 flex flex-col gap-3">
              <a href="mailto:riff2496@gmail.com" className="text-riff-primary hover:text-riff-primary-dark transition-colors font-medium">
                riff2496@gmail.com
              </a>
              <div className="border-t border-white/10 pt-3 mt-1">
                <p className="text-sm text-white/50">Chiapas, México.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}