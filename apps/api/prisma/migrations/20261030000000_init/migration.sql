-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `correo` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('ADMIN', 'TECNICO', 'USUARIO') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    INDEX `idx_usuarios_rol_activo`(`rol`, `activo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `categorias_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `reportes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `folio` VARCHAR(20) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NOT NULL,
    `tecnico_id` INTEGER NULL,
    `descripcion` TEXT NOT NULL,
    `ubicacion` VARCHAR(190) NOT NULL,
    `prioridad` ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media',
    `estado` ENUM('pendiente', 'en_proceso', 'completado') NOT NULL DEFAULT 'pendiente',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `asignado_en` DATETIME(3) NULL,

    UNIQUE INDEX `reportes_folio_key`(`folio`),
    INDEX `idx_reportes_cat_estado_fecha`(`categoria_id`, `estado`, `creado_en` DESC, `id` DESC),
    INDEX `idx_reportes_usuario_fecha`(`usuario_id`, `creado_en` DESC, `id` DESC),
    INDEX `idx_reportes_tecnico_estado`(`tecnico_id`, `estado`, `creado_en` DESC),
    INDEX `idx_reportes_estado_fecha`(`estado`, `creado_en` DESC),
    INDEX `idx_reportes_ubicacion`(`ubicacion`),
    FULLTEXT INDEX `idx_reportes_descripcion_fulltext`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `soluciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporte_id` INTEGER NOT NULL,
    `tecnico_id` INTEGER NOT NULL,
    `descripcion` TEXT NOT NULL,
    `observaciones` TEXT NULL,
    `resuelto_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `soluciones_reporte_id_key`(`reporte_id`),
    INDEX `idx_soluciones_tecnico_fecha`(`tecnico_id`, `resuelto_en` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `report_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporte_id` INTEGER NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(80) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `uploaded_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `report_attachments_storage_key_key`(`storage_key`),
    INDEX `idx_adjuntos_reporte`(`reporte_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `idx_refresh_usuario`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `folio_counters` (
    `year` INTEGER NOT NULL,
    `last_value` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `etl_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_id` VARCHAR(64) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `source_rows` INTEGER NOT NULL,
    `inserted_rows` INTEGER NOT NULL,
    `discarded_rows` INTEGER NOT NULL,
    `checksum` CHAR(64) NOT NULL,
    `report_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `etl_runs_run_id_key`(`run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `reportes` ADD CONSTRAINT `reportes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `reportes` ADD CONSTRAINT `reportes_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `reportes` ADD CONSTRAINT `reportes_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `soluciones` ADD CONSTRAINT `soluciones_reporte_id_fkey` FOREIGN KEY (`reporte_id`) REFERENCES `reportes`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `soluciones` ADD CONSTRAINT `soluciones_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `report_attachments` ADD CONSTRAINT `report_attachments_reporte_id_fkey` FOREIGN KEY (`reporte_id`) REFERENCES `reportes`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `report_attachments` ADD CONSTRAINT `report_attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- Invariantes adicionales (MySQL 8.0.16+ aplica CHECK).
-- La invariante «en_proceso/completado requiere técnico» se valida en la API y en el ETL.
-- MySQL 9 no permite CHECK sobre tecnico_id por su acción referencial SET NULL.
ALTER TABLE `soluciones` ADD CONSTRAINT `chk_soluciones_descripcion` CHECK (CHAR_LENGTH(`descripcion`) > 0);
