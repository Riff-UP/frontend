# Explicacion de Hipotesis y Evidencia

## Hipotesis
La hipotesis evaluada es la siguiente:

Si la visibilidad y la interaccion de la plataforma aumentan al menos un 15%, entonces la estrategia evaluada se considera efectiva.

## Problema a resolver
Se necesitaba comprobar la hipotesis con datos reales del backend, evitando resultados inflados o sesgados por:

- registros soft-delete,
- cuentas inactivas,
- duplicados,
- o mediciones limitadas a una sola cuenta.

Por eso el analisis se preparo para trabajar en modo global de plataforma y con auditoria de datos.

## Metodologia de medicion
1. Alcance del analisis: global (con opcion de contraste por cuenta).
2. Ventana temporal: desde el inicio del mes anterior hasta el dia 15 del mes actual.
3. Fuente principal: endpoint diario de hipotesis.
4. Validacion de respaldo: fallback cuando alguna fuente no devuelve datos.
5. Segmentacion del periodo: mitad pre y mitad post para comparar comportamiento.
6. Regla de decision final:
   - Visibilidad >= 15%
   - Interaccion >= 15%
   - Ambas condiciones deben cumplirse al mismo tiempo.

## Explicacion de las graficas
### 1) Tendencia diaria global (seguidores e interaccion)
Esta grafica muestra tres series:

- Seguidores acumulados (azul): aproximacion de visibilidad acumulada.
- Usuarios acumulados (amarillo): contexto de crecimiento de base.
- Interacciones por dia (verde): actividad diaria no acumulada.

Interpretacion esperada:

- Si la curva azul acelera en el tramo post, hay evidencia de mejora en visibilidad.
- Si la curva verde sube de forma sostenida en el tramo post, hay evidencia de mejora en interaccion.
- La curva amarilla ayuda a entender si el crecimiento de visibilidad ocurre en paralelo a crecimiento de usuarios.

### 2) Comparativa Pre vs Post
Compara valores absolutos entre la primera mitad (pre) y la segunda mitad (post) en:

- usuarios,
- visibilidad,
- interaccion.

Interpretacion esperada:

- Post mayor que pre indica mejora bruta en la metrica.
- Diferencias pequenas o negativas indican que la mejora no es consistente.

### 3) Crecimiento relativo (x) vs Umbral
Representa crecimiento como multiplicador (x), en lugar de solo porcentaje, para facilitar lectura en reportes.

- Umbral equivalente al 15%: 1.15x.
- Valores por encima de 1.15x cumplen criterio de hipotesis en esa metrica.

## Datos muestreados observados en la muestra
Con base en la evidencia visual compartida:

- Seguidores acumulados suben aproximadamente de 0 a 93, con salto fuerte entre 24/03 y 26/03.
- Usuarios acumulados suben aproximadamente de 0 a 39, con crecimiento sostenido y luego meseta.
- Interacciones por dia presentan picos puntuales (aprox. 10 a 15) y posteriormente valores bajos/cercanos a 0 en varios dias.

Lectura de la muestra:

- La visibilidad muestra una mejora clara y marcada.
- La interaccion parece mas volatil y dependiente de picos, no de una tendencia estable.

## Calidad y limpieza de datos
Para mantener validez del analisis, se aplica:

- exclusion de registros soft-delete,
- exclusion de cuentas inactivas,
- deduplicacion de entidades,
- trazabilidad de conteos (traidos, usados y descartados),
- separacion de fuentes directas y fallback.

## Conclusiones (resumen corto)
1. La evidencia actual respalda una mejora fuerte en visibilidad.
2. La interaccion no se ve tan estable como la visibilidad; muestra picos pero no continuidad clara en toda la ventana.
3. La hipotesis completa (visibilidad e interaccion >= 15%) debe confirmarse con el resultado consolidado pre vs post de interaccion para evitar sobreinterpretar picos aislados.
4. Se recomienda mantener exportaciones periodicas para verificar estabilidad del comportamiento y no solo crecimiento puntual.

## Conclusion breve
Con la evidencia disponible, hay soporte claro para mejora en visibilidad. La confirmacion total de la hipotesis depende de que la interaccion tambien sostenga crecimiento por encima del umbral del 15% en el tramo post frente al pre.
