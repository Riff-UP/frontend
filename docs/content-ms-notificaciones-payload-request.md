# Solicitud para Content-MS: payload de notificaciones con deep link

## Objetivo
Necesitamos que Content-MS emita en sus eventos un campo de navegación directa a la publicación/evento para que Notification-MS lo persista y el frontend pueda renderizar un botón de acción (por ejemplo: "Ver publicación").

## Resumen funcional
1. Content-MS publica identificadores y ruta de destino (deep link).
2. Notification-MS guarda esos campos en la notificación.
3. Frontend renderiza botón de acción cuando exista la ruta.

## Propuesta de contrato (v1)
Para notificaciones relacionadas con publicaciones y eventos, incluir:

- type: string (ej. new_post, event_created, event_updated, event_deleted)
- message: string
- userId: string (usuario destino)
- actorId: string (quien originó la acción)
- actorName: string (nombre visible del artista/usuario origen)
- entityType: string (post | event)
- entityId: string (id de la publicación/evento)
- deepLink: string (ruta relativa en frontend)
- createdAt: string (ISO 8601)
- metadata: object opcional

## Reglas de deepLink
- Debe ser ruta relativa (no URL absoluta), por ejemplo:
  - /posts/abc123
  - /events/evt789
  - /artist/f043b7ed-e107-49ea-9f91-91868dd85abe
- No incluir dominio para permitir multi-entorno (local/dev/prod).

## Ejemplos de payload

### 1) Nueva publicación
```json
{
  "type": "new_post",
  "message": "Camacho Juan Manuel publicó nuevo contenido",
  "userId": "target-user-id",
  "actorId": "f043b7ed-e107-49ea-9f91-91868dd85abe",
  "actorName": "Camacho Juan Manuel",
  "entityType": "post",
  "entityId": "abc123",
  "deepLink": "/posts/abc123",
  "createdAt": "2026-03-19T05:40:00.000Z",
  "metadata": {
    "postTitle": "Nuevo sencillo",
    "mediaType": "image"
  }
}
```

### 2) Evento creado
```json
{
  "type": "event_created",
  "message": "Camacho Juan Manuel creó un evento",
  "userId": "target-user-id",
  "actorId": "f043b7ed-e107-49ea-9f91-91868dd85abe",
  "actorName": "Camacho Juan Manuel",
  "entityType": "event",
  "entityId": "evt789",
  "deepLink": "/events/evt789",
  "createdAt": "2026-03-19T05:42:00.000Z"
}
```

### 3) Evento actualizado
```json
{
  "type": "event_updated",
  "message": "Se actualizó un evento de Camacho Juan Manuel",
  "userId": "target-user-id",
  "actorId": "f043b7ed-e107-49ea-9f91-91868dd85abe",
  "actorName": "Camacho Juan Manuel",
  "entityType": "event",
  "entityId": "evt789",
  "deepLink": "/events/evt789",
  "createdAt": "2026-03-19T05:44:00.000Z"
}
```

### 4) Evento eliminado
```json
{
  "type": "event_deleted",
  "message": "Se eliminó un evento de Camacho Juan Manuel",
  "userId": "target-user-id",
  "actorId": "f043b7ed-e107-49ea-9f91-91868dd85abe",
  "actorName": "Camacho Juan Manuel",
  "entityType": "event",
  "entityId": "evt789",
  "deepLink": "/artist/f043b7ed-e107-49ea-9f91-91868dd85abe",
  "createdAt": "2026-03-19T05:46:00.000Z",
  "metadata": {
    "fallback": "entity_deleted"
  }
}
```

## Compatibilidad y rollout
- Si deepLink no existe, frontend mantiene comportamiento actual (solo texto).
- Se recomienda activar primero en createPost/createEvent y luego expandir a update/remove.

## Criterios de aceptación
- Content-MS emite deepLink y entityId en eventos de post/event.
- Notification-MS persiste deepLink sin transformarlo.
- Frontend recibe deepLink y muestra CTA cuando está presente.
- En producción, una notificación de new_post navega correctamente a la vista de detalle.

## Texto corto para enviar por chat al equipo
Necesitamos que Content-MS agregue entityId y deepLink (ruta relativa) en los eventos de notificaciones de post/event. Notification-MS lo guardará tal cual y frontend renderizará botón de acción (Ver publicación / Ver evento) cuando deepLink exista. Propuesta mínima: type, message, userId, actorId, actorName, entityType, entityId, deepLink, createdAt.
