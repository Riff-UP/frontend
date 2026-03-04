# 🔄 Solución Alternativa - Publicar Sin Imagen (Temporal)

## Problema

El endpoint `POST /api/upload/image` no está implementado en el backend, entonces no podemos subir imágenes aún.

## Solución Temporal

**Puedes crear publicaciones solo con texto** mientras se implementa el endpoint de subida de imágenes en el backend.

## Cómo Usar

1. **Ve a Publicaciones**
2. **Solo escribe texto** (NO selecciones imagen)
3. **Haz clic en Publicar**

Esto creará la publicación sin imagen usando directamente el endpoint:
```
POST /api/posts
{
  "authorId": "user-id",
  "content": "Tu texto aquí",
  "tags": []
}
```

## Para Habilitar Imágenes

El backend necesita implementar:

```
POST /api/upload/image
```

Ver archivo `SOLUCION_UPLOAD_BACKEND.md` para la implementación completa.

## Opción 2: Usar URLs de Imágenes Existentes

Si quieres probar con imágenes mientras tanto, puedes:

1. Subir la imagen manualmente a R2 o usar una URL pública
2. Modificar temporalmente el código para usar esa URL

### Modificación Temporal:

En `Publications.tsx`, cambia `handlePublish` para usar una URL fija:

```typescript
const handlePublish = async () => {
  console.log('handlePublish llamado', { 
    newPost, 
    selectedFile, 
    user: user?.id,
  });

  if (!newPost.trim() && !selectedFile) {
    console.log('No hay contenido para publicar');
    setErrorMessage('Debes escribir algo o agregar una imagen');
    return;
  }

  if (!user) {
    console.log('Usuario no autenticado');
    setErrorMessage('Debes iniciar sesión para publicar');
    return;
  }

  console.log('Creando post...');
  
  try {
    // TEMPORAL: Usar URL de imagen fija si hay archivo
    let mediaUrl: string | undefined;
    if (selectedFile) {
      // Reemplaza con una URL de imagen real
      mediaUrl = 'https://pub-5a853459931144dca4331ca77afeee53.r2.dev/test-image.jpg';
      console.log('⚠️ Usando URL temporal de imagen:', mediaUrl);
    }

    const result = await createPost({
      content: newPost,
      // NO enviar imageFile, enviamos la URL directamente
      imageFile: undefined,
      tags: [],
      mediaUrl, // Agregar mediaUrl directamente
    });

    console.log('Resultado del post:', result);

    if (result) {
      setNewPost('');
      setSelectedImage(null);
      setSelectedFile(null);
      console.log('Post creado exitosamente');
    }
  } catch (error) {
    console.error('Error en handlePublish:', error);
    setErrorMessage('Error al crear la publicación');
  }
};
```

**NOTA:** Esto es solo temporal para probar. La solución correcta es implementar el endpoint en el backend.

