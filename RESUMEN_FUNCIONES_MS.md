# Resumen de Funciones por Microservicio

## Objetivo
Definir en qué microservicio debe implementarse cada función agregativa y cómo exponerla para consumo desde frontend/gateway, evitando mezclar responsabilidades entre dominios.

## Distribución por Microservicio

### Users MS
Función:
- Cálculo de total de seguidores por usuario

Tablas involucradas:
- users
- user_follows

Responsabilidad:
- Este cálculo pertenece al dominio de relaciones entre usuarios.
- Debe vivir en Users porque Users es dueño de la relación follow.

### Content MS
Funciones:
- Promedio de calificación por evento
- Total de asistentes por evento
- Total de reacciones por publicación

Tablas involucradas:
- events
- event_reviews
- event_attendance
- posts
- post_reactions

Responsabilidad:
- Estas métricas pertenecen al dominio de contenido y engagement.
- Deben vivir en Content porque Content es dueño de eventos, publicaciones y sus interacciones.

### Notifications MS
Funciones de este alcance:
- Ninguna de las 4 funciones agregativas

Responsabilidad real:
- Orquestar envío de notificaciones.
- Consumir eventos de negocio ya resueltos por Users/Content.
- No ejecutar agregaciones de analítica de negocio como fuente de verdad.

## Regla de Arquitectura
La función siempre va en el microservicio dueño de las tablas consultadas.

## Contratos API sugeridos

### Users MS
- GET /users/:userId/followers/total
  - Respuesta: { userId, totalFollowers }

### Content MS
- GET /events/:eventId/attendance/total
  - Respuesta: { eventId, totalAttendees }
- GET /events/:eventId/rating/average
  - Respuesta: { eventId, averageRating, totalRatings }
- GET /posts/:postId/reactions/total
  - Respuesta: { postId, totalReactions }

## Flujo de Integración
1. Crear función SQL en el MS dueño de cada tabla.
2. Exponer endpoint en ese mismo MS.
3. Gateway enruta y normaliza respuesta si aplica.
4. Frontend consume totales ya agregados.
5. Notifications escucha eventos de dominio, sin recalcular métricas.

## Plan de Trabajo Recomendado
1. Users MS
   - Implementar función SQL de seguidores por usuario.
   - Publicar endpoint de total followers.
2. Content MS
   - Implementar funciones SQL de attendance, rating promedio y reacciones.
   - Publicar endpoints de totales/promedios.
3. Gateway
   - Verificar rutas y contratos unificados.
4. Frontend
   - Sustituir conteos en cliente por endpoints agregados.
5. QA
   - Validar resultados con datos de prueba y casos borde.

## Criterios de Aceptación
- Cada función está en el MS correcto por dominio.
- Ninguna métrica agregativa se calcula en Notifications.
- Frontend no depende de recorrer listas completas para obtener totales.
- Los valores de dashboard/perfiles coinciden con resultados de base de datos.

## Nota de Diseño
Si una vista requiere combinar métricas de Users y Content, la composición se hace en Gateway/BFF o en un endpoint de lectura compuesto, pero la lógica base de cada métrica se mantiene en su MS dueño.

## Actualización Confirmada: Gateway para Users MS

Contrato publicado por gateway para seguidores:
- Nuevo endpoint HTTP: GET /api/users/:userId/followers/total
- Validación de userId con UUID en controller (ParseUUIDPipe)
- Llamada RPC al Users MS:
   - patrón: findFollowersTotalByUser
   - payload: { userId }
- Respuesta fija al frontend:
   - { userId, totalFollowers }

Mapeo de errores en gateway:
- not found de MS -> 404
- bad request -> 400
- timeout (RxJS timeout) -> 504

## Archivos Modificados (Referencia de Trabajo)

Nota: esta lista es guía para coordinar equipos. Los paths exactos pueden variar por estructura del repo de gateway/users-ms.

### Gateway
- users controller:
   - agregar ruta GET /api/users/:userId/followers/total
   - aplicar ParseUUIDPipe en :userId
- users service/proxy client:
   - enviar RPC findFollowersTotalByUser con payload { userId }
   - aplicar timeout RxJS y mapear a 504
- exception filter o capa de mapeo de errores:
   - traducir not found del MS a 404
   - traducir bad request a 400

### Users MS
- users message/controller handler:
   - implementar patrón findFollowersTotalByUser
- users domain/service:
   - ejecutar función SQL de total de seguidores por userId
   - responder con shape { userId, totalFollowers }

### Frontend
- consumo recomendado:
   - usar el endpoint del gateway para evitar conteo en cliente
   - mantener fallback temporal solo durante migración
