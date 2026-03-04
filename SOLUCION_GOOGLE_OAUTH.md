# Solución para Google OAuth Login

## Problema Identificado

El error 404 que aparece durante el login con Google ocurre porque:

1. **El backend está redirigiendo a una ruta incorrecta**: `/home` en lugar de `/`
2. **La URL de callback no coincide con lo que espera el frontend**

## Cambios Realizados en el Frontend

### 1. Archivo `src/app/page.tsx`
Se ha refactorizado para manejar correctamente el OAuth callback:

```typescript
- Se creó el componente `OAuthHandler()` para capturar el token de los parámetros URL
- Se envolvió todo en un `Suspense` boundary (requerido por Next.js 13+ para useSearchParams)
- Se maneja correctamente tanto el token como los errores de OAuth
```

**Comportamiento**:
- Cuando Google redirige a `http://localhost:3000/?token=xyz123`, el frontend captura el token
- Si hay un error, redirige a `/login?error=google_auth_failed`
- El token se guarda en localStorage y se dispara el evento 'authChange'

### 2. Archivo `src/app/hooks/useLogin.ts`
Se agregó manejo de errores de OAuth:

```typescript
- Detecta errores desde los parámetros URL (?error=...)
- Muestra mensajes apropiados al usuario
```

### 3. Archivo `src/app/login/page.tsx`
Se envolvió el componente Login con Suspense para evitar errores de hidratación.

## ⚠️ CONFIGURACIÓN REQUERIDA EN EL BACKEND

Para que funcione correctamente, el backend debe:

### 1. Configurar la URL de redirección correcta

**Archivo de configuración del backend (probablemente en un `.env` o configuración de Passport.js)**:

```env
# FRONTEND_URL debe apuntar a la raíz del frontend
FRONTEND_URL=http://localhost:3000

# NO usar:
# FRONTEND_URL=http://localhost:3000/home  ❌
```

### 2. Configurar el callback de Google OAuth

**En la estrategia de Google OAuth del backend**:

```javascript
// En el callback de Google OAuth (después de autenticación exitosa)
passport.authenticate('google', {
  successRedirect: 'http://localhost:3000/?token=',  // ✅ Correcto
  failureRedirect: 'http://localhost:3000/login?error=google_auth_failed'
});

// O si usas un callback personalizado:
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = generateToken(req.user); // Tu función para generar JWT
    // Redirigir a la raíz con el token
    res.redirect(`http://localhost:3000/?token=${token}`);  // ✅ Correcto
  }
);
```

### 3. Verificar las rutas del backend

Asegúrate de que existan estas rutas:

```javascript
// Ruta que inicia el flujo OAuth
app.get('/api/auth/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Ruta de callback que Google llamará después de autenticación
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { session: false }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      res.redirect(`http://localhost:3000/?token=${token}`);
    } catch (error) {
      res.redirect('http://localhost:3000/login?error=google_auth_failed');
    }
  }
);
```

### 4. Configurar Google Cloud Console

En la consola de Google Cloud, asegúrate de que las URIs de redirección autorizadas incluyan:

```
http://localhost:4000/api/auth/google/callback
http://localhost:3000
```

## Flujo Completo de Autenticación OAuth

```
1. Usuario hace clic en "Continuar con Google"
   ↓
2. Frontend redirige a: http://localhost:4000/api/auth/google
   ↓
3. Backend redirige a Google para autenticación
   ↓
4. Usuario se autentica en Google
   ↓
5. Google redirige a: http://localhost:4000/api/auth/google/callback?code=...
   ↓
6. Backend procesa el code, crea/encuentra usuario, genera JWT
   ↓
7. Backend redirige a: http://localhost:3000/?token=JWT_TOKEN
   ↓
8. Frontend (OAuthHandler) captura el token de la URL
   ↓
9. Frontend guarda el token en localStorage
   ↓
10. Frontend dispara evento 'authChange' para actualizar el header
   ↓
11. Frontend limpia la URL y muestra la página principal
```

## Pruebas

Para probar que funciona:

1. **Reinicia el servidor backend** con los cambios de configuración
2. **Reinicia el servidor frontend** (ya está corriendo en puerto 3001 según el log)
3. Ve a `http://localhost:3001/login`
4. Haz clic en "Continuar con Google"
5. Deberías ver:
   - Pantalla de autenticación de Google
   - Redirección a la página principal con el token
   - El header debería mostrar tu perfil (icono/nombre)

## Depuración

Si sigue sin funcionar, abre la consola del navegador (F12) y verifica:

```javascript
// En la consola, después de intentar login con Google:
console.log(localStorage.getItem('token')); // Debería mostrar el JWT
console.log(window.location.href); // Verificar la URL de redirección
```

También revisa los logs del backend para ver a qué URL está redirigiendo.

## Notas Importantes

- El puerto del frontend es **3001** (según el log), no 3000
- Actualiza todas las URLs del backend para usar `http://localhost:3001`
- O detén el proceso que usa el puerto 3000 y reinicia el frontend

## Archivos Modificados

1. ✅ `src/app/page.tsx` - Agregado OAuthHandler y Suspense
2. ✅ `src/app/hooks/useLogin.ts` - Agregado manejo de errores OAuth
3. ✅ `src/app/login/page.tsx` - Agregado Suspense wrapper

## Pendiente en el Backend

- ❌ Configurar URL de redirección correcta (cambiar de `/home` a `/`)
- ❌ Asegurar que el token se pasa en la URL como query parameter
- ❌ Actualizar el puerto si es necesario (3001 en lugar de 3000)

