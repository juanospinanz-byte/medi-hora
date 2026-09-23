-- Script de Inicialización de Base de Datos para Medi-Hora
-- ==============================================================================
-- Este script crea la base de datos y la estructura de tablas necesarias
-- para el funcionamiento de la aplicación.
-- Compatible con MySQL Workbench.
-- ==============================================================================

-- 1. CREACIÓN DEL ESQUEMA
-- Comprobamos si la base de datos existe para evitar errores, y luego la creamos
CREATE DATABASE IF NOT EXISTS `medi_hora`
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Seleccionamos la base de datos recién creada o existente
USE `medi_hora`;

-- ==============================================================================
-- 2. CREACIÓN DE TABLAS

-- Tabla de Usuarios
-- Almacena la información de autenticación de los usuarios principales
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Perfiles
-- Almacena los perfiles asociados a un usuario (adulto mayor, niño, adulto)
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  photo MEDIUMTEXT,
  birthdate DATE NOT NULL,
  type ENUM('adulto mayor', 'niño', 'adulto') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Medicamentos / Recordatorios de Dosis
-- Almacena las dosis programadas para cada perfil familiar
CREATE TABLE IF NOT EXISTS medications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  profile_id INT NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dose VARCHAR(100) NOT NULL,
  frequency_type ENUM('diaria', 'semanal', 'dias_alternos', 'cada_x_horas', 'dias_especificos') NOT NULL,
  frequency_value VARCHAR(255) NULL,
  times JSON NOT NULL,
  start_date DATE NOT NULL,
  photo MEDIUMTEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 3. DATOS DE PRUEBA (SEED DATA)
-- Descomentar las siguientes líneas si se desea insertar datos de prueba iniciales.

-- INSERT INTO users (email, password) VALUES ('admin@medi-hora.com', '$2b$10$YourHashedPasswordHere');
-- SET @last_user_id = LAST_INSERT_ID();
-- INSERT INTO profiles (user_id, name, birthdate, type) VALUES (@last_user_id, 'Admin User', '1980-01-01', 'adulto');

