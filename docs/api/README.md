# API REST `/v1`

Base local: `http://localhost:3000/v1` · OpenAPI: `http://localhost:3000/docs`

## 1. Autenticación

### Login

```http
POST /v1/auth/login
Content-Type: application/json

{ "correo": "admin@banana.local", "password": "Admin123!" }
```

Respuesta:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": 1,
    "nombre": "Administrador Banana",
    "correo": "admin@banana.local",
    "rol": "ADMIN",
    "activo": true,
    "creadoEn": "2026-10-30T15:33:46.907Z"
  }
}
```

- Web: el refresh token también se entrega en una cookie `banana_refresh`
  `HttpOnly`, `SameSite=Lax`, path `/v1/auth`. El access token se mantiene en
  memoria y se renueva con `POST /v1/auth/refresh` (cookie).
- Móvil: guarda ambos tokens en almacenamiento seguro y envía el refresh en el
  cuerpo de `/auth/refresh`.
- Access token: 15 min por defecto. Refresh: 7 días, **rotado** en cada uso.
- Reutilizar un refresh revocado revoca toda la familia de tokens del usuario.

### Refresh

```http
POST /v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }   // opcional en web (usa cookie)
```

### Logout

```http
POST /v1/auth/logout
```

Revoca el refresh y limpia la cookie. Responde `204`.

### Uso

```http
Authorization: Bearer <accessToken>
```

## 2. Formato de errores

```json
{
  "statusCode": 403,
  "message": "Solo el técnico asignado o un administrador puede resolverlo.",
  "path": "/v1/reports/42/solution",
  "timestamp": "2026-10-30T21:35:06.067Z"
}
```

Códigos usados: `400` validación, `401` sesión, `403` permisos, `404` inexistente,
`409` conflicto de estado/unicidad, `413` archivo grande, `429` rate limit,
`500` error interno (sin detalles sensibles).

## 3. RBAC

| Recurso | ADMIN | TECNICO | USUARIO |
|---|---|---|---|
| Ver reportes | Todos | Solo asignados | Solo propios |
| Crear reporte | Sí | No | Sí |
| Asignar técnico | Sí | No | No |
| Cambiar a en_proceso | Sí | Solo asignado | No |
| Registrar solución | Sí | Solo asignado | No |
| Subir imagen | Sí | No | Solo propio |
| Ver analytics | Sí | No | No |
| Gestionar usuarios | Sí | No | No |

La UI oculta acciones, pero **el servidor siempre valida** rol, propiedad y estado.

## 4. Reportes

### Listar

```http
GET /v1/reports?page=1&limit=20&categoryId=3&status=en_proceso
    &priority=alta&from=2026-01-01&to=2026-12-31&search=fuga
```

- `page` ≥ 1, `limit` 1–50 (default 20).
- `search` busca en folio, descripción y ubicación (subcadena).
- `from`/`to` aceptan `YYYY-MM-DD` o ISO 8601; `to` con fecha incluye todo el día.
- `assignment=unassigned` (solo admin) filtra sin técnico.
- El alcance por rol se aplica **antes** de paginar.

Respuesta:

```json
{
  "data": [
    {
      "id": 10001,
      "folio": "REP-2026-00001",
      "usuarioId": 11,
      "categoriaId": 1,
      "tecnicoId": 3,
      "descripcion": "…",
      "ubicacion": "Edificio A",
      "prioridad": "alta",
      "estado": "en_proceso",
      "creadoEn": "2026-10-30T21:35:06.067Z",
      "asignadoEn": "2026-10-30T21:35:10.000Z",
      "categoria": { "id": 1, "nombre": "Eléctrico" },
      "usuario": { "id": 11, "nombre": "Ana", "correo": "usuario1@banana.local" },
      "tecnico": { "id": 3, "nombre": "Luis" },
      "solucion": null,
      "adjuntos": []
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1200, "totalPages": 60 }
}
```

### Crear

```http
POST /v1/reports
Authorization: Bearer …
Content-Type: application/json

{
  "categoriaId": 2,
  "descripcion": "Fuga de agua en el lavabo del baño del edificio C.",
  "ubicacion": "Edificio C - baños",
  "prioridad": "alta"
}
```

El folio se genera con un contador transaccional; el cliente no puede enviarlo.
Si se omite `prioridad`, se aplica la sugerencia del dominio (media por defecto,
alta ante señales críticas).

### Detalle

```http
GET /v1/reports/:id
```

Autorizado para dueño, técnico asignado o admin. Devuelve 404/403 sin filtrar
existencia cuando no hay acceso.

### Asignación

```http
PATCH /v1/reports/:id/assignment
Authorization: Bearer <admin>

{ "tecnicoId": 5 }
```

Si el cuerpo va vacío (`{}`), se elige el técnico activo con menos reportes
abiertos (desempate por `id`). El reporte pendiente pasa a `en_proceso` y se
registra `asignado_en`. No se reasigna un reporte completado.

### Estado

```http
PATCH /v1/reports/:id/status

{ "estado": "en_proceso" }
```

Solo permite `pendiente → en_proceso`. Enviar `completado` devuelve `403`; para
completar se usa el endpoint de solución.

### Solución

```http
POST /v1/reports/:id/solution
Authorization: Bearer <técnico asignado | admin>

{
  "descripcion": "Se reemplazó el empaque del lavabo y se probó el flujo.",
  "observaciones": "Sin fugas al cierre."
}
```

En una transacción: valida estado/técnico, inserta `soluciones` y actualiza el
reporte a `completado`. `UNIQUE(reporte_id)` evita duplicados.

### Adjuntos

```http
POST /v1/reports/:id/attachments
Content-Type: multipart/form-data

file=<JPEG|PNG|WebP ≤ 5 MB>
```

```http
GET /v1/reports/:id/attachments/:attachmentId
Authorization: Bearer …
```

La imagen se valida por magic bytes, se guarda con nombre UUID en storage privado
y se descarga con autorización. El MVP admite una imagen por reporte.

## 5. Analytics (ADMIN)

| Ruta | Cálculo |
|---|---|
| `GET /analytics/summary` | Totales por estado, semana actual/anterior, variación y días promedio |
| `GET /analytics/weekly-reports` | 12 semanas (lunes UTC) con conteos; rellena ceros |
| `GET /analytics/resolution-by-category` | `AVG(resuelto_en - creado_en)` por categoría |
| `GET /analytics/top-locations?limit=10` | `GROUP BY ubicacion ORDER BY COUNT(*) DESC` |

Todas las cifras se calculan con SQL/Prisma; la interfaz no contiene números
codificados.

## 6. Catálogos y usuarios

- `GET /v1/categories` — cualquier autenticado.
- `POST /v1/categories` — admin.
- `GET /v1/users/technicians` — admin/técnico; incluye `reportesAbiertos`.
- `GET /v1/users` — admin.
- `PATCH /v1/users/:id/active` — admin, cuerpo `{ "activo": false }`.

## 7. Salud

```http
GET /v1/health
```

```json
{
  "status": "ok",
  "database": "up",
  "latencyMs": 3,
  "uptimeSeconds": 120,
  "timestamp": "2026-10-30T22:00:00.000Z"
}
```

## 8. Seguridad operativa

- Rate limit global (100/min) y login 10/min por IP.
- CORS restringido a `PUBLIC_APP_ORIGIN` con credenciales.
- Helmet, validación con `whitelist` y `forbidNonWhitelisted`.
- Swagger muestra el esquema, no contraseñas ni secretos.
- Los logs de error no imprimen cuerpos con credenciales.
