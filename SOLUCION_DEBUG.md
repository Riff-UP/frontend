# 🔧 SOLUCIÓN - Publicaciones no Funcionan

## ✅ Cambios Realizados

He agregado **logs de depuración extensivos** para identificar el problema.

## 📝 Instrucciones de Depuración

### Paso 1: Abrir la Consola del Navegador

1. Presiona **F12** (o clic derecho → Inspeccionar)
2. Ve a la pestaña **"Console"**
3. Asegúrate de que esté visible

### Paso 2: Recargar la Página

1. Recarga la página con **Ctrl + R** o **F5**
2. Ve a la sección de **Publicaciones**

### Paso 3: Observar Logs Iniciales

Deberías ver algo como:

```
📝 Publications Component - Estado inicial: {user: "abc-123", postsCount: 0, uploading: false, postsError: null}
```

**¿Ves el log?**
- ✅ **SÍ** → Continúa al Paso 4
- ❌ **NO** → El componente no se está renderizando

### Paso 4: Intentar Publicar

1. **Escribe algo** en el campo de texto (ej: "Test")
2. Haz clic en el botón **"Publicar"**

### Paso 5: Revisar Logs al Publicar

Deberías ver una secuencia de logs como esta:

```javascript
// 1. Click en el botón
handlePublish llamado {
  newPost: "Test", 
  selectedFile: null, 
  user: "abc-123",
  hasContent: true,
  hasFile: false
}

// 2. Validaciones pasadas
Creando post...

// 3. Hook llamado
createPost llamado {
  userId: "abc-123", 
  postData: {content: "Test", imageFile: undefined, tags: []}
}

// 4. Enviando al backend
Enviando POST a backend: http://localhost:4000/api/posts {
  authorId: "abc-123",
  content: "Test",
  mediaUrl: undefined,
  mediaType: undefined,
  tags: []
}

// 5. Respuesta del backend
Respuesta del backend: 201 Created

// 6. Éxito
Post creado exitosamente: {id: "...", content: "Test", ...}
```

## 🐛 Posibles Problemas y Soluciones

### Problema 1: No aparece "handlePublish llamado"

**Causa:** El botón no está conectado o hay un error de JavaScript

**Solución:**
```bash
# Reinicia el servidor
npm run dev
```

### Problema 2: "No hay contenido para publicar"

**Causa:** El campo está vacío

**Solución:**
- Escribe algo en el campo de texto
- O selecciona una imagen

### Problema 3: "Usuario no autenticado"

**Causa:** No has iniciado sesión o el token expiró

**Solución:**
```javascript
// En la consola del navegador:
localStorage.getItem('token')

// Si es null:
// 1. Ve a /login
// 2. Inicia sesión
// 3. Intenta de nuevo
```

### Problema 4: "No hay userId"

**Causa:** El hook useUser no retorna el usuario

**Verifica en la consola del log inicial:**
```
📝 Publications Component - Estado inicial: {user: undefined, ...}
```

**Solución:**
```javascript
// En consola del navegador, verifica el token:
const token = localStorage.getItem('token');
console.log('Token:', token);

// Decodifica el token (si existe):
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Payload:', payload);
}
```

Si no hay ID en el payload:
1. Cierra sesión
2. Inicia sesión de nuevo

### Problema 5: "Failed to fetch" o error de red

**Causa:** El backend no está corriendo

**Solución:**
```bash
# Verifica el backend:
curl http://localhost:4000/api/posts

# Si no responde, verifica Docker:
docker ps | grep riff

# Inicia el backend si es necesario:
cd ../client-gateway
docker-compose up -d
```

### Problema 6: Error 400/404/500 del backend

**Causa:** Problema con el endpoint o el payload

**Verifica:**
```bash
# Ver logs del backend:
docker logs -f riff_client_gateway

# Probar endpoint manualmente:
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "authorId": "test-id",
    "content": "Test post",
    "tags": []
  }'
```

### Problema 7: Error al subir imagen a R2

**Causa:** Credenciales R2 incorrectas o no cargadas

**Verifica en consola:**
```javascript
// Verifica las variables de entorno:
console.log({
  endpoint: process.env.NEXT_PUBLIC_R2_ENDPOINT,
  bucket: process.env.NEXT_PUBLIC_R2_BUCKET,
  publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
});
```

Si alguno es `undefined`:
```bash
# Verifica que .env.local existe:
cat .env.local

# Reinicia el servidor:
npm run dev
```

## 📋 Checklist Rápido

Copia estos comandos uno por uno:

```bash
# 1. Verificar que el backend está corriendo
curl http://localhost:4000/api/posts

# 2. Verificar variables de entorno
cat .env.local | grep R2

# 3. Limpiar caché y reiniciar
rm -rf .next
npm run dev
```

En el navegador:
```javascript
// 4. Verificar token
localStorage.getItem('token')

// 5. Limpiar localStorage si es necesario
localStorage.clear();
location.reload();
```

## 📸 Captura de Pantalla de la Consola

Envíame una captura de pantalla de la consola mostrando:
1. Los logs cuando cargas la página
2. Los logs cuando haces clic en "Publicar"
3. Cualquier error en rojo

Esto me ayudará a identificar exactamente qué está fallando.

## 🆘 Si Nada Funciona

Ejecuta esto y envíame el resultado:

```bash
# Información del sistema
echo "=== Estado del Sistema ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo ""

echo "=== Archivos clave ==="
ls -la .env.local 2>/dev/null || echo ".env.local no existe"
ls -la src/app/utils/r2Storage.ts
ls -la src/app/hooks/usePosts.ts
echo ""

echo "=== Backend ==="
curl -I http://localhost:4000/api/posts 2>&1
echo ""

echo "=== Proceso Next.js ==="
ps aux | grep next | grep -v grep
```

Y en la consola del navegador:

```javascript
// Estado completo
console.log('Estado de depuración:', {
  token: !!localStorage.getItem('token'),
  tokenValue: localStorage.getItem('token')?.substring(0, 20) + '...',
  r2Endpoint: process.env.NEXT_PUBLIC_R2_ENDPOINT,
  r2Bucket: process.env.NEXT_PUBLIC_R2_BUCKET,
  currentUrl: window.location.href,
});
```

