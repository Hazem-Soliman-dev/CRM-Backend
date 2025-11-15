-- ============================================
-- Migration: Add Missing Tables & Columns
-- Description: Creates activities, attendance, user_preferences, audit_log tables
--              and adds missing columns to existing tables
-- ============================================

-- Create departments table
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT,
  `manager_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create activities table
CREATE TABLE IF NOT EXISTS `activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_id` VARCHAR(50) UNIQUE NOT NULL,
  `entity_type` ENUM('customer', 'lead', 'reservation', 'support_ticket', 'user', 'attendance') NOT NULL,
  `entity_id` VARCHAR(50) NOT NULL,
  `activity_type` ENUM('created', 'updated', 'deleted', 'status_changed', 'assigned', 'commented', 'message_sent') NOT NULL,
  `description` TEXT NOT NULL,
  `details` JSON,
  `performed_by_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`performed_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_entity` (`entity_type`, `entity_id`),
  INDEX `idx_performed_by` (`performed_by_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_entity_id` (`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create attendance table
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `check_in_time` TIME,
  `check_out_time` TIME,
  `status` ENUM('Present', 'Absent', 'Late', 'Half Day', 'Leave') DEFAULT 'Present',
  `remarks` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_attendance` (`employee_id`, `date`),
  INDEX `idx_date` (`date`),
  INDEX `idx_employee_date` (`employee_id`, `date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `theme` ENUM('light', 'dark') DEFAULT 'light',
  `language` VARCHAR(10) DEFAULT 'en',
  `timezone` VARCHAR(50) DEFAULT 'UTC',
  `notification_email` BOOLEAN DEFAULT TRUE,
  `notification_sms` BOOLEAN DEFAULT FALSE,
  `notification_in_app` BOOLEAN DEFAULT TRUE,
  `items_per_page` INT DEFAULT 10,
  `preferences` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit_log table
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `action` VARCHAR(255) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) NOT NULL,
  `old_values` JSON,
  `new_values` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_entity` (`entity_type`, `entity_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add missing columns to reservations table
ALTER TABLE `reservations`
ADD COLUMN IF NOT EXISTS `cancellation_reason` VARCHAR(255),
ADD COLUMN IF NOT EXISTS `reservation_notes` LONGTEXT;

-- Add missing columns to customers table if not exists
ALTER TABLE `customers`
ADD COLUMN IF NOT EXISTS `total_spent` DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS `last_contact_date` DATETIME,
ADD COLUMN IF NOT EXISTS `customer_lifetime_value` DECIMAL(10, 2) DEFAULT 0;

-- Add missing columns to leads table if not exists
ALTER TABLE `leads`
ADD COLUMN IF NOT EXISTS `converted_to_customer_id` INT,
ADD COLUMN IF NOT EXISTS `converted_at` DATETIME,
ADD COLUMN IF NOT EXISTS `close_reason` VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS `idx_customers_status` ON `customers`(`status`);
CREATE INDEX IF NOT EXISTS `idx_customers_type` ON `customers`(`type`);
CREATE INDEX IF NOT EXISTS `idx_customers_created_at` ON `customers`(`created_at`);
CREATE INDEX IF NOT EXISTS `idx_leads_status` ON `leads`(`status`);
CREATE INDEX IF NOT EXISTS `idx_leads_agent_id` ON `leads`(`agent_id`);
CREATE INDEX IF NOT EXISTS `idx_leads_created_at` ON `leads`(`created_at`);
CREATE INDEX IF NOT EXISTS `idx_reservations_customer_id` ON `reservations`(`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_reservations_status` ON `reservations`(`status`);
CREATE INDEX IF NOT EXISTS `idx_reservations_created_at` ON `reservations`(`created_at`);
CREATE INDEX IF NOT EXISTS `idx_payments_customer_id` ON `payments`(`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_payments_status` ON `payments`(`payment_status`);
CREATE INDEX IF NOT EXISTS `idx_payments_date` ON `payments`(`payment_date`);

-- Create view for customer activity summary (optional, helps with reporting)
CREATE OR REPLACE VIEW `v_customer_activity_summary` AS
SELECT 
  c.id,
  c.customer_id,
  c.name,
  COUNT(DISTINCT a.id) as total_activities,
  MAX(a.created_at) as last_activity_date,
  COUNT(DISTINCT r.id) as total_reservations,
  COUNT(DISTINCT p.id) as total_payments,
  COALESCE(SUM(p.amount), 0) as total_paid
FROM `customers` c
LEFT JOIN `activities` a ON a.entity_type = 'customer' AND a.entity_id = c.id
LEFT JOIN `reservations` r ON r.customer_id = c.id
LEFT JOIN `payments` p ON p.customer_id = c.id AND p.payment_status = 'Completed'
GROUP BY c.id, c.customer_id, c.name;

-- Create view for lead pipeline (helps with reporting)
CREATE OR REPLACE VIEW `v_lead_pipeline` AS
SELECT 
  `status`,
  COUNT(*) as count,
  COUNT(CASE WHEN `agent_id` IS NOT NULL THEN 1 END) as assigned,
  COALESCE(SUM(`value`), 0) as total_value,
  COALESCE(AVG(`value`), 0) as avg_value
FROM `leads`
GROUP BY `status`;

-- Sample data insertion script (commented out - uncomment to use)
-- INSERT INTO `user_preferences` (`user_id`, `theme`, `language`, `timezone`) 
-- VALUES (1, 'light', 'en', 'America/New_York')
-- ON DUPLICATE KEY UPDATE `updated_at` = NOW();

