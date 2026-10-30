-- Se ejecuta solo al inicializar el contenedor por primera vez.
-- La base principal banana_escolar y banana_user los crea la imagen oficial
-- mediante MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD.

CREATE DATABASE IF NOT EXISTS banana_benchmark
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON banana_benchmark.* TO 'banana_user'@'%';
FLUSH PRIVILEGES;
