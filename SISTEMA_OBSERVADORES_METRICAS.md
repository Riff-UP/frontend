# Sistema de Observadores para Métricas de Consumo

## Objetivo
Registrar y consultar de forma confiable:
- Vistas de publicación
- Vistas de perfil (usuario/artista)
- Retención

El enfoque recomendado es event-driven: registrar eventos crudos y derivar agregados.

## Qué necesitas (mínimo viable)

### 1) Eventos a capturar
- post_view
- profile_view
- session_start
- session_heartbeat
- session_end

### 2) Campos mínimos por evento
- event_id (UUID)
- event_type
- occurred_at (UTC)
- actor_user_id (nullable)
- target_type (post o profile)
- target_id
- session_id
- request_id (opcional)
- source (web, mobile)
- user_agent_hash
- ip_hash
- metadata JSONB

### 3) Reglas de deduplicación
- Idempotency-Key por evento.
- Ventana anti-spam por sesión/target (ejemplo: no contar 2 vistas del mismo target en menos de 10-30 segundos).
- Filtrar bots básicos por user-agent y patrones de tráfico.

### 4) Persistencia
- Tabla de eventos crudos (append-only).
- Tabla agregada por día para lectura rápida.
- Jobs de agregación incremental (cada 1-5 minutos) o streaming.

## Modelo de datos sugerido

### Tabla analytics_events
- id UUID PK
- event_type TEXT
- occurred_at TIMESTAMPTZ
- actor_user_id UUID NULL
- target_type TEXT
- target_id UUID
- session_id TEXT
- user_agent_hash TEXT
- ip_hash TEXT
- metadata JSONB
- created_at TIMESTAMPTZ

Índices:
- (event_type, occurred_at)
- (target_type, target_id, occurred_at)
- (actor_user_id, occurred_at)
- (session_id, occurred_at)

### Tabla analytics_daily_metrics
- metric_date DATE
- target_type TEXT
- target_id UUID
- views_total BIGINT
- unique_viewers BIGINT
- avg_watch_seconds NUMERIC
- retention_d1 NUMERIC
- retention_d7 NUMERIC
- retention_d30 NUMERIC
- PRIMARY KEY (metric_date, target_type, target_id)

## Cálculo de métricas

### Vistas de publicación
- Total: count de post_view por post_id.
- Únicas: count distinct actor_user_id o session_id si actor_user_id es null.

### Vistas de perfil
- Total: count de profile_view por profile_id.
- Únicas: mismo criterio de identidad.

### Retención
Cohortes por fecha de primera actividad:
- D1 = usuarios de cohorte D que regresan en D+1 / usuarios de cohorte D
- D7 = usuarios de cohorte D que regresan en D+7 / usuarios de cohorte D
- D30 = usuarios de cohorte D que regresan en D+30 / usuarios de cohorte D

## Reparto por microservicio

### Content MS
- Dueño de post_view y métricas de publicaciones.
- Endpoints de lectura de métricas de posts.

### Users MS
- Dueño de profile_view y métricas de perfil.
- Endpoints de lectura de métricas de perfiles.

### Gateway
- Solo enruta a MS dueño del dato.
- Puede normalizar shape de respuesta para frontend.
- No recalcula métricas.

### Notifications MS
- No debe calcular métricas de vistas/retención.
- Solo notificaciones.

## Endpoints sugeridos

### Escritura de eventos
- POST /api/analytics/events
  - body: { eventType, targetType, targetId, sessionId, occurredAt, metadata }
  - header: Idempotency-Key

### Lectura (Content)
- GET /api/posts/:postId/views/total
- GET /api/posts/:postId/views/unique
- GET /api/posts/:postId/retention

### Lectura (Users)
- GET /api/users/:userId/profile/views/total
- GET /api/users/:userId/profile/views/unique
- GET /api/users/:userId/retention

## Frontend (observadores)

### Observador de vista de publicación
- Disparar cuando una tarjeta/publicación entra en viewport con IntersectionObserver.
- Umbral recomendado: 0.5.
- Registrar una sola vez por sesión por target.

### Observador de perfil
- Disparar al montar la página de perfil, con debounce y anti-duplicado por session_id.

### Retención en frontend
- No calcular retención en cliente.
- Solo enviar eventos de sesión (start/heartbeat/end) y consultar resultado agregado.

## Seguridad y cumplimiento
- Hash de IP y User-Agent (no almacenar PII en claro).
- TTL y política de retención de eventos crudos (ejemplo: 90-180 días).
- Control de tasa por IP/session_id.
- Auditoría de jobs de agregación.

## Observabilidad
- Métricas técnicas: latencia de ingesta, tasa de eventos inválidos, duplicados descartados.
- Dashboards: ingestión por minuto, backlog de procesamiento, freshness de agregados.
- Alertas: caída de ingesta, retraso de agregación, error rate alto.

## Plan por fases

### Fase 1 (MVP)
- Capturar post_view y profile_view.
- Guardar eventos crudos.
- Endpoint total views por post y por perfil.

### Fase 2
- unique viewers y sesión.
- tabla daily agregada y job incremental.

### Fase 3
- cohortes de retención D1/D7/D30.
- endpoints de retención por perfil/post.

## Checklist de implementación
- Definir contrato de evento (JSON schema).
- Crear tablas e índices.
- Implementar endpoint de ingesta con idempotencia.
- Implementar agregación incremental.
- Exponer endpoints de lectura por MS dueño.
- Configurar gateway sin recalcular.
- Instrumentar frontend con observers.
- Agregar pruebas de carga y deduplicación.

## Punto de arranque en este repo
- Reusar el patrón de consumo de métricas ya existente en [src/app/components/Analytics.tsx](src/app/components/Analytics.tsx).
- Reusar la normalización de API base en [src/app/config/api.ts](src/app/config/api.ts).
- Integrar observer de perfil en [src/app/components/ArtistProfile.tsx](src/app/components/ArtistProfile.tsx).
- Integrar observer de publicaciones en [src/app/components/Publications.tsx](src/app/components/Publications.tsx).
