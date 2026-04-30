# Frontend - Riff

![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextjs&logoColor=white)
![React](https://img.shields.io/badge/react-%2361DAFB.svg?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2306B6D4.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

## 📌 Descripción

Cliente web de Riff, una plataforma de descubrimiento musical y conexión social para artistas emergentes. Construido con Next.js 13+ y App Router, ofrece experiencia de usuario moderna con autenticación JWT, manejo de contenido en tiempo real y herramientas de creación para músicos.

## Problema que resuelve

Artistas independientes carecen de una plataforma que combine descubrimiento musical, conexión social y análisis de audiencia en un solo lugar. El frontend de Riff debe ser:

- **Rápido**: Carga inicial < 2s, navegación instantánea
- **Intuitivo**: Onboarding visual para músicos no técnicos
- **Responsive**: Desde vista móvil hasta vista de escritorio sin perder funcionalidad
- **Seguro**: JWT tokens, CSRF protection, rate limiting del lado del cliente

## Responsabilidades principales

- Renderizar feeds de contenido musical (publicaciones, eventos, reacciones).
- Gestionar autenticación (Email/Contraseña + Google OAuth).
- Permitir a usuarios crear perfiles, seguir artistas, guardar publicaciones.
- Facilitar carga y gestión de contenido multimedia (imágenes, música).
- Mostrar eventos musicales y permitir asistencia.
- Proporcionar análisis básicos de perfil y audiencia.
- Implementar optimización de rendimiento (lazy loading, code splitting, caché).

## Flujo general

```text
Browser -> Next.js App
  - Authentication (JWT en localStorage)
  - OAuth redirect (Google)
  - Session management
  
Browser -> Client Gateway (API)
  - GET /users/:id (perfil)
  - POST /posts (crear publicación)
  - GET /feed (feed de contenido)
  - POST /events (crear evento)
  - GET /notifications (websockets)
  
Gateway -> Microservicios
  (users-ms, content-ms, notifications-ms)
  
Database <- Microservicios
  (PostgreSQL, MongoDB, Redis)
```

Cada petición es autenticada con JWT. El frontend maneja reintentos automáticos para fallos temporales y expone errores amigables al usuario.

## Decisiones técnicas

- **Next.js 13+ App Router**: Renderizado híbrido (SSR + SSG), API routes, streaming (Future).
- **TypeScript**: Type safety en componentes, hooks y llamadas API.
- **Tailwind CSS**: Utility-first para estilos predecibles, responsive design rápido.
- **React Query (tanstack/query)**: Caching automático, reintentos, sincronización de estado del servidor.
- **JWT en localStorage**: Acceso rápido a tokens en cada petición (trade-off: vulnerable a XSS, mitigado con CSP).
- **Lazy Loading + Code Splitting**: Rutas dinámicas importan componentes solo cuando se necesitan.
- **Vercel Deployment**: Integración nativa con Next.js, edge functions, automatic deployments en push.


---

## Desarrollo local

### Requisitos

- Node.js 18+
- npm o yarn
- Gateway API corriendo localmente (`http://localhost:3000`)

### Instalación

```bash
npm install
```

### Variables de entorno

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu_client_id_de_google
NEXT_PUBLIC_ANALYTICS_ID=tu_google_analytics_id
```

### Ejecución

```bash
# Desarrollo
npm run dev

# Build y producción
npm run build
npm run start

# Pruebas
npm run test
npm run lint
```

### Verificación

```bash
# Acceso en el navegador
http://localhost:3000
```

## Relación con el sistema

El frontend es la **interfaz visual y puerta de entrada** para todos los usuarios de Riff. Su responsabilidad es:

1. **Presentar datos** de forma clara y atractiva (contenido, perfiles, eventos).
2. **Recopilar interacciones** del usuario (clics, likes, comentarios, creación de contenido).
3. **Delegar lógica de negocio** al gateway y microservicios (nunca hacer validación crítica en cliente).
4. **Optimizar experiencia** con caché, lazy loading y progresiva enhancement.
5. **Escalar sin acoplamiento**: Si cambios en el gateway o microservicios requieren cambios en el frontend, estos deben ser mínimos.

El frontend demuestra patrones modernos de desarrollo web: SSR, ISR, API routes, autenticación segura, y optimización de performance crítica para retención de usuarios.