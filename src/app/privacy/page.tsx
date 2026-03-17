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

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Política de Privacidad</h1>

        <div className="space-y-8 text-white/80 leading-relaxed text-sm sm:text-base">
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Información que recopilamos</h2>
            <p>En Riff, recopilamos la información mínima necesaria para brindarte la mejor experiencia musical. Esto incluye:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Datos de cuenta (vía Google OAuth):</strong> Nombre, dirección de correo electrónico y foto de perfil pública.</li>
              <li><strong>Datos de uso:</strong> Eventos a los que asistes, reseñas que publicas, artistas que sigues y publicaciones que guardas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Cómo usamos tu información</h2>
            <p>Utilizamos tus datos exclusivamente para el funcionamiento de la plataforma:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Para crear y gestionar tu cuenta de Usuario o Artista.</li>
              <li>Para mostrarte eventos relevantes y permitirte interactuar con ellos (asistir, calificar).</li>
              <li>Para enviarte notificaciones sobre cambios en eventos o actualizaciones de los artistas que sigues.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Autenticación con Google (OAuth)</h2>
            <p>
              Riff utiliza los servicios de Google para facilitar tu acceso de forma segura. Nuestra aplicación solo 
              solicita acceso a tu perfil básico y correo electrónico. <strong>No tenemos acceso a tus contraseñas de Google</strong>, 
              no leemos tus correos personales ni alteramos la información de tu cuenta de Google.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Protección y Compartición de Datos</h2>
            <p>
              La seguridad de tus datos es nuestra prioridad. Tu información se almacena de forma segura y las 
              comunicaciones con nuestro servidor están cifradas. <strong>Riff no vende, alquila ni comercializa 
              tu información personal a terceros.</strong> Solo compartimos información genérica y pública (como 
              tus reseñas o estadísticas de asistencia) dentro de la misma plataforma para que los artistas 
              puedan interactuar con su audiencia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Tus Derechos (ARCO)</h2>
            <p>
              De acuerdo con la legislación vigente aplicable en México, tienes derecho a acceder, rectificar, 
              cancelar u oponerte al uso de tus datos personales. Puedes eliminar tus reseñas, dejar de seguir 
              artistas o solicitar la eliminación permanente de tu cuenta en cualquier momento contactando 
              a nuestro equipo de soporte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Contacto</h2>
            <p>
              Si tienes preguntas, dudas o solicitudes relacionadas con esta Política de Privacidad o el manejo 
              de tus datos en Riff, por favor contáctanos en:
            </p>
            <div className="mt-4 p-4 bg-riff-background/50 rounded-sm border border-white/10">
              <p className="font-medium text-riff-primary">brianluisruizperez@gmail.com</p>
              <p className="text-sm text-white/50 mt-1">Chiapas, México.</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}