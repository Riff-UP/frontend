# Cómo Usar las Utilidades JWT en el Frontend

## Archivo creado: `src/app/utils/jwt.ts`

Esta utilidad te permite **extraer y leer datos del JWT** directamente en el frontend sin necesidad de hacer peticiones al backend.

---

## 📋 Funciones Disponibles

### 1. `decodeJWT(token: string)`
Decodifica un JWT y devuelve su payload.

```typescript
import { decodeJWT } from '@/app/utils/jwt';

const token = localStorage.getItem('token');
const payload = decodeJWT(token);

console.log(payload);
// Ejemplo de salida:
// {
//   id: "123",
//   email: "usuario@example.com",
//   role: "ARTIST",
//   iat: 1234567890,
//   exp: 1234654290
// }
```

### 2. `isJWTExpired(token: string)`
Verifica si un token ha expirado.

```typescript
import { isJWTExpired } from '@/app/utils/jwt';

const token = localStorage.getItem('token');
if (isJWTExpired(token)) {
  console.log('❌ Token expirado, redirigir a login');
  // Limpiar y redirigir
  localStorage.removeItem('token');
  router.push('/login');
} else {
  console.log('✅ Token válido');
}
```

### 3. `getValidToken()`
Obtiene el token del localStorage y lo valida automáticamente.

```typescript
import { getValidToken } from '@/app/utils/jwt';

// Intenta obtener el token, si no existe o está expirado, devuelve null
const token = getValidToken();

if (token) {
  // Hacer petición con el token
  fetch('http://localhost:4000/api/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
} else {
  // Redirigir a login
  router.push('/login');
}
```

### 4. `getUserFromToken(token?: string)`
Extrae la información del usuario directamente del token.

```typescript
import { getUserFromToken } from '@/app/utils/jwt';

// Sin parámetro: obtiene el token del localStorage automáticamente
const userData = getUserFromToken();

if (userData) {
  console.log('ID del usuario:', userData.id);
  console.log('Email:', userData.email);
  console.log('Rol:', userData.role);
}

// Con parámetro: decodifica un token específico
const customToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const customUserData = getUserFromToken(customToken);
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Mostrar información del usuario sin hacer petición
```typescript
'use client';

import { getUserFromToken } from '@/app/utils/jwt';
import { useEffect, useState } from 'react';

export default function UserBadge() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const userData = getUserFromToken();
    if (userData) {
      setUserEmail(userData.email);
    }
  }, []);

  return (
    <div>
      {userEmail ? (
        <p>Bienvenido, {userEmail}</p>
      ) : (
        <p>No hay sesión</p>
      )}
    </div>
  );
}
```

### Caso 2: Verificar rol del usuario antes de mostrar contenido
```typescript
'use client';

import { getUserFromToken } from '@/app/utils/jwt';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = getUserFromToken();
    
    if (!userData) {
      router.push('/login');
      return;
    }

    if (userData.role !== 'ADMIN') {
      router.push('/'); // No es admin, redirigir
      return;
    }

    setIsAdmin(true);
  }, [router]);

  if (!isAdmin) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Panel de Administración</h1>
      {/* Contenido solo para admins */}
    </div>
  );
}
```

### Caso 3: Mostrar ID del usuario en una petición
```typescript
'use client';

import { getUserFromToken } from '@/app/utils/jwt';

async function likePost(postId: string) {
  const userData = getUserFromToken();
  
  if (!userData) {
    alert('Debes iniciar sesión');
    return;
  }

  console.log(`Usuario ${userData.id} dando like al post ${postId}`);
  
  // Hacer la petición...
  const response = await fetch(`http://localhost:4000/api/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
}
```

### Caso 4: Proteger una página completa
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken, getUserFromToken } from '@/app/utils/jwt';

export default function ProtectedPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getValidToken();
    
    if (!token) {
      // Token no existe o expiró
      router.push('/login');
      return;
    }

    const userData = getUserFromToken();
    console.log('Usuario autenticado:', userData?.email);
  }, [router]);

  return (
    <div>
      <h1>Página Protegida</h1>
      {/* Tu contenido aquí */}
    </div>
  );
}
```

### Caso 5: Middleware de autenticación en componente
```typescript
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken } from '@/app/utils/jwt';

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      router.push(redirectTo);
    }
  }, [router, redirectTo]);

  const token = getValidToken();
  
  if (!token) {
    return <div>Verificando autenticación...</div>;
  }

  return <>{children}</>;
}

// Uso:
// <AuthGuard>
//   <ContenidoProtegido />
// </AuthGuard>
```

---

## ⚠️ Notas Importantes

### 1. **Seguridad**
- Esta utilidad NO valida la firma del JWT (eso lo hace el backend)
- NO uses esto para tomar decisiones de seguridad críticas
- Siempre valida permisos en el backend

### 2. **Cuándo usar**
- ✅ Mostrar información básica del usuario
- ✅ Verificar si hay sesión antes de hacer peticiones
- ✅ Redirigir usuarios no autenticados
- ✅ Mostrar/ocultar elementos de UI según el rol

### 3. **Cuándo NO usar**
- ❌ Para autorizar acciones sensibles (hazlo en el backend)
- ❌ Para confiar en datos críticos sin verificar con el servidor
- ❌ Como única medida de seguridad

---

## 🔧 Integración con tus Hooks

El hook `useUser` ahora ya usa `getValidToken()` automáticamente:

```typescript
// src/app/hooks/useUser.ts
import { getValidToken, getUserFromToken } from '../utils/jwt';

export function useUser() {
  const getToken = (): string | null => {
    return getValidToken(); // ✅ Valida expiración automáticamente
  };
  
  // ...resto del código
}
```

---

## 📚 Estructura del JWT Típico

```json
{
  "id": "123abc",          // ID del usuario en la BD
  "email": "user@example.com",
  "role": "ARTIST",        // o "USER"
  "iat": 1234567890,       // Timestamp de creación (issued at)
  "exp": 1234654290        // Timestamp de expiración
}
```

Para ver qué contiene TU token:

```typescript
import { decodeJWT } from '@/app/utils/jwt';

const token = localStorage.getItem('token');
console.log('Mi token contiene:', decodeJWT(token));
```

---

## 🐛 Debug

Si tienes problemas, añade esto en tu código:

```typescript
import { decodeJWT, isJWTExpired, getUserFromToken } from '@/app/utils/jwt';

console.log('=== DEBUG JWT ===');
const token = localStorage.getItem('token');
console.log('Token existe:', !!token);
console.log('Token:', token?.substring(0, 50) + '...');
console.log('Token expirado:', token ? isJWTExpired(token) : 'N/A');
console.log('Contenido:', decodeJWT(token));
console.log('User data:', getUserFromToken());
console.log('================');
```

---

## ✅ Checklist de Implementación

- [x] Archivo `src/app/utils/jwt.ts` creado
- [x] Hook `useUser` actualizado para usar `getValidToken()`
- [ ] Probar extracción de datos del token en consola
- [ ] Implementar en componentes que necesiten info del usuario
- [ ] Verificar que tokens expirados se limpien automáticamente
- [ ] Revisar que las redirecciones funcionen correctamente

