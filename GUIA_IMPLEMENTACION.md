# 🚀 Guía de Implementación Rápida

## ✅ Archivos Creados

1. **`src/app/utils/jwt.ts`** - Utilidades para trabajar con JWT
2. **`src/app/components/common/JWTDebugger.tsx`** - Componente de debug visual
3. **`SOLUCION_CORS.md`** - Guía completa de CORS
4. **`BACKEND_CORS_CONFIG.js`** - Código listo para copiar al backend
5. **`USO_JWT_UTILS.md`** - Ejemplos de uso de las utilidades JWT

---

## 🎯 PASO 1: Solucionar CORS (BACKEND)

### Opción A: Si usas Express.js

1. Ve a tu proyecto backend
2. Instala el paquete:
```bash
cd ../backend  # o la ruta de tu backend
npm install cors
npm install --save-dev @types/cors
```

3. Abre tu archivo principal (ej: `src/app.ts`, `src/index.ts`, `src/server.ts`)

4. Agrega ANTES de tus rutas:
```typescript
import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

5. Reinicia el servidor backend:
```bash
npm run dev
```

### Opción B: Si usas NestJS

1. Abre `src/main.ts`
2. Añade antes de `app.listen()`:
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
});
```

---

## 🎯 PASO 2: Probar Extracción de JWT (FRONTEND)

### 2.1 Agregar el Debugger Temporalmente

Abre tu archivo `src/app/page.tsx` y agrega el componente JWTDebugger:

```typescript
import JWTDebugger from './components/common/JWTDebugger';

export default function Home() {
  return (
    <>
      {/* Tu contenido normal */}
      
      {/* Solo en desarrollo - ver datos del JWT */}
      {process.env.NODE_ENV === 'development' && <JWTDebugger />}
    </>
  );
}
```

### 2.2 Reiniciar el Frontend

```bash
npm run dev
```

### 2.3 Probar

1. Abre http://localhost:3000
2. Inicia sesión
3. Verás un panel flotante en la esquina inferior derecha mostrando:
   - Estado del token (válido o expirado)
   - ID del usuario
   - Email
   - Rol
   - Fecha de creación y expiración

---

## 🎯 PASO 3: Usar las Utilidades JWT

### Ejemplo 1: En cualquier componente

```typescript
'use client';

import { getUserFromToken } from '@/app/utils/jwt';
import { useEffect, useState } from 'react';

export default function MiComponente() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const userData = getUserFromToken();
    if (userData) {
      setUserId(userData.id);
      console.log('Email del usuario:', userData.email);
    }
  }, []);

  return <div>ID del usuario: {userId || 'No hay sesión'}</div>;
}
```

### Ejemplo 2: Verificar autenticación

```typescript
'use client';

import { getValidToken } from '@/app/utils/jwt';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaginaProtegida() {
  const router = useRouter();

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      router.push('/login'); // Token no existe o expiró
    }
  }, [router]);

  return <div>Contenido protegido</div>;
}
```

### Ejemplo 3: Ver todos los datos del token

Abre la consola del navegador y ejecuta:

```javascript
import { decodeJWT, getUserFromToken } from '@/app/utils/jwt';

// Ver todo el contenido del JWT
const token = localStorage.getItem('token');
console.log('Token completo:', decodeJWT(token));

// O solo datos del usuario
console.log('Usuario:', getUserFromToken());
```

---

## 🎯 PASO 4: Verificar que todo funciona

### En la Consola del Navegador:

```javascript
// 1. Verificar token
const token = localStorage.getItem('token');
console.log('Token existe:', !!token);

// 2. Ver contenido del token
import { getUserFromToken } from '@/app/utils/jwt';
console.log('Datos del usuario:', getUserFromToken());

// 3. Probar petición al backend
const token = localStorage.getItem('token');
fetch('http://localhost:4000/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log('✅ Respuesta del backend:', data))
  .catch(err => console.error('❌ Error:', err));
```

---

## 📋 CHECKLIST COMPLETO

### Backend (CORS):
- [ ] Instalar paquete `cors`
- [ ] Configurar CORS en archivo principal
- [ ] Permitir orígenes: localhost:3000, localhost:3001
- [ ] Habilitar `credentials: true`
- [ ] Reiniciar servidor backend

### Frontend (JWT):
- [x] Archivo `src/app/utils/jwt.ts` creado ✅
- [x] Hook `useUser` actualizado ✅
- [x] Componente `JWTDebugger` creado ✅
- [ ] Agregar JWTDebugger a `page.tsx` temporalmente
- [ ] Iniciar sesión y verificar panel de debug
- [ ] Verificar que se extraen datos del JWT correctamente

### Pruebas:
- [ ] Login funciona sin errores CORS
- [ ] Se puede ver información del usuario
- [ ] Token se valida correctamente
- [ ] Tokens expirados se detectan y limpian
- [ ] Redirecciones a /login funcionan

---

## 🐛 Si algo no funciona

### Error: "CORS policy"
👉 **Solución**: Configurar CORS en el backend (ver PASO 1)

### Error: "Cannot find module '@/app/utils/jwt'"
👉 **Solución**: Verifica que el archivo existe en `src/app/utils/jwt.ts`

### No se ve el JWTDebugger
👉 **Solución**: Verifica que hayas iniciado sesión y que el componente esté importado correctamente

### "Token undefined" o null
👉 **Solución**: 
1. Inicia sesión primero
2. Verifica en DevTools > Application > Local Storage que existe la key 'token'

---

## 🎨 Remover el Debugger (cuando ya no lo necesites)

Simplemente quita el import y el componente de `page.tsx`:

```typescript
// Eliminar estas líneas:
import JWTDebugger from './components/common/JWTDebugger';
{process.env.NODE_ENV === 'development' && <JWTDebugger />}
```

---

## 📚 Documentación Adicional

- **`SOLUCION_CORS.md`** - Todo sobre CORS
- **`USO_JWT_UTILS.md`** - Más ejemplos de uso de JWT
- **`BACKEND_CORS_CONFIG.js`** - Código listo para copiar

---

## ✨ Resumen

### Lo que se solucionó:

1. ✅ **Error CORS**: Guía completa para configurar el backend
2. ✅ **Extraer datos del JWT**: Utilidades listas para usar
3. ✅ **Validación automática**: Detecta tokens expirados
4. ✅ **Componente de debug**: Visualiza toda la info del token
5. ✅ **Ejemplos de uso**: Casos comunes implementados

### Próximos pasos:

1. Configurar CORS en el backend
2. Probar el JWTDebugger
3. Implementar las utilidades JWT donde las necesites
4. Eliminar el debugger cuando ya no lo necesites

---

## 🆘 Necesitas más ayuda?

Si sigues teniendo problemas:

1. Verifica la consola del navegador (F12)
2. Verifica logs del servidor backend
3. Prueba las peticiones en Postman o similar
4. Revisa que el JWT contenga los datos que esperas

**Comando útil para ver tu JWT:**
```javascript
console.log(localStorage.getItem('token'));
// Copia el token y pégalo en: https://jwt.io
```

