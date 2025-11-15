-- ============================================
-- Migration: Add Sales Case Enhancements
-- Description: Adds case_type, quotation_status columns and junction tables
--              for linked items and assigned departments
-- ============================================

-- Check and add case_type column (MySQL compatible)
SET @dbname = DATABASE();
SET @tablename = 'sales_cases';
SET @columnname = 'case_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(\'B2C\', \'B2B\') DEFAULT \'B2C\' AFTER `status`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add quotation_status column (MySQL compatible)
SET @columnname = 'quotation_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(\'Draft\', \'Sent\', \'Accepted\', \'Rejected\') DEFAULT \'Draft\' AFTER `case_type`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create junction table for linked items (many-to-many relationship)
CREATE TABLE IF NOT EXISTS `sales_case_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sales_case_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sales_case_id`) REFERENCES `sales_cases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_case_item` (`sales_case_id`, `item_id`),
  INDEX `idx_sales_case_id` (`sales_case_id`),
  INDEX `idx_item_id` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create junction table for assigned departments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS `sales_case_departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sales_case_id` INT NOT NULL,
  `department_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sales_case_id`) REFERENCES `sales_cases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_case_department` (`sales_case_id`, `department_id`),
  INDEX `idx_sales_case_id` (`sales_case_id`),
  INDEX `idx_department_id` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

