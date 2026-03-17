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
        <p className="text-white/50 text-sm mb-8">Última actualización: 17 de marzo de 2026</p>

        <div className="space-y-8 text-white/80 leading-relaxed text-sm sm:text-base">
          
          {/* NUEVA SECCIÓN: Propósito del Proyecto */}
          <section className="p-4 bg-riff-primary/10 border border-riff-primary/20 rounded-md">
            <h2 className="text-lg font-semibold text-riff-primary mb-2">Aviso Importante: Proyecto Académico</h2>
            <p className="text-white/90">
              Riff es una plataforma desarrollada como un proyecto académico por estudiantes de la 
              <strong> Universidad Politécnica de Chiapas (UPChiapas)</strong>. Su propósito es netamente 
              educativo y demostrativo. Aunque nos esforzamos por ofrecer la mejor experiencia y proteger 
              tus datos, la plataforma se proporciona "tal cual", sin fines de lucro comercial en esta etapa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Información que recopilamos</h2>
            <p>En Riff, recopilamos la información mínima necesaria para brindarte la mejor experiencia musical. Esto incluye:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Datos de cuenta (vía Google OAuth):</strong> Nombre, dirección de correo electrónico y foto de perfil pública.</li>
              <li><strong>Datos de uso:</strong> Eventos a los que asistes, reseñas que publicas, artistas que sigues y publicaciones que guardas.</li>
            </ul>
          </section>

          {/* NUEVA SECCIÓN: Contenido Multimedia */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Contenido Generado por el Usuario (Fotos y Videos)</h2>
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
            <h2 className="text-xl font-semibold text-white mb-3">3. Cómo usamos tu información</h2>
            <p>Utilizamos tus datos exclusivamente para el funcionamiento de la plataforma:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Para crear y gestionar tu cuenta de Usuario o Artista.</li>
              <li>Para mostrarte eventos relevantes y permitirte interactuar con ellos.</li>
              <li>Para enviarte notificaciones sobre cambios en eventos o actualizaciones.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Autenticación con Google (OAuth)</h2>
            <p>
              Riff utiliza los servicios de Google para facilitar tu acceso de forma segura. Nuestra aplicación solo 
              solicita acceso a tu perfil básico y correo electrónico. <strong>No tenemos acceso a tus contraseñas de Google</strong>, 
              no leemos tus correos personales ni alteramos la información de tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Tus Derechos (ARCO)</h2>
            <p>
              De acuerdo con la legislación vigente aplicable en México, tienes derecho a acceder, rectificar, 
              cancelar u oponerte al uso de tus datos personales. Puedes eliminar tus reseñas, dejar de seguir 
              artistas o solicitar la eliminación permanente de tu cuenta en cualquier momento.
            </p>
          </section>

          {/* SECCIÓN DE CONTACTO */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Contacto</h2>
            <p>
              Si tienes preguntas, dudas o solicitudes relacionadas con esta Política de Privacidad, 
              el manejo de tus datos o el contenido publicado en Riff, por favor contáctanos en:
            </p>
            <div className="mt-4 p-5 bg-white/5 rounded-md border border-white/10 flex flex-col gap-3">
              <a href="mailto:brianluisruizperez@gmail.com" className="text-riff-primary hover:text-riff-primary-dark transition-colors font-medium">
                brianluisruizperez@gmail.com
              </a>
              <a href="mailto:diegoazarate110800@gmail.com" className="text-riff-primary hover:text-riff-primary-dark transition-colors font-medium">
                diegoazarate110800@gmail.com
              </a>
              <a href="mailto:camachogomezjuanmanue@gmail.com" className="text-riff-primary hover:text-riff-primary-dark transition-colors font-medium">
                camachogomezjuanmanue@gmail.com
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