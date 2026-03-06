# Endpoints Faltantes para Home y Perfiles Públicos

> **Fecha:** 2026-03-05  
> **Estado:** ⚠️ Pendientes de implementar en el backend  

---

## Resumen

Para que el Home y los perfiles públicos funcionen con datos precisos (sin hacer fetch de todo y filtrar en el frontend), se necesitan los siguientes endpoints en el `client-gateway`.

---

## 1. `GET /api/posts?userId=<userId>` — Posts de un artista específico

**Propósito:** Obtener solo los posts de un artista en particular, para mostrar en su perfil público.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `userId` | `string (UUID)` | ID del artista (sql_user_id) |

**Uso actual (workaround):**  
El frontend hace `GET /api/posts` y filtra por `sql_user_id` en cliente. Ineficiente con muchos posts.

**Implementación sugerida en el controller:**
```typescript
@Get()
findAll(@Query('userId') userId?: string) {
  if (userId) {
    return this.postsService
      .send('findPostsByUser', { userId })
      .pipe(catchError(handleRpcCustomError));
  }
  return this.postsService
    .send('findAllPosts', {})
    .pipe(catchError(handleRpcCustomError));
}
```

**Pattern en content-ms:**
```typescript
@MessagePattern('findPostsByUser')
async findByUser(@Payload() data: { userId: string }) {
  return this.postModel
    .find({ sql_user_id: data.userId })
    .sort({ createdAt: -1 })
    .exec();
}
```

**Ejemplo de llamada:**
```bash
GET http://localhost:4000/api/posts?userId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

---

## 2. `GET /api/events?organizerId=<organizerId>` — Eventos de un artista específico

**Propósito:** Obtener solo los eventos organizados por un artista, para mostrar en su perfil público.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `organizerId` | `string (UUID)` | ID del organizador (sql_user_id) |

**Uso actual (workaround):**  
El frontend hace `GET /api/events` y filtra por `sql_user_id` o `organizerId` en cliente.

**Implementación sugerida en el controller:**
```typescript
@Get()
findAll(@Query('organizerId') organizerId?: string) {
  if (organizerId) {
    return this.eventsService
      .send('findEventsByOrganizer', { organizerId })
      .pipe(catchError(handleRpcCustomError));
  }
  return this.eventsService
    .send('findAllEvents', {})
    .pipe(catchError(handleRpcCustomError));
}
```

**Pattern en content-ms:**
```typescript
@MessagePattern('findEventsByOrganizer')
async findByOrganizer(@Payload() data: { organizerId: string }) {
  return this.eventModel
    .find({ sql_user_id: data.organizerId })
    .sort({ startDate: 1 })
    .exec();
}
```

**Ejemplo de llamada:**
```bash
GET http://localhost:4000/api/events?organizerId=550e8400-e29b-41d4-a716-446655440000
```

---

## 3. `GET /api/follows?followingId=<userId>` — Contar seguidores de un artista

**Propósito:** Obtener el número real de seguidores de un artista para mostrar en su perfil.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `followingId` | `string (UUID)` | ID del artista que se está siguiendo |
| `followerId` | `string (UUID)` | ID del usuario que sigue (para verificar si ya sigue) |

**Uso actual (workaround):**  
El frontend hace `GET /api/follows` (todos) y filtra en cliente por `followingId`.

**Implementación sugerida en el controller:**
```typescript
@Get()
findAll(
  @Query('followingId') followingId?: string,
  @Query('followerId') followerId?: string,
) {
  if (followingId) {
    return this.followsService
      .send('findFollowersByUser', { followingId })
      .pipe(catchError(handleRpcCustomError));
  }
  if (followerId) {
    return this.followsService
      .send('findFollowingByUser', { followerId })
      .pipe(catchError(handleRpcCustomError));
  }
  return this.followsService
    .send('findAllFollows', {})
    .pipe(catchError(handleRpcCustomError));
}
```

**Respuesta esperada:**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "followerId": "550e8400-e29b-41d4-a716-446655440000",
    "followingId": "660e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2026-03-03T10:05:00.000Z"
  }
]
```

**Ejemplo de llamadas:**
```bash
# Seguidores de un artista
GET http://localhost:4000/api/follows?followingId=660e8400-e29b-41d4-a716-446655440001

# ¿El usuario X ya sigue al artista Y?
GET http://localhost:4000/api/follows?followerId=550e8400-e29b-41d4-a716-446655440000
```

---

## 4. `GET /api/posts/reactions?userId=<userId>` — YA IMPLEMENTADO ✅

Este endpoint ya fue implementado (ver `FIX-POST-REACTIONS-QUERY-PARAM.md`).

```bash
GET http://localhost:4000/api/posts/reactions?userId=<userId>
Authorization: Bearer <token>
```

---

## 5. `GET /api/posts/reactions/post/:postId` — YA IMPLEMENTADO ✅

```bash
GET http://localhost:4000/api/posts/reactions/post/<postId>
Authorization: Bearer <token>
```

---

## Impacto en el Frontend

Cuando se implementen los endpoints anteriores, actualizar:

### `usePublicArtistData.ts`
```typescript
// fetchPosts — cambiar a:
const res = await fetch(`${API_URL}/posts?userId=${artistId}`, ...);

// fetchEvents — cambiar a:
const res = await fetch(`${API_URL}/events?organizerId=${artistId}`, ...);

// fetchFollowersCount — cambiar a:
const res = await fetch(`${API_URL}/follows?followingId=${artistId}`, ...);
```

### `useFollow.ts`
```typescript
// fetchMyFollows — cambiar a:
const res = await fetch(`${API_URL}/follows?followerId=${currentUserId}`, ...);
// Y ya no necesitas filtrar en cliente
```

---

## Prioridad

| Endpoint | Prioridad | Impacto |
|----------|-----------|---------|
| `GET /posts?userId=` | 🔴 Alta | Perfil público carga todos los posts |
| `GET /events?organizerId=` | 🔴 Alta | Perfil público carga todos los eventos |
| `GET /follows?followingId=` | 🟡 Media | Conteo de seguidores incorrecto |
| `GET /follows?followerId=` | 🟡 Media | `fetchMyFollows` ineficiente |

---

**Nota:** Mientras no se implementen, el frontend tiene workarounds funcionales que filtran en cliente. Solo es una mejora de rendimiento.

