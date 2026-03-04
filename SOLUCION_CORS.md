# Solución Completa al Error CORS

## Problema
El frontend (localhost:3000) no puede hacer peticiones al backend (localhost:4000) debido a errores de CORS.

## Causa
El backend no está configurado correctamente para permitir peticiones desde el origen del frontend.

---

## SOLUCIÓN EN EL BACKEND

### 1. Instalar el paquete CORS (si usas Express.js)

```bash
npm install cors
npm install --save-dev @types/cors
```

### 2. Configurar CORS en el Backend

#### Para Express.js:

**Archivo: `src/app.ts` o `src/index.ts` o `src/server.ts`**

```typescript
import express from 'express';
import cors from 'cors';

const app = express();

// CONFIGURACIÓN CORS - DEBE IR ANTES DE LAS RUTAS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Orígenes permitidos
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
  exposedHeaders: ['Authorization'], // Headers expuestos al cliente
  maxAge: 86400 // Cache de preflight por 24 horas
}));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TUS RUTAS VAN AQUÍ
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// etc...

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

#### Para NestJS:

**Archivo: `src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  });

  await app.listen(4000);
}
bootstrap();
```

### 3. Variables de Entorno del Backend

**Archivo: `.env`**

```env
# URLs permitidas
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Puerto del backend
PORT=4000

# JWT
JWT_SECRET=tu_secreto_super_seguro_aqui
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id_de_google
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

### 4. Configuración Dinámica de CORS (Recomendado)

```typescript
import express from 'express';
import cors from 'cors';

const app = express();

// Lista de orígenes permitidos desde variables de entorno
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (como Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## VERIFICACIÓN

### 1. Reinicia el servidor backend
```bash
npm run dev
# o
npm start
```

### 2. Verifica que CORS esté funcionando

Abre la consola del navegador y ejecuta:

```javascript
fetch('http://localhost:4000/api/users/artists')
  .then(res => res.json())
  .then(data => console.log('✅ CORS funciona!', data))
  .catch(err => console.error('❌ Error:', err));
```

### 3. Verifica con autenticación

```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:4000/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log('✅ Autenticación funciona!', data))
  .catch(err => console.error('❌ Error:', err));
```

---

## ERRORES COMUNES

### Error: "No 'Access-Control-Allow-Origin' header"
**Solución:** El backend no tiene CORS configurado o está configurado incorrectamente.

### Error: "Preflight request doesn't pass"
**Solución:** Necesitas permitir el método OPTIONS explícitamente.

### Error: "Credentials mode is 'include'"
**Solución:** Añade `credentials: true` en la configuración de CORS del backend.

---

## CHECKLIST DE CONFIGURACIÓN

- [ ] Instalar paquete `cors` en el backend
- [ ] Configurar CORS antes de las rutas
- [ ] Añadir orígenes permitidos (localhost:3000, localhost:3001)
- [ ] Permitir credentials: true
- [ ] Permitir headers: Authorization, Content-Type
- [ ] Permitir métodos: GET, POST, PUT, PATCH, DELETE, OPTIONS
- [ ] Reiniciar servidor backend
- [ ] Probar peticiones desde el frontend
- [ ] Verificar que el token JWT se envía correctamente

---

## CONFIGURACIÓN DE PRODUCCIÓN

Para producción, cambia los orígenes permitidos:

```typescript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://tu-dominio.com', 'https://www.tu-dominio.com']
  : ['http://localhost:3000', 'http://localhost:3001'];
```

---

## NOTAS IMPORTANTES

1. **CORS es una configuración del BACKEND**, no del frontend
2. El error aparece en el navegador pero se soluciona en el servidor
3. Siempre configura CORS ANTES de definir tus rutas
4. En producción, NUNCA uses `origin: '*'` con `credentials: true`

