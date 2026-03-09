# Diagnóstico de bugs

## Resumen ejecutivo

Se analizaron dos bugs reportados desde este frontend para distinguir **síntoma en UI** vs **causa raíz real**.

1. **Al editar el perfil del usuario siendo artista, el rol vuelve a cambiar**
2. **El evento creado se refleja en todos los usuarios**

### Veredicto corto

- **Bug 1:** su origen estaba en **backend (`users-ms`)** y **ya quedó corregido**.
- **Bug 2:** su origen apunta a **backend / mensajería (`Rabbit` + `users-ms`)**; el frontend lo expone porque confía en que `GET /events` ya viene filtrado.

---

## Bug 1: al editar el perfil del usuario siendo artista, el rol vuelve a cambiar

### Síntoma

Un usuario con rol `ARTIST` edita su perfil y, después del guardado, vuelve a aparecer como `USER`.

### Evidencia en frontend

En este repo el frontend **no envía `role`** al actualizar el perfil:

- En `src/app/components/ProfileEdit.tsx`, `handleSave()` llama a `updateUser()` solo con:
  - `name`
  - `biography`
- En `src/app/hooks/useUser.ts`, `updateUser()` hace `PATCH /users/me` con el payload recibido.
- Después, el estado local se actualiza con la respuesta del backend y la UI sigue mostrando el `role` que devuelve `/users/me`.

### Causa raíz confirmada

La causa real estaba en **`users-ms`**, no en este frontend.

#### Qué pasaba

`UpdateUserDto` extendía `PartialType(CreateUserDto)`.

Como en `CreateUserDto` el campo `role` tenía default `USER`, al instanciar el DTO para un `PATCH`:

- aunque el frontend **no enviara** `role`,
- `class-transformer` / la instanciación del DTO terminaban dejando `role = 'USER'`,
- y luego el servicio persistía ese valor al hacer el update.

En la práctica, un update parcial de perfil terminaba pisando el rol real del usuario.

### Fix aplicado

Se aplicaron **dos correcciones** en backend:

#### 1. `create-user.dto.ts`

Se eliminó el default del campo `role`.

Ahora quedó como:

- `role?: UserRole`
- **sin valor por defecto en el DTO**

El default de `USER` para altas nuevas lo maneja Prisma en el schema con `@default(USER)`, que es el lugar correcto.

#### 2. `users.service.ts` → `update()`

Se excluyó explícitamente `role` del payload de actualización:

- `const { id: _, role: _role, ...data } = updateUserDto;`

Eso deja una segunda línea de defensa:

- si `role` llega por error en el payload,
- **no se escribe en base de datos**.

### Conclusión del bug 1

- **El bug no nacía en el frontend.**
- La causa raíz estaba en el DTO + lógica de update de `users-ms`.
- **Estado actual:** corregido.
- A partir de ahora, el único camino válido para cambiar el rol debe ser `promoteToArtist()`.

---

## Bug 2: el evento creado se refleja en todos los usuarios

### Síntoma

Un evento creado por un usuario/artista termina apareciendo en vistas de otros usuarios.

### Evidencia en frontend

En este frontend hay dos comportamientos importantes:

#### 1. La vista privada de eventos confía en backend

En `src/app/hooks/useEvents.ts`:

- la carga de eventos se hace con `GET /events`
- no se envía un filtro explícito por usuario
- el código asume que backend resuelve el usuario desde el JWT y responde filtrado

En `src/app/components/Events.tsx`:

- `backendEvents` se renderiza directamente
- incluso hay un comentario indicando que **ya no se filtra localmente** porque “el backend ya lo filtró”

#### 2. Otras vistas sí aplican filtrado defensivo

En `src/app/hooks/useArtistEvents.ts` y `src/app/hooks/usePublicArtistData.ts` sí existe filtrado local usando campos como:

- `sql_user_id`
- `organizerId`

Eso refuerza la idea de que el ecosistema ya convive con respuestas heterogéneas y asociaciones de IDs no totalmente consistentes.

### Causa raíz reportada

La causa que reportaste es consistente con toda la evidencia:

> el listener de Rabbit envía el evento a todos los usuarios de `users-ms`

Si el evento se publica o replica hacia **todos** los usuarios en `users-ms`, entonces el problema nace antes de que el frontend lo pinte.

### Interpretación técnica

El patrón probable es este:

1. Se crea un evento
2. Un listener / consumer de Rabbit procesa el evento de dominio
3. La propagación hacia `users-ms` queda mal asociada o demasiado amplia
4. `users-ms` o el servicio que expone `/events` termina devolviendo eventos de más
5. Este frontend los muestra tal cual porque la pantalla privada de eventos confía en que backend ya filtró correctamente

### Alcance real del bug 2

#### Causa principal

**Backend / integración entre servicios**

Puntos a revisar en backend:

- listener / consumer Rabbit que maneja “evento creado”
- lógica de asociación del owner del evento
- persistencia de `sql_user_id`, `organizerId` o identificador equivalente
- implementación exacta de `GET /events`
- si el filtrado es por JWT, por query, por owner persistido o por relación replicada en `users-ms`

#### Síntoma visible en frontend

Aunque no sea la causa raíz, el frontend hoy tiene una debilidad de defensa:

- si backend devuelve eventos globales o mal asociados,
- la vista privada de `src/app/components/Events.tsx` los muestra sin filtro adicional.

### Conclusión del bug 2

- **Origen más probable:** backend / Rabbit / `users-ms`.
- **Contribución del frontend:** no genera el bug, pero sí lo hace visible porque confía plenamente en `/events`.
- **Estado actual:** pendiente de corrección en backend.

---

## Diagnóstico final por bug

### Bug 1 — Rol cambia al editar perfil

- **Origen:** backend (`users-ms`)
- **Causa raíz confirmada:** default indebido de `role` en DTO de update por herencia desde `CreateUserDto`
- **Fix aplicado:** remover default en DTO + excluir `role` del update service
- **Estado:** **resuelto**

### Bug 2 — Evento aparece en todos los usuarios

- **Origen:** backend / mensajería / asociación incorrecta en `users-ms`
- **Causa raíz probable:** listener Rabbit replica o asocia el evento a todos los usuarios
- **Comportamiento del frontend:** consume `GET /events` sin filtro local en la vista privada
- **Estado:** **pendiente**

---

## Archivos del frontend usados como evidencia

- `src/app/components/ProfileEdit.tsx`
- `src/app/hooks/useUser.ts`
- `src/app/hooks/useEvents.ts`
- `src/app/components/Events.tsx`
- `src/app/hooks/useArtistEvents.ts`
- `src/app/hooks/usePublicArtistData.ts`
- `src/app/config/api.ts`

---

## Nota de alcance

Este workspace contiene el **frontend**, así que:

- el **bug 1** quedó documentado con causa raíz confirmada porque ya compartiste el fix exacto aplicado en backend;
- el **bug 2** queda documentado con alta confianza como problema de backend/integración, pero la validación final del listener Rabbit debe hacerse en `users-ms` o en el servicio consumidor real.

---

## Siguiente paso recomendado

Mientras se corrige el bug 2 en backend, una mitigación de bajo riesgo en frontend sería agregar un filtro defensivo en la vista privada de eventos para mostrar solo los eventos del usuario autenticado cuando exista un identificador confiable.

Eso **no corrige la causa raíz**, pero evita que el fallo quede expuesto en la UI mientras se arregla la propagación correcta del evento entre servicios.
