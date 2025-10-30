### server 端
- 环境配置 ：npm install 即可
- 数据库配置 ：需要本地配置mysql数据库，配置相关
```
mysql  Ver 8.0.42 for Win64 on x86_64 (MySQL Community Server - GPL)
我的shema叫information
创建的表：
experience
CREATE TABLE `information`.`experience` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(50) NOT NULL,
  `summary` TEXT NOT NULL,
  `confidence` FLOAT DEFAULT NULL,
  `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `information`.`profile` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  avatar VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  gender VARCHAR(10) DEFAULT NULL COMMENT '性别：男/女/其他',
  birthday DATE DEFAULT NULL COMMENT '出生日期',
  political_status VARCHAR(50) DEFAULT NULL COMMENT '政治面貌',
  education VARCHAR(50) DEFAULT NULL COMMENT '学历',
  graduation_year INT DEFAULT NULL COMMENT '毕业年份',
  school VARCHAR(200) DEFAULT NULL COMMENT '毕业院校',
  gpa DECIMAL(3,2) DEFAULT NULL COMMENT 'GPA，如3.8',
  phone VARCHAR(20) NOT NULL COMMENT '手机号',
  email VARCHAR(100) DEFAULT NULL COMMENT '邮箱地址',
  address TEXT DEFAULT NULL COMMENT '居住地址',
  intro TEXT DEFAULT NULL COMMENT '个人简介',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY unique_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';

用以下代码创建appuser用户，'Strong!Passw0rd'是密码可以改成'123456'
-- 在 MySQL Workbench 里，打开 SQL 编辑器，粘贴执行
CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'Strong!Passw0rd';
CREATE USER IF NOT EXISTS 'appuser'@'127.0.0.1' IDENTIFIED BY 'Strong!Passw0rd';

ALTER USER 'appuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Strong!Passw0rd';
ALTER USER 'appuser'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'Strong!Passw0rd';

GRANT ALL PRIVILEGES ON information.* TO 'appuser'@'localhost';
GRANT ALL PRIVILEGES ON information.* TO 'appuser'@'127.0.0.1';

FLUSH PRIVILEGES;

```
- 启动服务 ：node index.js