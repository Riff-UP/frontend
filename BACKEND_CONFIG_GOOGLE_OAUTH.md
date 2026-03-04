# Configuración del Backend para Google OAuth

## URGENTE: Cambios Necesarios en el Backend

### Problema Principal
El backend está redirigiendo a `/home` cuando debería redirigir a `/` (raíz).

### Archivos a Modificar en el Backend

#### 1. Variables de Entorno (`.env`)

Busca y actualiza estas variables:

```env
# URL del frontend
FRONTEND_URL=http://localhost:3001
# IMPORTANTE: El frontend corre en puerto 3001, NO 3000

# Credenciales de Google OAuth (ya deberías tenerlas)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

#### 2. Configuración de Passport Google Strategy

Busca el archivo donde configuras la estrategia de Google (probablemente en `src/config/passport.ts` o `src/auth/strategies/google.strategy.ts`):

```typescript
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Tu lógica para crear/encontrar usuario
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      const name = profile.displayName;
      
      // Buscar o crear usuario
      let user = await findOrCreateUser({ email, googleId, name });
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));
```

#### 3. Rutas de Autenticación

Busca el archivo de rutas de auth (probablemente `src/routes/auth.routes.ts` o `src/auth/auth.controller.ts`):

**ANTES (INCORRECTO):**
```typescript
// ❌ NO HAGAS ESTO
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateJWT(req.user);
    res.redirect(`http://localhost:3000/home?token=${token}`); // ❌ INCORRECTO
  }
);
```

**DESPUÉS (CORRECTO):**
```typescript
// ✅ HAZ ESTO
router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: 'http://localhost:3001/login?error=google_auth_failed'
  }),
  (req, res) => {
    try {
      const token = generateJWT(req.user);
      // Redirigir a la RAÍZ del frontend con el token
      res.redirect(`http://localhost:3001/?token=${token}`); // ✅ CORRECTO
    } catch (error) {
      console.error('Error generando token:', error);
      res.redirect('http://localhost:3001/login?error=google_auth_failed');
    }
  }
);

// Ruta que inicia el flujo OAuth
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);
```

#### 4. Ejemplo Completo de Controlador

```typescript
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export class AuthController {
  // Iniciar flujo de Google OAuth
  googleAuth = passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  });

  // Callback de Google OAuth
  googleCallback = [
    passport.authenticate('google', { 
      session: false,
      failureRedirect: 'http://localhost:3001/login?error=google_auth_failed'
    }),
    (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        
        // Generar JWT
        const token = jwt.sign(
          { 
            id: user.id,
            email: user.email,
            role: user.role 
          },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        // Redirigir al frontend con el token
        res.redirect(`http://localhost:3001/?token=${token}`);
      } catch (error) {
        console.error('Error en Google callback:', error);
        res.redirect('http://localhost:3001/login?error=google_auth_failed');
      }
    }
  ];
}
```

### 5. Configuración en Google Cloud Console

1. Ve a https://console.cloud.google.com
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Edita tu **OAuth 2.0 Client ID**
5. En **Authorized redirect URIs**, asegúrate de tener:
   ```
   http://localhost:4000/api/auth/google/callback
   ```
6. En **Authorized JavaScript origins**, asegúrate de tener:
   ```
   http://localhost:3001
   http://localhost:4000
   ```

### 6. Verificar la Estructura de Rutas

Asegúrate de que tus rutas están montadas correctamente:

```typescript
// En tu archivo principal (app.ts o main.ts)
import authRoutes from './routes/auth.routes';

// Montar las rutas
app.use('/api/auth', authRoutes);

// Esto hace que las rutas sean:
// GET /api/auth/google - Inicia OAuth
// GET /api/auth/google/callback - Callback de Google
```

### 7. Función para Generar JWT

Si no la tienes, crea una función auxiliar:

```typescript
import jwt from 'jsonwebtoken';

export function generateJWT(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    googleId: user.googleId
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });
}
```

### 8. Modelo de Usuario (Prisma o TypeORM)

Asegúrate de que tu modelo de usuario tiene estos campos:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String?  // Opcional, porque Google OAuth no usa password
  googleId  String?  @unique
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // ... otros campos
}

enum Role {
  USER
  ARTIST
}
```

## Checklist de Verificación

Antes de probar, verifica:

- [ ] `.env` tiene `FRONTEND_URL=http://localhost:3001`
- [ ] La redirección en el callback usa la raíz `/` no `/home`
- [ ] La redirección incluye el puerto correcto `3001`
- [ ] Google Cloud Console tiene las URIs correctas
- [ ] Las rutas están montadas en `/api/auth`
- [ ] El JWT se genera correctamente
- [ ] El modelo de usuario acepta `googleId`

## Probar el Flujo

1. **Reinicia el servidor backend**
   ```bash
   npm run dev
   # o
   yarn dev
   ```

2. **Verifica que el frontend esté corriendo**
   - Debería estar en http://localhost:3001

3. **Prueba el login**
   - Ve a http://localhost:3001/login
   - Haz clic en "Continuar con Google"
   - Deberías ser redirigido a Google
   - Después de autenticarte, deberías volver a http://localhost:3001/

4. **Verifica en la consola del navegador**
   ```javascript
   localStorage.getItem('token') // Debería mostrar el JWT
   ```

## Logs Útiles para Depuración

Agrega estos logs en el callback del backend:

```typescript
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    console.log('🔍 Usuario autenticado:', req.user);
    
    const token = generateJWT(req.user);
    console.log('🎫 Token generado:', token.substring(0, 20) + '...');
    
    const redirectUrl = `http://localhost:3001/?token=${token}`;
    console.log('🔄 Redirigiendo a:', redirectUrl);
    
    res.redirect(redirectUrl);
  }
);
```

## Problemas Comunes y Soluciones

### "Error: redirect_uri_mismatch"
**Solución:** Verifica que la URI en Google Cloud Console coincida exactamente con `GOOGLE_CALLBACK_URL`

### "Cannot GET /home"
**Solución:** Cambia `/home` a `/` en el callback del backend

### "Token undefined en localStorage"
**Solución:** Verifica que el backend esté generando y enviando el token correctamente

### "Port 3000 in use"
**Solución:** Usa el puerto 3001 o libera el puerto 3000

## ¿Necesitas Ayuda?

Si después de estos cambios sigue sin funcionar:

1. Comparte los logs del backend (especialmente el callback)
2. Comparte la URL completa a la que te redirige (con el token)
3. Comparte cualquier error en la consola del navegador

