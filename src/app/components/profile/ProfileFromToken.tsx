'use client';

import { useEffect, useState } from 'react';
import { getUserFromToken, JWTPayload } from '@/app/utils/jwt';

/**
 * Componente temporal que muestra datos del usuario desde el JWT
 * Usa esto mientras configuras CORS en el backend
 */
export default function ProfileFromToken() {
  const [userData, setUserData] = useState<JWTPayload | null>(null);

  useEffect(() => {
    const data = getUserFromToken();
    setUserData(data);
  }, []);

  if (!userData) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
        <p className="text-yellow-200">⚠️ No hay sesión activa o el token expiró</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aviso temporal */}
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
        <h3 className="text-blue-200 font-bold mb-2">ℹ️ Datos desde el Token JWT</h3>
        <p className="text-blue-200 text-sm">
          Estos datos provienen directamente del token. Para ver todos los datos del perfil,
          necesitas configurar CORS en el backend.
        </p>
      </div>

      {/* Información del usuario */}
      <div className="bg-riff-card rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Información del Usuario</h2>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">ID</label>
            <p className="text-white font-mono text-sm bg-gray-800 p-2 rounded mt-1">
              {userData.id}
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <p className="text-white text-lg">
              {userData.email}
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Rol</label>
            <p className="text-white">
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                userData.role === 'ARTIST' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                {userData.role === 'ARTIST' ? '🎵 Artista' : '👤 Usuario'}
              </span>
            </p>
          </div>

          {userData.iat && (
            <div>
              <label className="text-gray-400 text-sm">Sesión iniciada</label>
              <p className="text-white">
                {new Date(userData.iat * 1000).toLocaleString('es-ES')}
              </p>
            </div>
          )}

          {userData.exp && (
            <div>
              <label className="text-gray-400 text-sm">Sesión expira</label>
              <p className="text-white">
                {new Date(userData.exp * 1000).toLocaleString('es-ES')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instrucciones para solucionar CORS */}
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
        <h3 className="text-red-200 font-bold mb-2">🔧 Para ver todos tus datos:</h3>
        <ol className="text-red-200 text-sm space-y-2 ml-4 list-decimal">
          <li>Ve a tu proyecto backend</li>
          <li>Instala: <code className="bg-red-950 px-2 py-1 rounded">npm install cors</code></li>
          <li>
            Agrega ANTES de tus rutas:
            <pre className="bg-red-950 p-2 rounded mt-2 text-xs overflow-x-auto">
{`app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));`}
            </pre>
          </li>
          <li>Reinicia el servidor backend</li>
        </ol>
      </div>
    </div>
  );
}

