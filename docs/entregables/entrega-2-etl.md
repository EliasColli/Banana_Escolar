# Entrega 2 · ETL y base de datos de prueba

## Artefactos

| Requisito | Dónde |
|---|---|
| Generador reproducible (semilla 2026) | `tools/etl/src/generate-data.ts` |
| CSV sintéticos | `tools/etl/data/` (se regeneran, no se versionan) |
| Descartados con motivo | `tools/etl/output/descartados.csv` |
| Reporte auditable | `tools/etl/output/reporte_etl.json` + tabla `etl_runs` |
| Esquema MySQL y migración | `apps/api/prisma/migrations/20261030000000_init/` |
| Seed de catálogos/usuarios | `apps/api/prisma/seed.ts` |
| Verificación Q1–Q3 | `tools/etl/src/verify.ts` |
| Historial web con filtros | `apps/web/src/features/reports/pages/ReportsListPage.tsx` |
| Documentación ETL | `docs/etl/README.md` |

## Resultados

| Concepto | Meta | Obtenido |
|---|---:|---:|
| Usuarios | 210 | 210 |
| Reportes crudos | 10,450 | 10,450 |
| Duplicados | 250 | 250 |
| Faltantes obligatorios | 120 | 120 |
| Tipos/fechas inválidos | 80 | 80 |
| Descartados | 450 | 450 |
| Válidos importados | 10,000 | 10,000 |
| Soluciones | 8,099 | 8,099 |
| Categorías | 7 | 7 |

Comando de reproducción:

```bash
pnpm etl:generate
ETL_RESET=true pnpm etl:run
```

El reinicio solo es válido en pruebas; el ETL aborta si `NODE_ENV=production`.

## Consultas de validación

- **Q1** reportes por categoría y estado.
- **Q2** reportes activos por técnico.
- **Q3** tiempo promedio de resolución por categoría.
- Totales independientes de usuarios y soluciones.

Los resultados se guardan en `reporte_etl.json` y se muestran en el dashboard
(historial, tarjetas, M2).

## Historial web

`/history` (ADMIN) y `/inbox` (TÉCNICO) y `/reports` (USUARIO) ofrecen:

- búsqueda por folio, descripción o ubicación;
- filtros combinados de categoría, estado, prioridad y rango de fechas;
- paginación en servidor (20 por página, máximo 50);
- estados de carga, vacío y error;
- RBAC por fila aplicado en la API.

## Checklist

- [x] Semilla fija y conteos exactos verificados.
- [x] Descartados con motivo y checksum.
- [x] Carga transaccional e idempotente.
- [x] Contador de folios ajustado tras la importación.
- [x] Verificación Q1–Q3.
- [x] Historial con filtros y paginación real.
- [x] Capturas de la base y del historial en `docs/evidence/`.
