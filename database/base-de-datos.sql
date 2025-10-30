-- ========================================================================
-- ESQUEMA DE BASE DE DATOS MYSQL PARA SISTEMA UMA
-- Universidad María Auxiliadora - Sistema de Reclutamiento Docente
-- Base de datos: ConvocaDocente
-- Autor: Linder Revilla
-- ========================================================================

-- ========================================================================
-- 1. CONFIGURACIÓN DE BASE DE DATOS
-- ========================================================================
CREATE DATABASE IF NOT EXISTS ConvocaDocente
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ConvocaDocente;

-- ============================================================================
-- 1. TABLA DE USUARIOS
-- ============================================================================

CREATE TABLE usuarios (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('docente', 'director', 'decano', 'administrador') NOT NULL DEFAULT 'docente',
  cod_fac VARCHAR(1) DEFAULT NULL,
  cod_esp VARCHAR(2) DEFAULT NULL,
  estado TINYINT(1) DEFAULT 1 COMMENT '0=Inactivo, 1=Activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. FACULTADES
-- ============================================================================

CREATE TABLE facultades (
  cod_fac VARCHAR(1) PRIMARY KEY,
  nom_fac VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. ESPECIALIDADES
-- ============================================================================

CREATE TABLE especialidades (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cod_fac VARCHAR(1) NOT NULL,
  cod_esp VARCHAR(2) NOT NULL,
  nom_esp VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cod_fac, cod_esp),
  FOREIGN KEY (cod_fac) REFERENCES facultades(cod_fac) ON DELETE CASCADE
);

-- ============================================================================
-- 4. CURSOS
-- ============================================================================

CREATE TABLE cursos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  n_codper INT NOT NULL,
  c_codfac VARCHAR(1) NOT NULL,
  c_codesp VARCHAR(2) NOT NULL,
  c_codcur VARCHAR(10) NOT NULL,
  c_nomcur VARCHAR(150) NOT NULL,
  n_ciclo INT NOT NULL,  
  modalidad VARCHAR(20) DEFAULT 'presencial' COMMENT 'presencial, simipresencial, virtual',
  estado TINYINT(1) DEFAULT 0 COMMENT '0=Inactivo, 1=Activo para reclutamiento',
  user_id INT DEFAULT NULL COMMENT 'Director que habilita',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (n_codper, c_codfac, c_codesp, c_codcur),
  FOREIGN KEY (c_codfac) REFERENCES facultades(cod_fac) ON DELETE CASCADE,
  FOREIGN KEY (c_codfac, c_codesp) REFERENCES especialidades(cod_fac, cod_esp) ON DELETE CASCADE
);

-- ============================================================================
-- 5. PERFIL PERSONAL DEL DOCENTE
-- ============================================================================

CREATE TABLE perfil_personal (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  dni VARCHAR(20) NOT NULL UNIQUE,
  fecha_nacimiento DATE,
  genero VARCHAR(20),
  nacionalidad VARCHAR(50),
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(255),
  cv_archivo VARCHAR(255) COMMENT 'Ruta del archivo CV (uploads/cv/)',
  completado TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================================
-- 6. FORMACIÓN ACADÉMICA
-- ============================================================================

CREATE TABLE formacion_academica (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- Bachiller, Título, Maestría, Doctorado
  especialidad VARCHAR(200) NOT NULL,
  institucion VARCHAR(200) NOT NULL,
  pais VARCHAR(100) NOT NULL,
  fecha_obtencion DATE,
  documento_archivo VARCHAR(255) COMMENT 'Ruta del archivo del documento (uploads/formacion/)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================================
-- 7. EXPERIENCIA LABORAL
-- ============================================================================

CREATE TABLE experiencia_laboral (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pais VARCHAR(100) NOT NULL,
  sector VARCHAR(20) NOT NULL,
  empresa VARCHAR(200) NOT NULL COMMENT 'Nombre de la empresa u organización', 
  ruc VARCHAR(11) DEFAULT NULL COMMENT 'RUC de la empresa (opcional)', 
  cargo VARCHAR(150) NOT NULL COMMENT 'Cargo desempeñado',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE DEFAULT NULL,
  actual TINYINT(1) DEFAULT 0 COMMENT '1=Actualmente trabajando aquí',
  constancia_archivo VARCHAR(255) COMMENT 'Ruta del archivo de la constancia (uploads/experiencia/)',
  sin_experiencia TINYINT(1) DEFAULT 0 COMMENT '1=El docente declara no tener experiencia laboral',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. DISPONIBILIDAD HORARIA
-- ============================================================================

CREATE TABLE docente_horarios (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  dia VARCHAR(20) NOT NULL COMMENT 'Ej: Lunes, Martes, Sábado',
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================================================
-- 9. POSTULACIÓN A CURSOS (docente → cursos habilitados)
-- ============================================================================

CREATE TABLE docente_cursos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  curso_id INT NOT NULL COMMENT 'Curso al que postula',  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
);

-- ============================================================================
-- 10. POSTULACIONES QUE EL DIRECTOR DEBE EVALUAR
-- ============================================================================
CREATE TABLE postulaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT 'Docente que postula',
  cod_fac VARCHAR(1) NOT NULL COMMENT 'Facultad a la que postula',
  cod_esp VARCHAR(2) NOT NULL COMMENT 'Especialidad a la que postula',  
  estado ENUM('PENDIENTE', 'EVALUANDO', 'APROBADO', 'RECHAZADO') DEFAULT 'PENDIENTE',
  mensaje_entrevista TEXT DEFAULT NULL COMMENT 'Mensaje del director al docente solo si es APROBADO',
  evaluacion_director INT DEFAULT NULL COMMENT 'ID del director que evalúa',     
  fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_fac FOREIGN KEY (cod_fac) REFERENCES facultades(cod_fac) ON DELETE CASCADE,
  CONSTRAINT fk_post_esp FOREIGN KEY (cod_fac, cod_esp) REFERENCES especialidades(cod_fac, cod_esp) ON DELETE CASCADE,
  CONSTRAINT fk_post_evaluador FOREIGN KEY (evaluacion_director) REFERENCES usuarios(id) ON DELETE SET NULL,

  UNIQUE KEY unique_postulacion (user_id, cod_fac, cod_esp)
);



-- ============================================================================
-- 11. DATOS DE PRUEBA (FACULTADES, USUARIOS)
-- ============================================================================

INSERT INTO facultades (cod_fac, nom_fac) VALUES
('E', 'INGENIERÍA Y NEGOCIOS'),
('S', 'CIENCIAS DE LA SALUD');

INSERT INTO especialidades (cod_fac, cod_esp, nom_esp) VALUES
('E', 'E1', 'ADMINISTRACIÓN DE NEGOCIOS INTERNACIONALES'),
('E', 'E2', 'ADMINISTRACIÓN Y MARKETING'),
('E', 'E3', 'CONTABILIDAD Y FINANZAS'),
('S', 'S1', 'ENFERMERÍA'),
('S', 'S2', 'FARMACIA Y BIOQUÍMICA'),
('S', 'S3', 'NUTRICIÓN Y DIETÉTICA'),
('S', 'S4', 'PSICOLOGÍA');

INSERT INTO usuarios (email, password, rol, cod_fac, cod_esp) VALUES
('admin@uma.edu.pe', '$2y$10$rwezfp0i92QreNKa0.CO7uX3dcbDcjxh7R7EufQueMxotFJNuK7bq', 'administrador', NULL, NULL),
('decano.ingenieria@uma.edu.pe', '$2y$10$rwezfp0i92QreNKa0.CO7uX3dcbDcjxh7R7EufQueMxotFJNuK7bq', 'decano', 'E', NULL),
('decano.salud@uma.edu.pe', '$2y$10$rwezfp0i92QreNKa0.CO7uX3dcbDcjxh7R7EufQueMxotFJNuK7bq', 'decano', 'S', NULL),
('director.negocios@uma.edu.pe', '$2y$10$rwezfp0i92QreNKa0.CO7uX3dcbDcjxh7R7EufQueMxotFJNuK7bq', 'director', 'E', 'E1'),
('director.enfermeria@uma.edu.pe', '$2y$10$rwezfp0i92QreNKa0.CO7uX3dcbDcjxh7R7EufQueMxotFJNuK7bq', 'director', 'S', 'S1'),
('docente1@uma.edu.pe', '$2y$10$rwezfp0i92QreNKa0.CO7uX3dcbDcjxh7R7EufQueMxotFJNuK7bq', 'docente', NULL, NULL);

INSERT INTO cursos (n_codper, c_codfac, c_codesp, c_codcur, c_nomcur, n_ciclo, modalidad, estado, user_id) VALUES
(20231, 'E', 'E1', 'ADM101', 'Introducción a la Administración', 1, 'presencial', 1, 1),
(20231, 'E', 'E1', 'MKT101', 'Fundamentos de Marketing', 1, 'presencial', 1, 4),
(20231, 'S', 'S1', 'ENF101', 'Anatomía Humana', 1, 'presencial', 1, 5),
(20231, 'S', 'S1', 'ENF102', 'Fisiología Humana', 1, 'presencial', 1, 5),
(20231, 'S', 'S2', 'QUI302', 'QUÍMICA GENERAL', 2, 'presencial', 0, NULL),
(2025, 'S', 'S2', 'FAR201', 'FARMACOLOGÍA GENERAL', 2, 'presencial', 0, NULL),
(2025, 'S', 'S2', 'BIO101', 'BIOQUÍMICA CLÍNICA', 2, 'presencial', 0, NULL);