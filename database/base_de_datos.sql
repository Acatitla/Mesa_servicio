-- Crea la base de datos
CREATE DATABASE IF NOT EXISTS mesa_servicio;

-- Usa la base de datos recién creada
USE mesa_servicio;

-- Crea la tabla reportes
CREATE TABLE IF NOT EXISTS reportes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    calle VARCHAR(255) NOT NULL,
    no_exterior VARCHAR(50) NOT NULL,
    referencias VARCHAR(255),
    colonia VARCHAR(255) NOT NULL,
    solicitante VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    origen ENUM('suac', 'officio', 'dmu', 'emergencia', 'direccion', 'alcaldia', 'zeus') NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);