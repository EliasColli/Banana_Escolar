-- Esquema de laboratorio para el benchmark (base banana_benchmark).
-- Deliberadamente SIN índices secundarios: se crean durante el benchmark
-- para medir el antes/después. Solo PK y UNIQUE(folio) son estructurales.

CREATE TABLE IF NOT EXISTS categorias (
  id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reportes (
  id INT NOT NULL AUTO_INCREMENT,
  folio VARCHAR(24) NOT NULL,
  categoria_id INT NOT NULL,
  estado ENUM('pendiente', 'en_proceso', 'completado') NOT NULL,
  prioridad ENUM('baja', 'media', 'alta') NOT NULL,
  descripcion TEXT NOT NULL,
  ubicacion VARCHAR(190) NOT NULL,
  creado_en DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reportes_folio (folio)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
