
CREATE DATABASE IF NOT EXISTS `medi_hora`
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `medi_hora`;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

