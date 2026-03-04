'use client';

import { useEffect, useState } from 'react';
import { decodeJWT, getUserFromToken, isJWTExpired, getValidToken } from '../../utils/jwt';

/**
 * Componente de debug para visualizar información del JWT
 * Úsalo temporalmente para verificar que todo funciona
 */
export default function JWTDebugger() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isExpired, setIsExpired] = useState<boolean | null>(null);
  const [tokenExists, setTokenExists] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      setTokenExists(true);
      setTokenInfo(decodeJWT(token));
      setUserInfo(getUserFromToken(token));
      setIsExpired(isJWTExpired(token));
    } else {
      setTokenExists(false);
    }
  }, []);

  const handleCheckToken = () => {
    const validToken = getValidToken();
    if (validToken) {
      alert('✅ Token válido encontrado');
      console.log('Token válido:', getUserFromToken());
    } else {
      alert('❌ No hay token válido (no existe o está expirado)');
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  if (!tokenExists) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded-lg shadow-lg max-w-md">
        <h3 className="font-bold mb-2">❌ No hay token JWT</h3>
        <p className="text-sm mb-2">Inicia sesión para ver información del token</p>
        <button
          onClick={() => window.location.href = '/login'}
          className="bg-white text-red-900 px-4 py-2 rounded hover:bg-gray-100"
        >
          Ir a Login
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md max-h-[80vh] overflow-y-auto">
      <h3 className="font-bold text-lg mb-3 border-b border-gray-700 pb-2">
        🔐 JWT Debugger
      </h3>

      <div className="space-y-3 text-sm">
        {/* Estado del token */}
        <div>
          <p className="font-semibold text-gray-400">Estado:</p>
          <p className={isExpired ? 'text-red-400' : 'text-green-400'}>
            {isExpired ? '❌ Expirado' : '✅ Válido'}
          </p>
        </div>

        {/* Información del usuario */}
        {userInfo && (
          <div>
            <p className="font-semibold text-gray-400">Usuario:</p>
            <div className="bg-gray-800 p-2 rounded mt-1">
              <p><span className="text-gray-500">ID:</span> {userInfo.id}</p>
              <p><span className="text-gray-500">Email:</span> {userInfo.email}</p>
              {userInfo.role && (
                <p><span className="text-gray-500">Rol:</span> {userInfo.role}</p>
              )}
            </div>
          </div>
        )}

        {/* Token completo */}
        {tokenInfo && (
          <div>
            <p className="font-semibold text-gray-400">Payload Completo:</p>
            <pre className="bg-gray-800 p-2 rounded mt-1 text-xs overflow-x-auto">
              {JSON.stringify(tokenInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Tiempos */}
        {tokenInfo?.iat && (
          <div>
            <p className="font-semibold text-gray-400">Creado:</p>
            <p className="text-xs text-gray-500">
              {new Date(tokenInfo.iat * 1000).toLocaleString()}
            </p>
          </div>
        )}

        {tokenInfo?.exp && (
          <div>
            <p className="font-semibold text-gray-400">Expira:</p>
            <p className="text-xs text-gray-500">
              {new Date(tokenInfo.exp * 1000).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {Math.floor((tokenInfo.exp * 1000 - Date.now()) / 1000 / 60)} minutos restantes
            </p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="mt-4 space-y-2">
        <button
          onClick={handleCheckToken}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          Validar Token
        </button>
        <button
          onClick={handleClearToken}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          Limpiar Token
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3 border-t border-gray-700 pt-2">
        💡 Este componente es solo para desarrollo. Elimínalo en producción.
      </p>
    </div>
  );
}

