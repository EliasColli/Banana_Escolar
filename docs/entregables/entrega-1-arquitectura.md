# Entrega 1 · Mapa de datos y arquitectura

## Artefactos

| Requisito | Dónde |
|---|---|
| Inventario de entidades y frecuencia | Este documento, sección 1 |
| Escenarios de crecimiento y riesgos | `docs/architecture/README.md` §6 |
| Comparación MySQL vs MongoDB | `docs/architecture/README.md` §8 |
| Diagrama de monorepo | `docs/architecture/README.md` §2 |
| Diagrama de despliegue | `docs/architecture/README.md` §7 |
| ERD y diccionario | `docs/database/modelo-datos.md` |
| Seguridad y almacenamiento | `docs/api/README.md`, `infra/storage/README.md` |
| Código base | `apps/api`, `apps/web`, `apps/mobile` |

## 1. Inventario de entidades

| Entidad | Campos clave | Frecuencia de actualización | Volumen inicial |
|---|---|---|---|
| Usuarios | nombre, correo, rol, activo | Baja (altas/bajas) | 210 |
| Categorías | nombre | Muy baja (catálogo) | 7 |
| Reportes | folio, descripción, ubicación, prioridad, estado | Alta (creación y cambios de estado) | 10,000 |
| Soluciones | descripción, observaciones, resuelto_en | Media (al completar) | 8,099 |
| Adjuntos | storage_key, mime, tamaño | Baja | 0 en seed |
| Refresh tokens | hash, expiración, revocación | Media (cada login/refresh) | Variable |
| Folio counters | año, último valor | Alta (cada creación) | 1 por año |
| ETL runs | checksum, conteos, JSON | Por ejecución del ETL | 1+ |

## 2. Reglas e invariantes

Ver `docs/database/modelo-datos.md` §3. Destacan folio único transaccional,
solución 1:1, técnico obligatorio en proceso/completado y RBAC por fila.

## 3. Arquitectura

Monolito modular NestJS + SPA React + Flutter + MySQL. Web/móvil solo hablan con
la API; el ETL es un job interno. El detalle, los diagramas Mermaid y las
decisiones de seguridad están en `docs/architecture/README.md`.

## 4. Crecimiento

- 1M de reportes: índice compuesto validado en benchmark; evaluar cursor.
- Multiescuela: añadir `escuela_id` y filtros obligatorios.
- Búsqueda de subcadenas a gran escala: motor externo, no forzar `LIKE`.
- Múltiples réplicas de API: storage S3 obligatorio.

## 5. Checklist de la entrega

- [x] Entidades y frecuencias documentadas.
- [x] ERD Mermaid y diccionario MySQL.
- [x] Comparación MySQL vs MongoDB actualizada.
- [x] Decisiones de seguridad, roles e imágenes.
- [x] Arquitectura de monorepo y despliegue.
- [x] Capturas web en `docs/evidence/` (login, historial, detalle, dashboard).
- [ ] Captura móvil y video de la demo.
