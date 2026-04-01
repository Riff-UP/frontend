# Informe - Vista Privada de Hipotesis

## Objetivo

Documentar como funciona la vista privada de validacion de hipotesis en Riff, que fuentes de datos usa, que filtros aplica, como se calculan los indicadores y por que pueden aparecer porcentajes grandes.

## Ruta privada (solo por enlace)

- URL: `/lab/riff-hipotesis-impacto-mx4n`
- No esta enlazada en menus publicos (`Header`, `Sidebar`, `MobileNav`)
- Requiere sesion activa para consultar backend

## Hipotesis evaluada

> Si se implementa una plataforma web especializada para la promocion de musicos locales, entonces la visibilidad e interaccion de su contenido digital aumentaran al menos un 15%.

## Alcance de datos

La vista se ajusto para medir **en general toda la app** (no solo un artista).

### Endpoints consumidos

- Usuarios (para filtrar activos):
  - `GET /users?limit=5000&offset=0`
  - fallback: `GET /users/artists?limit=5000&offset=0`
- Follows globales:
  - `GET /follows`
  - fallback: `GET /follows?page=1&limit=5000`
- Posts globales:
  - `GET /posts`
- Reacciones globales:
  - `GET /posts/reactions`
  - fallback: `GET /posts/:postId/reactions/total`

## Periodo de analisis

Se usa el **mes actual del dia 01 al dia 30**.

- Pre: primera mitad del periodo
- Post: segunda mitad del periodo

Esto permite tener medicion estable dentro del mes actual y evita arrastrar datos de meses anteriores.

## Definicion de metricas

### 1) Visibilidad

Se aproxima con crecimiento de seguidores globales:

- Se cuentan follows nuevos por dia (en el mes actual)
- Se construye serie acumulada diaria de seguidores
- Se compara crecimiento pre vs post

### 2) Interaccion

Se aproxima con reacciones globales:

- Preferente: contar reacciones por su fecha de creacion (`/posts/reactions`)
- Fallback: sumar total de reacciones por post y asignar a fecha de creacion del post
- Se compara interaccion pre vs post

## Limpieza de datos (anti ruido)

Para evitar que datos de prueba o borrados lógicos contaminen el resultado, se excluyen registros con:

- `deletedAt` / `deleted_at`
- `isDeleted` / `is_deleted`
- `deleted`
- `status=false`, `status=0`, `status=inactive|deleted|archived`

Adicionalmente:

- Se filtran follows para contar solo relaciones entre usuarios activos
- Se aplica deduplicacion por `id` o clave compuesta para evitar doble conteo

## Regla de aceptacion de hipotesis

Se calcula porcentaje de cambio:

$$
\text{Cambio(\%)} = \frac{\text{post} - \text{pre}}{\text{pre}} \times 100
$$

La hipotesis se marca como **SE CUMPLE** solo si:

- Cambio de visibilidad >= 15%
- Cambio de interaccion >= 15%

## Por que pueden salir porcentajes muy grandes

Esto pasa cuando el valor `pre` es muy pequeno.

Ejemplo real:

- pre = 6
- post = 74

$$
\frac{74-6}{6}\times100 = 1133.3\%
$$

No necesariamente es error: indica que se multiplico mucho respecto a una base inicial baja.

## Como se resolvio la visualizacion de "porcentajes monstruosos"

Se mantuvo el calculo real para la logica de hipotesis, pero en UI:

- Si el porcentaje es moderado: se muestra `%`
- Si es muy grande: se muestra formato `x veces` (ej. `12.33x`) y abajo el `%` equivalente
- La grafica comparativa usa escala relativa (`x`) con umbral `1.15x` (equivale a 15%)

Esto mejora legibilidad sin perder exactitud.

## Auditoria visible en la vista

La seccion de auditoria muestra:

- Usuarios traidos
- Usuarios activos detectados
- Follows traidos
- Follows usados
- Follows descartados por inactividad
- Posts traidos/usados
- Reacciones traidas/usadas
- Interacciones pre/post
- Fuente de reacciones (directa o fallback)

Con esto se puede explicar exactamente de donde sale cada numero.

## Archivos clave

- Pagina de ruta privada:
  - `src/app/lab/riff-hipotesis-impacto-mx4n/page.tsx`
- Vista principal y calculos:
  - `src/app/components/analytics/HypothesisLinkOnlyView.tsx`

## Notas y limitaciones

- Si el backend pagina resultados y no devuelve todo, puede subestimar o sesgar metricas.
- Si `pre` es 0, el porcentaje no es definible; en UI se maneja como `N/A`.
- El fallback de interacciones por post no replica exactamente la serie temporal de reacciones, pero evita dejar el panel vacio.

## Recomendaciones

1. Exponer endpoint agregado diario en backend (follows/reacciones) para evitar inferencias en frontend.
2. Asegurar paginacion completa o endpoint bulk para analitica global.
3. Mantener un flag de actividad uniforme en todos los recursos (`status` + soft-delete consistente).
4. Conservar auditoria visible para defensa de resultados y trazabilidad.
