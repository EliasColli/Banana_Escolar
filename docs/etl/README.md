# ETL reproducible (tarea 2)

Pipeline:

```text
CSV crudos → Extract → Validate → Transform/Deduplicate → Load MySQL → Verify/Export
                               ↘ descartados.csv + motivos
```

Código en `tools/etl/src`:

| Archivo | Responsabilidad |
|---|---|
| `generate-data.ts` | Genera usuarios y reportes sintéticos con semilla 2026 |
| `extract.ts` | Lee CSV en streaming lógico y calcula SHA-256 |
| `validate.ts` | Normaliza, valida tipos/fechas/reglas y deduplica |
| `load.ts` | Upsert transaccional por lotes y ajuste de folios |
| `verify.ts` | Consultas Q1–Q3 y conteos independientes |
| `cli.ts` | Orquesta, escribe salidas y registra `etl_runs` |

## 1. Datos generados

Semilla fija **2026** (mulberry32). No se usan datos reales.

| Concepto | Meta | Resultado real |
|---|---:|---:|
| Usuarios | 210 | 210 (2 admin, 8 técnicos, 200 solicitantes) |
| Reportes crudos | 10,450 | 10,450 |
| Duplicados | 250 | 250 |
| Obligatorios faltantes | 120 | 120 |
| Tipos/fechas inválidos | 80 | 80 (40 fecha, 40 tipo) |
| Descartados | 450 | 450 |
| Válidos | 10,000 | 10,000 |
| Soluciones | 8,099 | 8,099 |
| Categorías | 7 | 7 |

Archivos:

```text
tools/etl/data/usuarios.csv
tools/etl/data/reportes_crudos.csv
tools/etl/output/descartados.csv
tools/etl/output/reporte_etl.json
```

`data/` y `output/` están ignorados por Git: se regeneran con un comando.

## 2. Extracción

- `csv-parse` con `columns: true`, `bom: true` y `skip_empty_lines`.
- 10,450 filas caben en memoria; si el volumen crece, cambiar a stream por lotes.
- Checksum SHA-256 del CSV para auditoría y detección de cambios.

## 3. Validación y normalización

Orden determinista (importa para que los conteos coincidan):

1. **Campos obligatorios**: folio, correo, categoría, descripción, ubicación,
   prioridad, estado, creado_en.
2. **Folio**: formato `REP-AAAA-NNNNN` (5–7 dígitos).
3. **Longitudes**: descripción 1–2000, ubicación 1–190.
4. **Catálogo**: categoría canónica (sin distinguir mayúsculas/espacios).
5. **Estado**: alias (`en proceso`, `en-proceso`, `resuelto`…) →
   `pendiente | en_proceso | completado`.
6. **Prioridad**: alias `low/medium/high` → `baja/media/alta`.
7. **Fecha**: acepta `YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss` e ISO 8601; valida mes,
   día y hora reales. Rechaza `31/02/2026` o `no-disponible`.
8. **Usuario**: correo válido y existente en el CSV de usuarios.
9. **Técnico**: si el estado lo exige, debe existir, ser técnico y estar activo.
10. **Solución**: un completado requiere descripción y `resuelto_en ≥ creado_en`.
11. **Duplicado**: segunda aparición del folio → `FOLIO_DUPLICADO`.

Transformaciones:

| Regla | Ejemplo |
|---|---|
| Trim + colapsar espacios | `"  fuga   de agua "` → `"fuga de agua"` |
| Correo a minúsculas | `Usuario1@…` → `usuario1@…` |
| Categoría canónica | `"plomeria"` → `"Plomería"` |
| Estado/prioridad cerrados | `"en proceso"` → `en_proceso` |
| Fechas a UTC | `2026-03-01 10:00:00` → `2026-03-01T10:00:00Z` |
| `asignado_en` derivado | si falta y hay técnico, usa `creado_en` |
| Solución solo si completado | evita datos inconsistentes |

Cada descarte se escribe en `descartados.csv` con `row_id`, folio, motivo,
detalle y datos crudos útiles.

## 4. Carga

1. **Usuarios**: upsert por `correo`; contraseñas demo hasheadas con bcrypt 12
   (una sola vez por contraseña distinta).
2. **Categorías**: `INSERT IGNORE` de las 7 canónicas.
3. **Reportes**: lotes de 500 con `INSERT … ON DUPLICATE KEY UPDATE` por folio.
4. **Soluciones**: lotes de 500, `UNIQUE(reporte_id)` + upsert.
5. **Folios**: `folio_counters` se actualiza con `GREATEST(last_value, importado)`
   para que la API continúe sin colisiones.
6. **Transacción**: toda la carga ocurre en una transacción; si falla, rollback.

Idempotencia: ejecutar dos veces no duplica reportes ni soluciones. Los conteos
se mantienen en 10,000 / 8,099.

### Reinicio explícito

Solo en pruebas:

```bash
ETL_RESET=true pnpm etl:run
```

Hace `TRUNCATE` de tablas funcionales con FKs deshabilitadas y aborta si
`NODE_ENV=production`.

## 5. Verificación

Al finalizar, el ETL ejecuta SQL independiente:

- **Q1**: reportes por categoría y estado.
- **Q2**: reportes activos por técnico (estado ≠ completado).
- **Q3**: `AVG(TIMESTAMPDIFF(SECOND, creado_en, resuelto_en))/86400` por categoría.
- Totales de usuarios por rol, soluciones y estados.

Se comparan con las metas; si no coinciden, el proceso sale con código 1 y deja
las diferencias en `reporte_etl.json`.

## 6. `reporte_etl.json`

Incluye:

```json
{
  "runId": "uuid",
  "seed": 2026,
  "source": { "rows": 10450, "users": 210, "checksum": "sha256…" },
  "counts": {
    "valid": 10000,
    "discarded": 450,
    "discardedByReason": {
      "FOLIO_DUPLICADO": 250,
      "CAMPO_OBLIGATORIO_FALTANTE": 120,
      "TIPO_INVALIDO": 40,
      "FECHA_INVALIDA": 40
    }
  },
  "timings": { "extractMs": 0, "validateMs": 0, "loadMs": 0, "verifyMs": 0 },
  "verification": { "totalReportes": 10000, "totalSoluciones": 8099, "q1PorCategoriaEstado": [], "q2ActivosPorTecnico": [], "q3ResolucionPorCategoria": [] },
  "environment": { "node": "v24…", "mysql": "9.6.0", "platform": "win32" }
}
```

La misma información se persiste en `etl_runs` (JSON + checksum + conteos).

## 7. Comandos

```bash
pnpm etl:generate      # CSV con semilla 2026
pnpm etl:run           # carga y verificación
pnpm --filter @banana/etl verify   # solo Q1–Q3 y conteos
```

Antes de ejecutar, `DATABASE_URL` debe apuntar a la base correcta en
`tools/etl/.env`.
