# Benchmark MySQL (tarea 3)

Herramientas en `tools/benchmark`:

| Archivo | Uso |
|---|---|
| `src/seed.ts` | Siembra 10,000 o 1,000,000 reportes sintéticos |
| `src/bench.ts` | Mide antes/después, crea índices, captura planes y exporta |
| `sql/schema.sql` | Esquema de laboratorio sin índices secundarios |
| `results/` | JSON + Markdown con las mediciones reales |

## 1. Metodología

1. Base independiente `banana_benchmark`; no se toca la base funcional.
2. Semilla `2026`, descripciones con término poco frecuente (`extintor`, ~0.5 %)
   para que FULLTEXT sea selectivo.
3. Se eliminan índices secundarios y se ejecuta `ANALYZE TABLE` para el estado
   base.
4. 3 calentamientos + **30 repeticiones cronometradas** por variante
   (`process.hrtime.bigint`).
5. Se crea el índice compuesto y el FULLTEXT **sin modificar datos**.
6. Se repiten las mediciones y se capturan planes con `EXPLAIN ANALYZE`.
7. Se guardan promedio, mediana, p95, mínimo/máximo y tamaño de tabla/índices.

Consultas:

- **A — historial**: `categoria_id`, `estado`, rango de fechas, orden
  `creado_en DESC, id DESC`, `LIMIT 20 OFFSET 0`.
- **B1 — subcadena**: `LIKE '%extintor%'`; no puede usar un B-tree.
- **B2 — términos**: `MATCH(descripcion) AGAINST ('extintor' IN NATURAL LANGUAGE MODE)`.
  **No es equivalente a B1**: FULLTEXT aplica tokenización/stopwords y no busca
  subcadenas arbitrarias.

```sql
-- A
SELECT id, folio, categoria_id, estado, creado_en
FROM reportes
WHERE categoria_id = 3 AND estado = 'completado'
  AND creado_en >= '2026-01-01' AND creado_en < '2026-10-01'
ORDER BY creado_en DESC, id DESC
LIMIT 20 OFFSET 0;
```

Índices evaluados:

```sql
CREATE INDEX idx_reportes_cat_estado_fecha
  ON reportes (categoria_id, estado, creado_en DESC, id DESC);

CREATE FULLTEXT INDEX ft_reportes_descripcion ON reportes (descripcion);
```

## 2. Entorno real de medición

| Dato | Valor |
|---|---|
| MySQL | 9.6.0 |
| Node.js | v24.15.0 |
| SO | win32 10.0.26300 |
| CPU | 13th Gen Intel Core i9-13900HX (32 hilos) |
| RAM | 32,508 MB |
| Semilla | 2026 |
| Repeticiones | 30 (+3 calentamientos) |

Los números dependen del hardware y del estado de caché; se documentan para este
equipo y **no** se trasladan desde los PDF de PostgreSQL.

## 3. Resultados

### 10,000 reportes

| Variante | Antes (ms) | Después (ms) | Mejora |
|---|---:|---:|---:|
| A · índice compuesto | 4.49 | 0.29 | 93.54 % |
| B1 · `LIKE '%extintor%'` | 27.84 | 29.29 | -5.21 % |
| B2 · FULLTEXT | no ejecutable | 0.52 | — |

### 1,000,000 reportes

| Variante | Antes (ms) | Después (ms) | Mejora |
|---|---:|---:|---:|
| A · índice compuesto | 1125.85 | 0.49 | 99.96 % |
| B1 · `LIKE '%extintor%'` | 3465.36 | 4950.82 | -42.87 % |
| B2 · FULLTEXT | no ejecutable | 847.62 | — |

Valores completos (promedio/mediana/p95/rango) y planes en
`tools/benchmark/results/bench-10000.*` y `bench-1000000.*`.

### Costo de índices (1M)

- Índice compuesto: ~2.76 s de creación.
- FULLTEXT: varios segundos adicionales al construir.
- Tamaño de tabla e índices: ver `indexBytes` en el JSON de resultados.
- Costo en escritura: cada `INSERT` debe actualizar B-tree y FULLTEXT; se acepta
  porque el sistema es de lectura/analítica intensiva y la escritura es moderada.

## 4. Planes representativos (1M)

**A después** — *index range scan*, sin filesort:

```text
-> Limit: 20 row(s)
    -> Index range scan on reportes using idx_reportes_cat_estado_fecha
       over (categoria_id = 3 AND estado = 'completado' AND …)
```

**B1 después** — *table scan* + *sort*; el índice no ayuda:

```text
-> Limit: 20 row(s)
    -> Sort: reportes.creado_en DESC, reportes.id DESC …
        -> Filter: (reportes.descripcion like '%extintor%')
            -> Table scan on reportes
```

**B2 después** — *full-text index search* + sort de IDs:

```text
-> Limit: 20 row(s)
    -> Sort row IDs: reportes.creado_en DESC, reportes.id DESC …
        -> Filter: (match reportes.descripcion against ('extintor'))
            -> Full-text index search on reportes using ft_reportes_descripcion
```

## 5. Interpretación

- **A** es el caso claro de éxito: el índice compuesto coincide con el filtro y
  el orden, elimina el escaneo y el filesort. En 1M pasa de ~1.1 s a < 1 ms
  (promedio de 30 corridas).
- **B1** no mejora porque `%texto%` impide usar el B-tree. La diferencia entre
  “antes” y “después” es ruido de caché/estado del servidor, no un efecto del
  índice. No se promete que FULLTEXT acelere `LIKE '%…%'`.
- **B2** reduce el costo de búsqueda por términos frente al escaneo completo,
  aunque el `ORDER BY` sobre 4,940 coincidencias aún requiere ordenar. Si se
  necesitara más velocidad, se podría limitar por fecha o usar un motor externo.
- **Paginación**: `OFFSET` profundo sigue siendo O(offset). Para 1M se recomienda
  cursor `(creado_en, id)` en una fase posterior; no se sustituye la paginación
  exigida en la tarea 2.

## 6. Reproducción

```bash
# Base banana_benchmark creada y BENCHMARK_DATABASE_URL configurada
pnpm bench:seed:10k
pnpm bench:run

pnpm bench:seed:1m
pnpm bench:run
```

`bench.ts` detecta el tamaño actual de la tabla y nombra las salidas
`bench-10000.*` / `bench-1000000.*`. Para repetir con otro número de repeticiones:

```bash
pnpm --filter @banana/benchmark exec tsx src/bench.ts --repeats=10
```

## 7. Limitaciones

- Un solo equipo y una sola instancia MySQL; no hay réplica ni concurrencia.
- El caché del sistema operativo influye; los resultados deben repetirse en el
  hardware de la demostración.
- El dataset de laboratorio omite FKs para aislar el costo de consulta.
- B1 y B2 no son equivalentes; se reportan por separado.
- MySQL 9.6 es la versión medida; en 8.0/8.4 los planes pueden variar.
