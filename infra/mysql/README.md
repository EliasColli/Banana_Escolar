# MySQL local

## Requisitos

- MySQL **8.0+** (probado en 9.6) con InnoDB y `utf8mb4_0900_ai_ci`.
- Una base `banana_escolar` y otra `banana_benchmark`.
- Usuario de aplicación con permisos sobre ambas.

## Opción A · MySQL instalado

```sql
CREATE DATABASE banana_escolar CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE banana_benchmark CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'banana_user'@'%' IDENTIFIED BY 'banana_pass';
GRANT ALL PRIVILEGES ON banana_escolar.* TO 'banana_user'@'%';
GRANT ALL PRIVILEGES ON banana_benchmark.* TO 'banana_user'@'%';
FLUSH PRIVILEGES;
```

Luego actualiza `DATABASE_URL` en `apps/api/.env` y `tools/etl/.env`, y
`BENCHMARK_DATABASE_URL` en `tools/benchmark/.env` (puerto real de tu instancia).

## Opción B · Docker (opcional)

```bash
cd infra/mysql
docker compose up -d
```

El contenedor expone `3306`, crea `banana_escolar`, `banana_benchmark` y el
usuario `banana_user` / `banana_pass`. Cambia las claves en un entorno real.

## Migraciones

```bash
pnpm db:deploy     # aplica migraciones existentes
pnpm db:migrate    # crea una migración nueva en desarrollo
pnpm db:seed       # catálogos y cuentas demo
```

La migración inicial incluye `FULLTEXT` sobre `reportes.descripcion` y una
restricción `CHECK` sobre `soluciones.descripcion`. La invariante
«en_proceso/completado requiere técnico» se valida en la API y el ETL porque
MySQL no permite un `CHECK` sobre `tecnico_id` con la acción `SET NULL` de su
clave foránea.
