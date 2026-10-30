# Entrega 3 · Dashboard y benchmark

## Dashboard

Ruta: `/dashboard` (solo ADMIN). Todos los datos provienen de MySQL en cada
consulta; no hay cifras codificadas.

| Indicador | Endpoint | Visualización |
|---|---|---|
| M1 · Reportes por semana (12 semanas) | `GET /v1/analytics/weekly-reports` | Línea |
| M2 · Días promedio de resolución por categoría | `GET /v1/analytics/resolution-by-category` | Barras horizontales |
| M3 · Ubicaciones con más incidencias | `GET /v1/analytics/top-locations?limit=8` | Barras verticales |

Además: tarjetas de total, pendiente, en proceso, completado, tiempo promedio y
comparación semanal (`GET /v1/analytics/summary`), más aviso de datos sintéticos.

Navegación por rol:

- ADMIN → Dashboard, Historial general, Usuarios, Nuevo reporte.
- TÉCNICO → Mi bandeja, perfil.
- USUARIO → Mis reportes, Nuevo reporte, perfil.

## Benchmark

Resultados propios (MySQL 9.6, 30 repeticiones + 3 calentamientos):

| Variante | 10k antes | 10k después | 1M antes | 1M después |
|---|---:|---:|---:|---:|
| A · índice compuesto | 4.49 ms | 0.29 ms | 1125.85 ms | 0.49 ms |
| B1 · `LIKE '%extintor%'` | 27.84 ms | 29.29 ms | 3465.36 ms | 4950.82 ms |
| B2 · FULLTEXT | n/e | 0.52 ms | n/e | 847.62 ms |

- A mejora >99 % en 1M y usa *index range scan*.
- B1 no puede usar B-tree; la diferencia es ruido de caché, no una mejora.
- B2 no es equivalente a B1; reduce el costo del escaneo por términos.
- Costos de creación: índice compuesto ~2.76 s en 1M; FULLTEXT adicional.
- Planes `EXPLAIN ANALYZE`, tamaño de tabla/índices y entorno completo en
  `tools/benchmark/results/`.

Metodología y discusión: `docs/benchmarking/README.md`.

## Reproducción

```bash
pnpm bench:seed:10k && pnpm bench:run
pnpm bench:seed:1m  && pnpm bench:run
```

## Checklist

- [x] Tres gráficas conectadas a la API/MySQL.
- [x] Tarjetas y comparativa semanal.
- [x] Filtros y RBAC en las consultas.
- [x] Benchmark 10k y 1M en MySQL, sin cifras de PostgreSQL.
- [x] Antes/después, percentiles, planes y costos.
- [x] Capturas del dashboard en `docs/evidence/`.
- [ ] Captura móvil y video de 3–5 min (pendiente de demo).
- [ ] Enlace al repositorio público en la entrega final.
