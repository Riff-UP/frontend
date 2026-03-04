# ✅ IMPLEMENTACIÓN COMPLETADA - Subida de Imágenes a R2

## 🎯 Solución Implementada

He modificado el sistema para que **el frontend envíe la imagen al backend, y el backend la suba a R2**. Esto evita los problemas de DNS/CORS que estabas experimentando.

---

## 📦 Cambios en el Frontend (✅ COMPLETADOS)

### 1. **Actualizado:** `src/app/utils/r2Storage.ts`
- ✅ Simplificada la lógica
- ✅ Convierte imagen a Base64
- ✅ Envía al backend vía POST `/api/upload/r2`
- ✅ El backend retorna la URL de R2

### 2. **Hook usePosts.ts**
- ✅ Ya usa `uploadToR2` correctamente
- ✅ Logs de depuración agregados

---

## ⚙️ Implementación Requerida en el Backend

### Endpoint Necesario:

```
POST /api/upload/r2
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "filename": "1234567890-abc.jpg",
  "contentType": "image/jpeg",
  "base64Data": "iVBORw0KGgoAAAANSUhEUgAA..."
}

Response:
{
  "url": "https://pub-5a853459931144dca4331ca77afeee53.r2.dev/1234567890-abc.jpg"
}
```

### Guía Completa de Implementación:

📄 **Ver archivo: `BACKEND_ENDPOINT_R2.md`**

Contiene:
- Código completo de NestJS (Controller, Service, Module)
- Instalación de dependencias
- Variables de entorno
- Comandos para probar
- Troubleshooting

---

## 🚀 Flujo Completo

```
1. Usuario selecciona imagen en el frontend
   ↓
2. Frontend convierte a Base64
   ↓
3. Frontend envía a: POST http://localhost:4000/api/upload/r2
   {
     "filename": "unique-name.jpg",
     "contentType": "image/jpeg",
     "base64Data": "..."
   }
   ↓
4. Backend recibe la petición
   ↓
5. Backend sube a R2 usando @aws-sdk/client-s3
   ↓
6. Backend retorna: { "url": "https://pub-xxx.r2.dev/image.jpg" }
   ↓
7. Frontend recibe la URL
   ↓
8. Frontend crea el post: POST /api/posts
   {
     "authorId": "user-id",
     "content": "texto",
     "mediaUrl": "https://pub-xxx.r2.dev/image.jpg",
     "mediaType": "image"
   }
   ↓
9. ✅ Post creado con imagen
```

---

## 📋 Pasos Siguientes

### 1. Implementar el Endpoint en el Backend

```bash
cd client-gateway

# Instalar dependencia
npm install @aws-sdk/client-s3

# Crear archivos (ver BACKEND_ENDPOINT_R2.md)
# - src/upload/upload.module.ts
# - src/upload/upload.service.ts
# - src/upload/upload.controller.ts

# Agregar variables de entorno en .env
# R2_ENDPOINT=...
# R2_ACCESS_KEY=...
# R2_SECRET_KEY=...
# R2_BUCKET=...
# R2_PUBLIC_URL=...

# Registrar módulo en app.module.ts

# Reiniciar
npm run start:dev
```

### 2. Probar el Endpoint

```bash
curl -X POST http://localhost:4000/api/upload/r2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "base64Data": "SMALL_BASE64_STRING"
  }'
```

Debe retornar:
```json
{
  "url": "https://pub-5a853459931144dca4331ca77afeee53.r2.dev/test.jpg"
}
```

### 3. Probar desde el Frontend

1. Abre http://localhost:3001
2. Inicia sesión
3. Ve a Publicaciones
4. Escribe texto y selecciona una imagen
5. Click en "Publicar"
6. **Revisa la consola del navegador** (F12)

Deberías ver:
```
🚀 Iniciando subida a R2... {name: "image.jpg", size: 123456, type: "image/jpeg"}
📦 Archivo preparado: {filename: "1234-abc.jpg", size: 567890}
📡 Respuesta del backend: 200 OK
✅ Subida exitosa: {url: "https://pub-xxx.r2.dev/1234-abc.jpg"}
Post creado exitosamente
```

---

## 🐛 Solución al Problema de DNS en Docker

Si el backend en Docker no puede acceder a R2, tienes 2 opciones:

### Opción 1: Ejecutar Backend Fuera de Docker (Recomendado para desarrollo)

```bash
# Detener contenedor
docker stop riff_client_gateway

# Ir al directorio
cd client-gateway

# Instalar dependencias
npm install
npm install @aws-sdk/client-s3

# Configurar .env
# Agregar variables R2...

# Ejecutar
npm run start:dev
```

El backend se ejecutará en localhost sin restricciones de red.

### Opción 2: Configurar DNS en Docker

**Archivo: `docker-compose.yml`**

```yaml
services:
  client-gateway:
    # ...configuración existente
    dns:
      - 8.8.8.8
      - 8.8.4.4
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Luego:
```bash
docker-compose down
docker-compose up -d
```

---

## ✅ Estado Actual

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Frontend | ✅ LISTO | Envía imagen al backend en Base64 |
| r2Storage.ts | ✅ ACTUALIZADO | Usa endpoint del backend |
| usePosts.ts | ✅ ACTUALIZADO | Flujo completo implementado |
| Backend Endpoint | ⏳ PENDIENTE | Necesita implementarse |

---

## 📚 Archivos de Referencia

1. **BACKEND_ENDPOINT_R2.md** - Implementación completa del backend
2. **DEBUG_PUBLICACIONES.md** - Guía de depuración
3. **SOLUCION_UPLOAD_BACKEND.md** - Documentación anterior
4. **README_PUBLICACIONES_R2.md** - Guía original

---

## 🎉 Próximo Paso

**Implementa el endpoint `/api/upload/r2` en el backend** siguiendo la guía en `BACKEND_ENDPOINT_R2.md`.

Una vez implementado, todo funcionará automáticamente desde el frontend.

---

¿Necesitas ayuda implementando el backend? Puedo guiarte paso a paso.

