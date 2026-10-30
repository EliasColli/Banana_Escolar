# Almacenamiento de imágenes

Regla: **los binarios no se guardan en MySQL**. La API persiste metadatos en
`report_attachments` y el archivo en un almacenamiento privado.

## Desarrollo (`STORAGE_DRIVER=local`)

- Ruta base: `STORAGE_LOCAL_PATH=./.storage/uploads` (relativa a `apps/api`).
- Clave: `reports/{reportId}/{uuid}.{jpg|png|webp}`.
- La carpeta está en `.gitignore` y no se sirve como estático: la descarga pasa
  por `GET /v1/reports/:id/attachments/:attachmentId` con autorización.

## Producción (S3 compatible)

1. Implementar un `S3StorageAdapter` que cumpla `StoragePort`
   (`save`, `read`, `delete`, `exists`).
2. Registrar el adaptador en `StorageModule` cuando `STORAGE_DRIVER=s3`.
3. Subir con clave privada y devolver URLs firmadas de corta duración o
   transmitir el archivo a través de la API.
4. Configurar retención, cifrado en reposo y limpieza de adjuntos huérfanos.

## Controles implementados

- Tipos permitidos: JPEG, PNG y WebP verificados por **magic bytes**, no solo
  por extensión o `Content-Type`.
- Tamaño máximo configurable (`MAX_UPLOAD_BYTES`, por defecto 5 MB).
- Una fotografía por reporte en el MVP (ampliable a 1:N).
- Nombre generado con UUID; nunca se usa el nombre aportado por el usuario.
- Autorización por rol/propiedad antes de subir o descargar.
