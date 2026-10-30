# Banana Escolar — Guía de implementación y arquitectura monorepo

**Versión:** 1.0  
**Fecha:** 30 de octubre de 2026  
**Tipo:** Sistema de gestión y análisis de incidencias escolares  
**Estado:** Propuesta técnica para implementar (no representa software ya construido)

## 1. Objetivo

Construir un sistema escolar en el que docentes/usuarios registren desperfectos, técnicos atiendan incidencias y administradores consulten historial, indicadores y rendimiento. El mismo proyecto cubrirá las tres entregas: (1) mapa de datos y arquitectura, (2) ETL y base de datos de prueba, (3) dashboard y benchmarking.

### Alcance funcional mínimo

- Autenticación y autorización por roles: `ADMIN`, `TECNICO`, `USUARIO`.
- Registro de reportes con folio, categoría, descripción, ubicación, fotografía opcional, prioridad y estado.
- Asignación automática/manual de técnico, seguimiento y registro de una solución por reporte completado.
- Consulta de **mis reportes**, bandeja de técnicos e **historial general** (administrador).
- Búsqueda, filtros combinados (categoría, prioridad, estado y rango de fechas) y paginación ejecutada en servidor.
- Importación ETL reproducible desde CSV; registros válidos, descartados y reporte de ejecución.
- Dashboard con reportes semanales, tiempo promedio de resolución por categoría y ubicaciones con más incidencias.
- Benchmark de consultas con 10,000 y 1,000,000 de reportes para evaluar índices y escalabilidad.
- Aplicación móvil Flutter consumiendo **la misma API REST**, no una segunda base de datos.

### Fuera de alcance inicial

Notificaciones push, inteligencia artificial, chat, operación multiescuela, tiempo real por WebSockets y almacenamiento offline con sincronización. Pueden añadirse después sin bloquear las tareas académicas.

## 2. Stack tecnológico definitivo

| Área | Tecnología | Justificación |
|---|---|---|
| Monorepo | Git + `pnpm` workspaces + Turborepo para proyectos JS/TS | Una fuente de verdad; tareas y caché en web, API y ETL |
| Frontend web | React + Vite + TypeScript | SPA modular con componentes tipados |
| UI web | React Router, TanStack Query, React Hook Form, Zod; Tailwind CSS | Rutas, estado remoto, formularios y estilos |
| Backend | Node.js + NestJS + TypeScript | Arquitectura modular, DI, validación, guards y OpenAPI |
| Persistencia | **MySQL 8.0+ con InnoDB**, UTF8MB4 | PK/FK, transacciones, índices B-tree y FULLTEXT |
| ORM | Prisma con provider `mysql` | Modelo relacional, migraciones y tipado |
| ETL/bench | Node.js + TypeScript, `csv-parse`, `mysql2`/Prisma según operación | Ingesta reproducible y benchmark controlado |
| Dashboard | Chart.js (mediante react-chartjs-2) | Gráficas de línea y barras |
| Móvil | **Flutter + Dart** | Aplicación Android/iOS con API compartida |
| Estado móvil | Riverpod (propuesta) | Estado, inyección sencilla y testeo |
| HTTP móvil | Dio (propuesta) | Cliente REST y manejo de errores |
| Imágenes de reportes | Almacenamiento de objetos S3 compatible o carpeta local en desarrollo | Binarios fuera de MySQL, metadata en DB |
| Pruebas | Vitest/React Testing Library; Jest/Supertest; Flutter test; integración MySQL | Validación por capa |
| Documentación API | OpenAPI/Swagger | Contrato verificable para web y Flutter |

> **Decisión principal:** se reemplaza PostgreSQL por MySQL y React Native por Flutter. No se utilizarán instrucciones PostgreSQL como `ILIKE`, `pg_trgm`, `GIN`, `CREATE EXTENSION`, `EXPLAIN ANALYZE` de PostgreSQL ni PgBouncer. Los resultados de benchmarks de los PDF son referencias históricas y **deben volver a medirse** en MySQL.

## 3. Arquitectura de alto nivel

```mermaid
flowchart TD
  WEB[React + Vite / Web]
  APP[Flutter / Android e iOS]
  API[NestJS / REST API]
  DB[(MySQL / InnoDB)]
  MEDIA[(Almacenamiento de imágenes)]
  ETL[ETL Node.js / CSV]
  DASH[Dashboard React / Chart.js]
  WEB -->|HTTPS JSON| API
  APP -->|HTTPS JSON| API
  DASH -->|Consume API| API
  API -->|Prisma / SQL| DB
  API -->|Carga y lectura autorizada| MEDIA
  ETL -->|Importación transaccional| DB
```

**Reglas:** web y móvil nunca se conectan directamente a MySQL. La API centraliza validación, autenticación, autorización, reglas de prioridad/asignación y acceso a archivos. El ETL es una tarea interna controlada, no un endpoint público.

## 4. Estructura del monorepo

```text
banana-escolar/
├── apps/
│   ├── web/                         # React + Vite + TS (feature-based)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                  # bootstrap, router, providers
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── reports/
│   │   │   │   ├── technicians/
│   │   │   │   ├── solutions/
│   │   │   │   ├── users/
│   │   │   │   └── dashboard/
│   │   │   ├── shared/
│   │   │   │   ├── api/              # client HTTP tipado
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── lib/
│   │   │   │   └── styles/
│   │   │   └── main.tsx
│   │   ├── .env.example
│   │   └── package.json
│   ├── api/                         # NestJS (módulos por dominio)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/               # guards, pipes, filters, interceptors
│   │   │   ├── config/
│   │   │   ├── database/             # PrismaService / módulo DB
│   │   │   ├── integrations/
│   │   │   │   └── storage/          # StoragePort + local/S3 adapters
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── categories/
│   │   │       ├── reports/
│   │   │       ├── assignments/
│   │   │       ├── solutions/
│   │   │       ├── uploads/
│   │   │       ├── analytics/
│   │   │       └── health/
│   │   ├── test/
│   │   ├── .env.example
│   │   └── package.json
│   └── mobile/                      # Proyecto Flutter independiente dentro del repo
│       ├── android/
│       ├── ios/
│       ├── assets/
│       ├── lib/
│       │   ├── app/                  # MaterialApp, routes, theme
│       │   ├── core/                 # network, auth storage, errors, DI
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── reports/
│       │   │   ├── assignments/
│       │   │   ├── solutions/
│       │   │   └── profile/
│       │   └── main.dart
│       ├── test/
│       ├── pubspec.yaml
│       └── analysis_options.yaml
├── packages/
│   ├── api-client/                 # cliente TypeScript generado de OpenAPI (web/ETL si aplica)
│   ├── config-eslint/
│   └── config-typescript/
├── tools/
│   ├── etl/
│   │   ├── src/
│   │   │   ├── generate-data.ts
│   │   │   ├── extract.ts
│   │   │   ├── transform.ts
│   │   │   ├── load.ts
│   │   │   ├── validate.ts
│   │   │   └── cli.ts
│   │   ├── data/                     # CSV sintéticos, sin datos reales
│   │   ├── output/                   # descartados.csv + reporte_etl.json
│   │   └── package.json
│   └── benchmark/
│       ├── src/
│       │   ├── seed-million.ts
│       │   ├── bench.ts
│       │   └── explain.ts
│       ├── results/
│       └── package.json
├── docs/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   ├── etl/
│   ├── benchmarking/
│   ├── evidence/                   # capturas reales y resultados propios
│   └── entregables/                # documentación de tareas 1, 2 y 3
├── infra/
│   ├── mysql/                       # SQL, configuración e instrucciones locales
│   └── storage/                     # documentación de bucket/carpeta
├── .github/workflows/
│   ├── js-ci.yml
│   └── flutter-ci.yml
├── .gitignore
├── .env.example                    # plantilla, NO secretos
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

**Importante:** Flutter comparte el **repositorio**, pero **no** es un paquete `pnpm`. Se ejecuta con `flutter pub get`, `flutter analyze`, `flutter test`, `flutter run`. Turborepo orquesta solo `web`, `api`, `etl`, `benchmark` y paquetes JS/TS. Si se desea, la CI ejecuta Flutter en un job separado.

## 5. Arquitectura recomendada por componente

### 5.1 Web — arquitectura feature-based por capas ligeras

En cada `features/reports/`:

```text
reports/
├── api/             # report-service.ts, requests al backend
├── components/      # ReportCard, ReportFilters, ReportForm
├── hooks/           # useReports, useCreateReport
├── pages/           # MyReportsPage, ReportDetailPage
├── schemas/         # validación de formularios con Zod
├── types/           # tipos propios de presentación
└── index.ts         # exports públicos
```

- `pages` ensamblan vistas, `components` solo presentan, `hooks` coordinan consultas, `api` encapsula HTTP.
- TanStack Query gestiona caché de datos remotos; no duplicar reportes en un estado global.
- Router con acceso por roles, **solo para UX**; autorización real en NestJS.
- Contratos REST y DTO generados/documentados desde OpenAPI; no duplicar lógica de reglas del negocio.
- Mostrar estados `loading`, `empty`, `error`, y paginación; diseño responsive y accesible.

### 5.2 API — monolito modular NestJS, separación Controller / Application / Domain / Infrastructure

Ejemplo `modules/reports/`:

```text
reports/
├── reports.module.ts
├── presentation/
│   ├── reports.controller.ts
│   └── dto/
├── application/
│   ├── create-report.use-case.ts
│   ├── list-reports.use-case.ts
│   └── assign-technician.use-case.ts
├── domain/
│   ├── report.rules.ts
│   ├── report.repository.ts         # interfaz/puerto
│   └── report.types.ts
└── infrastructure/
    └── prisma-report.repository.ts # adaptador MySQL vía Prisma
```

Flujo: **Controller → Use case → Repository port → Prisma adapter → MySQL**.

- `presentation`: HTTP, validación de entrada, autenticación, códigos de estado y serialización.
- `application`: casos de uso, transacciones y orquestación.
- `domain`: invariantes, estados y políticas (sin depender de NestJS/Prisma).
- `infrastructure`: consultas, persistencia y proveedores externos.
- Evitar crear capas vacías: implementar adaptadores e interfaces donde aporten pruebas y desacoplamiento.
- Inicialmente desplegar como **un solo proceso API**, no microservicios.

### 5.3 Mobile — Flutter con MVVM y repositorios por feature

```text
features/reports/
├── data/
│   ├── models/                  # DTO parseado / modelos de respuesta
│   ├── services/                # ReportApiService (Dio)
│   └── repositories/            # ReportRepositoryImpl
├── domain/
│   ├── entities/                # modelos de negocio UI (si necesario)
│   └── repositories/            # contratos
└── presentation/
    ├── pages/                   # vistas Flutter
    ├── widgets/
    └── view_models/             # Riverpod Notifiers / ViewModels
```

**View → ViewModel → Repository → API Service → NestJS**. La guía oficial Flutter recomienda separar UI (views/view models) y datos (repositories/services). No compartir TypeScript directamente con Dart; generar cliente Dart desde OpenAPI si el equipo decide automatizar contratos. Guardar tokens en almacenamiento seguro del dispositivo, no en texto plano. 

### 5.4 ETL — pipeline de pasos verificables

```text
CSV crudos → Extract → Validate → Transform/Deduplicate → Load MySQL → Verify/Export
                               ↘ descartados.csv + razones
```

- Código de generación con semilla fija `2026` y datos completamente ficticios.
- Extracción en streaming cuando el volumen crezca; para 10,450 filas es viable cargar CSV en memoria.
- Normalización determinista: categorías, estado, fechas, espacios, prioridad.
- Identificar duplicados por `folio`; descartar con causa.
- Importar catálogos/usuarios primero; después reportes/soluciones por lotes y dentro de transacción controlada.
- No ejecutar `TRUNCATE` indiscriminado en una instalación productiva; `reset` solo en ambiente de pruebas y con bandera explícita.
- Crear `etl_run`/logs o al menos `reporte_etl.json` con conteos, tiempos, checksum y errores.
- Hacer el pipeline idempotente usando clave única de folio y estrategia explícita de reemplazo/upsert.

### 5.5 Imágenes — storage adapter y base de datos con metadatos

**Regla:** no guardar bytes de fotos en MySQL. La API guarda la imagen en carpeta privada local (desarrollo) o bucket S3-compatible (producción), y guarda la referencia en la BD.

Flujo recomendado MVP:

1. Usuario elige foto (`input type=file` web / `image_picker` Flutter).
2. Cliente envía `multipart/form-data` a `POST /v1/reports/:id/attachments` autenticado.
3. API valida rol/pertenencia, tipo real (JPEG/PNG/WebP), tamaño máximo configurable (ej. **5 MB**), cantidad por reporte, y nombre seguro generado (UUID).
4. API guarda archivo bajo clave `reports/{reportId}/{uuid}.webp` (o formato validado conservado), nunca usando nombre aportado por usuario.
5. API registra `report_attachments` con `id`, `report_id`, `storage_key`, `mime_type`, `size_bytes`, `created_at`, `uploaded_by`.
6. `GET /v1/reports/:id/attachments/:attachmentId` autoriza acceso y devuelve URL firmada de corta duración o transmite archivo; no exponer bucket privado públicamente.
7. En borrado, sincronizar eliminación lógica y archivo mediante tarea de limpieza para tolerar fallos parciales.

**Decisión de modelado:** los PDF hablan de una `foto`/ruta en `reportes`. Para MVP se admite `foto_url`/`foto_key` nullable. **Recomendación:** tabla `report_attachments` 1:N para permitir varias fotografías y metadatos; documentar que es ampliación del modelo original. Para cumplir exactamente el modelo de las tareas, restringir inicialmente a una foto por reporte desde la API.

**Protecciones mínimas:** listas permitidas de MIME, verificación de contenido real, límites de subida, no ejecutar archivos, quitar EXIF sensible cuando aplique, limitar acceso y aplicar retención. Hacer thumbnails fuera de la transacción DB si se implementan.

## 6. Modelo de datos MySQL

Entidades base de los documentos: `usuarios`, `categorias`, `reportes`, `soluciones`. Se añade `report_attachments` para archivos, y opcionalmente `etl_runs`/`audit_logs` para trazabilidad.

| Tabla | Campos principales | Reglas |
|---|---|---|
| `usuarios` | id, nombre, correo, password_hash, rol, activo, creado_en | `correo UNIQUE`, rol restringido |
| `categorias` | id, nombre | `nombre UNIQUE`, catálogo de 7 |
| `reportes` | id, folio, usuario_id, categoria_id, tecnico_id nullable, descripcion, ubicacion, prioridad, estado, creado_en, asignado_en nullable | `folio UNIQUE`, FKs; índice por filtros |
| `soluciones` | id, reporte_id, tecnico_id, descripcion, observaciones nullable, resuelto_en | `reporte_id UNIQUE` para 1:1; FKs |
| `report_attachments` | id, reporte_id, storage_key, mime_type, size_bytes, uploaded_by, created_at | FK reporte y FK usuario; clave única |

**Estados:** `pendiente`, `en_proceso`, `completado`. **Prioridades:** `baja`, `media`, `alta` (ajustar al catálogo efectivo del proyecto). Registrar todas las fechas en UTC y presentar hora local de Mérida en UI/ETL; las entradas de los CSV deben declarar su zona y convertirlas sin ambigüedades.

### Diagrama ER

```mermaid
erDiagram
  USUARIOS ||--o{ REPORTES : solicita
  USUARIOS |o--o{ REPORTES : atiende
  USUARIOS ||--o{ SOLUCIONES : registra
  CATEGORIAS ||--o{ REPORTES : clasifica
  REPORTES ||--o| SOLUCIONES : tiene
  REPORTES ||--o{ REPORT_ATTACHMENTS : contiene
  USUARIOS ||--o{ REPORT_ATTACHMENTS : sube
```

**Invariantes que validará la API y/o DB:**

1. Cada reporte tiene solicitante y categoría existentes.
2. Reporte `en_proceso` o `completado` requiere técnico asignado.
3. Completar reporte exige guardar una solución de forma atómica (misma transacción).
4. El técnico que resuelve debe ser técnico activo y estar autorizado para ese reporte.
5. No se crean dos soluciones para el mismo reporte (`UNIQUE(reporte_id)`).
6. Estados y prioridad usan listas cerradas; añadir `CHECK` compatible con la versión MySQL elegida y validación API.
7. Controlar cambios de estado permitidos: `pendiente → en_proceso → completado` (definir reaperturas como nueva regla, si se requieren).

### Índices MySQL recomendados

```sql
-- Índices secundarios para consultas reales del proyecto.
CREATE INDEX idx_reportes_cat_estado_fecha
  ON reportes (categoria_id, estado, creado_en DESC, id DESC);
CREATE INDEX idx_reportes_usuario_fecha
  ON reportes (usuario_id, creado_en DESC, id DESC);
CREATE INDEX idx_reportes_tecnico_estado
  ON reportes (tecnico_id, estado, creado_en DESC);
CREATE FULLTEXT INDEX idx_reportes_descripcion_fulltext
  ON reportes (descripcion);
```

**Diferencias MySQL:**

- Reemplazar `ILIKE '%palabra%'` por comparación según collation `utf8mb4_0900_ai_ci` cuando se requieran substrings, **o** `MATCH(descripcion) AGAINST (? IN NATURAL LANGUAGE MODE)` para búsqueda por términos. `FULLTEXT` **no reproduce exactamente** semántica de substring y tiene reglas para tokens mínimos/stopwords.
- No hay `pg_trgm`/GIN; para búsquedas de subcadenas arbitrarias a gran escala, considerar motor de búsqueda externo en una fase posterior. No prometer que FULLTEXT acelera `LIKE '%cadena%'`.
- `EXPLAIN ANALYZE SELECT ...` en MySQL moderno permite inspeccionar el plan; documentar versión exacta del motor y contrastar con `EXPLAIN`.
- El índice compuesto mejora consultas cuando el orden y filtros coinciden con su prefijo; medir cada consulta con datos de prueba.

## 7. API REST propuesta (`/v1`)

| Método | Ruta | Rol | Uso |
|---|---|---|---|
| POST | `/auth/login` | Público | Autenticación |
| POST | `/auth/refresh` | Sesión válida | Renovación segura |
| GET | `/auth/me` | Autenticado | Perfil y permisos |
| GET | `/categories` | Autenticado | Catálogo |
| GET | `/reports` | Admin; usuario/técnico según alcance | Paginación y filtros con RBAC por fila |
| POST | `/reports` | Usuario / Admin | Nuevo reporte |
| GET | `/reports/:id` | Dueño, técnico asignado o admin | Detalle |
| PATCH | `/reports/:id/assignment` | Admin / regla sistema | Asignación |
| PATCH | `/reports/:id/status` | Técnico asignado / Admin | Transición permitida |
| POST | `/reports/:id/solution` | Técnico asignado / Admin | Resolver atómicamente |
| POST | `/reports/:id/attachments` | Dueño / Admin autorizado | Subir imagen |
| GET | `/reports/:id/attachments/:attachmentId` | Con acceso al reporte | Obtener imagen |
| GET | `/analytics/summary` | Admin | Métricas de tarjetas |
| GET | `/analytics/weekly-reports` | Admin | Últimas 12 semanas |
| GET | `/analytics/resolution-by-category` | Admin | Días promedio |
| GET | `/analytics/top-locations` | Admin | Fallas por ubicación |
| GET | `/health` | Interno / público limitado | Estado del servicio |

**Listado:** `page=1&limit=20` (máx. 50), filtros `categoryId`, `status`, `priority`, `from`, `to`, `search`; respuesta `{data, meta:{page,limit,total,totalPages}}`. Para un millón de filas, introducir cursor de paginación `createdAt + id`; no reemplazar de inicio el sistema paginado exigido en la tarea 2.

**Seguridad:** hash Argon2id/bcrypt configurado adecuadamente; tokens y refresh con rotación, revocación y expiración; DTOs con `class-validator`, rate limit en login, CORS restringido, logs sin contraseñas, HTTPS en producción y comprobación de propiedad por registro. Para web, preferir cookies `HttpOnly`, `Secure`, `SameSite` cuando la topología lo permita; para móvil, almacenamiento seguro y manejo de renovación.

## 8. Reglas de negocio propuestas

- Prioridad automática: parametrizar por categoría y gravedad del problema, y guardar motivo/regla aplicada. **Los PDF no incluyen una matriz exacta**; la debe aprobar el equipo antes de codificar.
- Asignación automática: seleccionar técnico activo con menos reportes abiertos (con criterio de desempate estable y control de concurrencia). Permitir reasignación manual autorizada.
- Un usuario solo visualiza sus reportes; un técnico solo los asignados; admin consulta todos.
- Registrar `creado_en`, `asignado_en`, `resuelto_en` con fuente confiable del servidor.
- Folio único `REP-AAAA-00001` generado con secuencia/contador transaccional para evitar colisiones (no usar `COUNT(*)+1`).
- Cambios de estado y escritura de solución deben protegerse frente a solicitudes concurrentes.

## 9. Datos sintéticos y ETL (tarea 2)

Objetivo reproducir **datos documentados**, sin asumir que la implementación ya tiene esos resultados:

| Concepto | Meta |
|---|---:|
| Usuarios totales | 210 (200 solicitantes, 8 técnicos, 2 admins) |
| Reportes crudos | 10,450 |
| Duplicados esperados a descartar | 250 |
| Obligatorios faltantes | 120 |
| Tipos/fechas inválidos | 80 |
| Total descartados | 450 |
| Reportes finales válidos | 10,000 |
| Soluciones esperadas | 8,099 |
| Categorías | 7 |

**Salidas:** `data/usuarios.csv`, `data/reportes_crudos.csv`, `output/descartados.csv`, `output/reporte_etl.json` y logs. La semilla `2026` permite repetir datos; las reglas de corrección deben documentarse claramente. Antes de fijar cifras, validar que generador/ETL producen consistentemente esos conteos.

**Validaciones:** Q1 reportes por categoría y estado, Q2 reportes activos por técnico, Q3 tiempo promedio de resolución por categoría. Conteos deben cuadrar con SQL independientes y ser revisables en el dashboard.

## 10. Dashboard (tarea 3)

Tres métricas mínimas exigidas:

1. **M1:** reportes creados por semana en las últimas 12 semanas — gráfica de líneas.
2. **M2:** días promedio desde creación hasta solución, agrupados por categoría — barras horizontales.
3. **M3:** ubicaciones con más reportes — barras verticales.

Más tarjetas opcionales: total recibido, pendiente, en proceso, completado y comparativa de la semana. Todas las cifras se calculan desde la API/MySQL; no codificar números de ejemplo en la interfaz. Mostrar siempre rango de fechas y que los datos son sintéticos cuando se use la base de prueba.

## 11. Benchmark y optimización 100% MySQL

**Consultas a comparar:**

- **A — historial:** filtro por `categoria_id`, `estado` y fechas, ordenado por `creado_en DESC, id DESC`, página 1.
- **B — texto:** registrar **dos variantes distintas** para no confundir comportamiento: B1 `LIKE '%palabra%'` (substring sin índice especializado) y B2 `MATCH(descripcion) AGAINST (...)` (FULLTEXT, búsqueda por términos). B1 y B2 **no son equivalentes**, así que no presentar su mejora como comparación idéntica.

**Método repetible:**

1. Sembrar 10,000 filas y luego 1,000,000 en esquema/BD de laboratorio independiente; dejar documentada la generación.
2. Registrar hardware, RAM, SO, versión MySQL, Node y parámetros de la consulta.
3. Ejecutar 3 calentamientos + 30 repeticiones cronometradas para cada variante; repetir condiciones en conexión controlada.
4. Medir **antes** y **después** del índice pertinente (sin modificar datos entre medidas), guardar promedio, mediana, mínimo y p95.
5. Capturar planes con `EXPLAIN ANALYZE` compatible con la versión de MySQL elegida y evidencia de uso de índice.
6. Guardar tamaños de tabla e índices, tiempo de creación y discusión del costo en escritura.
7. Reportar discrepancias respecto a los PDFs: los números originales están asociados a sintaxis/planes PostgreSQL y **no se pueden trasladar a MySQL**.

Ejemplo de filtro A:

```sql
SELECT id, folio, categoria_id, estado, creado_en
FROM reportes
WHERE categoria_id = ?
  AND estado = ?
  AND creado_en >= ?
  AND creado_en < ?
ORDER BY creado_en DESC, id DESC
LIMIT 20 OFFSET 0;
```

Ejemplo FULLTEXT B2:

```sql
SELECT id, folio, descripcion
FROM reportes
WHERE MATCH(descripcion) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY creado_en DESC, id DESC
LIMIT 20;
```

**Escalabilidad posterior:** paginación por cursor, caché breve de indicadores, pool MySQL, réplica de lectura MySQL y particionado/archivo solo si métricas reales lo justifican. No usar PgBouncer con MySQL.

## 12. Desarrollo local y configuración

**Sin Docker como requisito:** puede instalarse MySQL localmente, usar MAMP si se dispone de él y cumple la versión necesaria, o conectarse a una instancia administrada. Docker puede ser una opción futura, pero no es obligatorio para este diseño.

Variables mínimas orientativas:

```dotenv
# apps/api/.env.example
NODE_ENV=development
PORT=3000
DATABASE_URL="mysql://banana_user:change_me@127.0.0.1:3306/banana_escolar"
JWT_ACCESS_SECRET=replace_with_strong_secret
JWT_REFRESH_SECRET=replace_with_different_strong_secret
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./.storage/uploads
PUBLIC_APP_ORIGIN=http://localhost:5173

# apps/web/.env.example
VITE_API_URL=http://localhost:3000/v1

# apps/mobile: endpoint mediante --dart-define (NO secretos)
# API_BASE_URL=http://10.0.2.2:3000/v1  (emulador Android)
```

No versionar `.env`, archivos privados, CSV con datos reales, claves de cloud o contraseñas. El cliente web/móvil **nunca recibe** `DATABASE_URL` ni JWT secrets.

**Comandos previstos una vez configurados los `package.json`:**

```bash
pnpm install
pnpm --filter api prisma migrate dev
pnpm --filter etl generate
pnpm --filter etl run
pnpm --filter web dev
pnpm --filter api start:dev
# en otra terminal:
cd apps/mobile && flutter pub get && flutter run
```

Los nombres de scripts `generate`/`run` son **contratos propuestos**: implementarlos primero en `tools/etl/package.json` y ajustar la ejecución según el nombre real de cada paquete. No asumir que estos comandos ya funcionan.

## 13. Plan de implementación y entregables

| Fase | Prioridad | Trabajo | Criterio de terminado |
|---|---|---|---|
| 0 | Alta | Monorepo, lint, CI, README, `.env.example` | `web`, `api`, `etl` y Flutter inicializan localmente |
| 1 | Alta | Migraciones MySQL, ERD, catálogos, políticas de roles | FKs, UNIQUE, CHECK y seed verificados |
| 2 | Alta | API de auth, reportes, asignaciones, soluciones | Swagger + pruebas de negocio y permisos |
| 3 | Alta | ETL generador, limpieza, carga y validación | 10,000 válidos, 450 descartados, reporte auditable |
| 4 | Alta | Web: login, mis reportes, técnico, historial | Búsqueda, filtros, paginación y estados funcionales |
| 5 | Alta | Dashboard con 3 indicadores | Datos desde MySQL y gráficas correctas |
| 6 | Alta | Bench 10k / 1m y optimizaciones MySQL | Resultados antes/después y planes de ejecución propios |
| 7 | Media | Almacenamiento de imágenes (web/API) | Carga segura y lectura autorizada |
| 8 | Media | Flutter: login, reportar, mis reportes, técnico | Flujo principal Android/iOS con la API común |
| 9 | Alta | Documentación final, capturas reales y video | 3 entregas coherentes + demo 3–5 min |

**Nota de prioridad:** si Flutter y fotografías forman parte de la demostración obligatoria del equipo, mover fases 7 y 8 antes del benchmark final, sin alterar los criterios de aceptación.

### Entrega 1 — Mapa de datos y arquitectura
- Inventario de entidades y frecuencia de actualización.
- Escenarios de crecimiento y riesgos.
- Comparación **MySQL vs MongoDB** actualizada y técnicamente consistente.
- Diagramas monorepo, despliegue, ERD y decisiones de seguridad/almacenamiento.

### Entrega 2 — ETL y base de prueba
- Scripts reproducibles (semilla fija), CSV sintéticos y descartados.
- Esquema MySQL y seed; resultados de validación Q1–Q3.
- Historial web con filtros y paginación real.

### Entrega 3 — Dashboard y benchmark
- Dashboard real de tres gráficas, capturas y endpoints.
- Benchmarks en **MySQL**, sin copiar mediciones de PostgreSQL.
- Comparación de consultas, índices, planes, costes y limitaciones.
- Video de demostración de 3 a 5 minutos y enlaces a repo/evidencia.

## 14. Checklist de calidad y aceptación

- [ ] Web y Flutter se comunican exclusivamente con NestJS.
- [ ] MySQL es el único motor relacional principal del proyecto.
- [ ] Ningún script usa `ILIKE`, `pg_trgm`, GIN, `CREATE EXTENSION` ni PgBouncer.
- [ ] Validaciones de auth/roles verificadas en el **servidor**.
- [ ] Un reporte completado posee solución y técnico válido.
- [ ] Fotografías se almacenan fuera de MySQL; referencias persistidas y privadas.
- [ ] ETL es reproducible, descarta filas con motivo y verifica conteos.
- [ ] Dashboard consulta datos reales de la base de pruebas.
- [ ] Benchmark reproduce metodología y anota entorno real.
- [ ] `README.md` describe instalación, ejecución, pruebas y credenciales de demostración **no reales**.
- [ ] Documentación y capturas corresponden al código entregado.

## 15. Referencias y procedencia

### Documentos base proporcionados
1. *Tarea 1 — Mapa de Datos y Propuesta de Arquitectura — Banana Escolar* (26/oct/2026).
2. *Tarea 2 — Proceso ETL y Base de Datos de Prueba — Banana Escolar* (26/oct/2026).
3. *Tarea 3 — Dashboard Funcional y Prueba Comparativa — Banana Escolar* (26/oct/2026).

Los módulos, volúmenes de prueba, indicadores y flujos provienen de estas tareas. La selección de NestJS/Prisma, arquitectura por capas, Riverpod, DTO OpenAPI, tabla de adjuntos y secuenciación de fases son **propuestas para esta implementación**, no exigencias literales de los PDF.

### Referencias técnicas útiles
- Flutter, guía oficial de arquitectura: https://docs.flutter.dev/app-architecture/guide
- Flutter, recomendaciones de arquitectura: https://docs.flutter.dev/app-architecture/recommendations
- Prisma, búsqueda de texto: https://www.prisma.io/docs/orm/v6/prisma-client/queries/full-text-search
- MySQL 8.4, referencia: https://dev.mysql.com/doc/refman/8.4/en/
- NestJS, documentación: https://docs.nestjs.com/
- Turborepo, documentación: https://turborepo.com/docs

---

**Siguiente paso de construcción:** crear el monorepo físico, scaffolds `apps/web`, `apps/api`, `apps/mobile`, `tools/etl`, configurar MySQL y escribir la primera migración Prisma. Este documento es el plano técnico; no incluye aún el código ejecutable.
