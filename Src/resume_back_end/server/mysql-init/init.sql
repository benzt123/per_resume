-- Initial schema for per_resume

CREATE DATABASE IF NOT EXISTS per_resume_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE per_resume_db;

-- profile table
CREATE TABLE IF NOT EXISTS profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  avatar VARCHAR(512) DEFAULT NULL,
  name VARCHAR(128) NOT NULL,
  gender VARCHAR(32) DEFAULT NULL,
  birthday DATE DEFAULT NULL,
  political_status VARCHAR(64) DEFAULT NULL,
  education VARCHAR(128) DEFAULT NULL,
  graduation_year INT DEFAULT NULL,
  school VARCHAR(256) DEFAULT NULL,
  gpa DECIMAL(4,2) DEFAULT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(128) DEFAULT NULL,
  address VARCHAR(256) DEFAULT NULL,
  intro TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- experience table
CREATE TABLE IF NOT EXISTS experience (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(256) NOT NULL,
  summary TEXT NOT NULL,
  confidence DOUBLE DEFAULT NULL,
  created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- optional: insert a sample profile
INSERT INTO profile (name, phone, email) 
VALUES ('示例用户', '13800000000', 'example@example.com')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- optional: insert a sample experience
INSERT INTO experience (category, summary, confidence) VALUES ('项目经验', '参与示例项目，负责前端开发', 0.9);
