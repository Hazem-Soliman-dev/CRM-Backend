-- Travel CRM Database Schema
-- MySQL Database Schema for Travel CRM System

CREATE DATABASE IF NOT EXISTS travel_crm;
USE travel_crm;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'manager', 'agent', 'customer') NOT NULL DEFAULT 'customer',
    department VARCHAR(100),
    avatar_url VARCHAR(500),
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(255),
    type ENUM('Individual', 'Corporate') NOT NULL DEFAULT 'Individual',
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    contact_method ENUM('Email', 'Phone', 'SMS') DEFAULT 'Email',
    assigned_staff_id INT,
    total_bookings INT DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0.00,
    last_trip DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Leads table
CREATE TABLE leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(255),
    source ENUM('Website', 'Social Media', 'Email', 'Walk-in', 'Referral') NOT NULL,
    type ENUM('B2B', 'B2C') NOT NULL,
    status ENUM('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost') DEFAULT 'New',
    agent_id INT,
    value DECIMAL(10,2),
    notes TEXT,
    last_contact TIMESTAMP NULL,
    next_followup TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Suppliers table
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    services TEXT,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    supplier_id INT,
    service_type ENUM('Flight', 'Hotel', 'Car Rental', 'Tour', 'Package', 'Other') NOT NULL,
    destination VARCHAR(255) NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE,
    adults INT NOT NULL DEFAULT 1,
    children INT DEFAULT 0,
    infants INT DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') DEFAULT 'Pending',
    payment_status ENUM('Pending', 'Partial', 'Paid', 'Refunded') DEFAULT 'Pending',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(20) UNIQUE NOT NULL,
    booking_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Other') NOT NULL,
    payment_status ENUM('Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded') DEFAULT 'Pending',
    transaction_id VARCHAR(255),
    payment_date DATE NOT NULL,
    due_date DATE,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Support Tickets table
CREATE TABLE support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
    assigned_to INT,
    created_by INT NOT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Support Ticket Notes table
CREATE TABLE support_ticket_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    note TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Sales Cases table
CREATE TABLE sales_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    lead_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Open', 'In Progress', 'Quoted', 'Won', 'Lost') DEFAULT 'Open',
    value DECIMAL(10,2),
    probability INT DEFAULT 0,
    expected_close_date DATE,
    assigned_to INT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Property Owners table
CREATE TABLE property_owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    primary_contact VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    status ENUM('Active', 'Onboarding', 'Dormant') DEFAULT 'Active',
    portfolio_size INT DEFAULT 0,
    locations TEXT,
    manager_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Properties table
CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id VARCHAR(20) UNIQUE NOT NULL,
    owner_id INT,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    property_type ENUM('Apartment', 'Villa', 'Commercial', 'Land') NOT NULL,
    status ENUM('Available', 'Reserved', 'Sold', 'Under Maintenance') DEFAULT 'Available',
    nightly_rate DECIMAL(10,2) DEFAULT 0.00,
    capacity INT DEFAULT 0,
    occupancy INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES property_owners(id) ON DELETE SET NULL
);

-- Property Availability table
CREATE TABLE property_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Available', 'Reserved', 'Unavailable') DEFAULT 'Available',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_property_date (property_id, date)
);

-- Operations Trips table
CREATE TABLE operations_trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_code VARCHAR(20) UNIQUE NOT NULL,
    booking_reference VARCHAR(20),
    customer_name VARCHAR(255) NOT NULL,
    customer_count INT DEFAULT 1,
    itinerary VARCHAR(255),
    duration VARCHAR(50),
    start_date DATE,
    end_date DATE,
    destinations JSON,
    assigned_guide VARCHAR(255),
    assigned_driver VARCHAR(255),
    transport VARCHAR(255),
    transport_details VARCHAR(255),
    status ENUM('Planned', 'In Progress', 'Issue', 'Completed') DEFAULT 'Planned',
    special_requests TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Operations Optional Services table
CREATE TABLE operations_optional_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(20) UNIQUE NOT NULL,
    trip_id INT NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0.00,
    added_by VARCHAR(255),
    added_date DATE,
    status ENUM('Added', 'Confirmed', 'Cancelled') DEFAULT 'Added',
    invoiced TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES operations_trips(id) ON DELETE CASCADE
);

-- Operations Tasks table
CREATE TABLE operations_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(20) UNIQUE NOT NULL,
    trip_id INT NULL,
    title VARCHAR(255) NOT NULL,
    trip_reference VARCHAR(50),
    customer_name VARCHAR(255),
    scheduled_at DATETIME,
    location VARCHAR(255),
    assigned_to INT,
    status ENUM('Pending', 'In Progress', 'Completed', 'Delayed') DEFAULT 'Pending',
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    task_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES operations_trips(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    type ENUM('lead', 'customer', 'booking', 'payment', 'support', 'system', 'task') DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System Settings table
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id VARCHAR(50) NOT NULL UNIQUE,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    default_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    default_language VARCHAR(5) NOT NULL DEFAULT 'en',
    pipeline_mode ENUM('standard', 'enterprise', 'custom') DEFAULT 'standard',
    pipeline_name VARCHAR(255),
    lead_alerts TINYINT(1) DEFAULT 1,
    ticket_updates TINYINT(1) DEFAULT 0,
    daily_digest TINYINT(1) DEFAULT 1,
    task_reminders TINYINT(1) DEFAULT 1,
    compact_mode TINYINT(1) DEFAULT 0,
    high_contrast TINYINT(1) DEFAULT 0,
    theme ENUM('light', 'dark') DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Items table
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    supplier_id INT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    status ENUM('Active', 'Inactive', 'Discontinued') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Attendance table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP NULL,
    break_start TIMESTAMP NULL,
    break_end TIMESTAMP NULL,
    total_hours DECIMAL(4,2) DEFAULT 0.00,
    status ENUM('Present', 'Absent', 'Late', 'Half Day') DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leave Requests table
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    leave_type ENUM('Sick', 'Vacation', 'Personal', 'Emergency', 'Other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    reason TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_assigned_staff ON customers(assigned_staff_id);
CREATE INDEX idx_leads_agent ON leads(agent_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_reservations_customer ON reservations(customer_id);
CREATE INDEX idx_reservations_supplier ON reservations(supplier_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(clock_in);
CREATE INDEX idx_property_availability_property ON property_availability(property_id);
CREATE INDEX idx_property_availability_date ON property_availability(date);
CREATE INDEX idx_property_owners_manager ON property_owners(manager_id);

-- Insert default admin user
INSERT INTO users (email, password, full_name, role, status) VALUES 
('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', 'active');

-- Insert sample data
INSERT INTO users (email, password, full_name, role, department, status) VALUES 
('manager@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Manager', 'manager', 'Management', 'active'),
('agent@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane Agent', 'agent', 'Sales', 'active'),
('customer@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob Customer', 'customer', NULL, 'active');

-- Insert sample property owners
INSERT INTO property_owners (owner_id, company_name, primary_contact, email, phone, status, portfolio_size, locations) VALUES
('OWN-1001', 'Nile River Estates', 'Sara Hamed', 'sara.hamed@nileriverestates.com', '+20 100 123 4567', 'Active', 42, 'Cairo,Giza,Aswan'),
('OWN-1002', 'Red Sea Properties', 'Mohamed Abdel', 'mohamed@redseaproperties.com', '+20 122 987 6543', 'Onboarding', 28, 'Hurghada,Sharm El Sheikh'),
('OWN-1003', 'Desert Retreat Holdings', 'Lina Farouk', 'lina@desertretreat.com', '+20 155 222 8899', 'Active', 17, 'Siwa,Bahariya'),
('OWN-1004', 'Historic Cairo Trust', 'Omnia Saleh', 'omnia@historictrust.org', '+20 114 765 4321', 'Dormant', 9, 'Old Cairo');

-- Insert sample properties
INSERT INTO properties (property_id, owner_id, name, location, property_type, status, nightly_rate, capacity, occupancy, description)
VALUES
('PROP-2101', (SELECT id FROM property_owners WHERE owner_id = 'OWN-1001'), 'Luxor Riverside Villa', 'Luxor, Egypt', 'Villa', 'Available', 420.00, 6, 68, 'Premium riverside villa with private dock'),
('PROP-2102', (SELECT id FROM property_owners WHERE owner_id = 'OWN-1004'), 'Downtown Cairo Loft', 'Cairo, Egypt', 'Apartment', 'Reserved', 180.00, 3, 82, 'Modern loft near Tahrir Square'),
('PROP-2103', (SELECT id FROM property_owners WHERE owner_id = 'OWN-1002'), 'Red Sea Dive Lodge', 'Hurghada, Egypt', 'Commercial', 'Under Maintenance', 520.00, 12, 74, 'Beachfront dive lodge with private marina'),
('PROP-2104', (SELECT id FROM property_owners WHERE owner_id = 'OWN-1003'), 'Siwa Desert Camp', 'Siwa Oasis, Egypt', 'Land', 'Available', 260.00, 10, 59, 'Eco-friendly desert glamping experience');

-- Insert sample operations trips
INSERT INTO operations_trips (trip_code, booking_reference, customer_name, customer_count, itinerary, duration, start_date, end_date, destinations, assigned_guide, assigned_driver, transport, transport_details, status, special_requests, notes)
VALUES
('OP-2025-012', 'BK-2025-012', 'Ahmed Hassan', 2, 'Luxor - Aswan', '4 days', '2025-01-15', '2025-01-18', JSON_ARRAY('Valley of Kings', 'Karnak Temple', 'Philae Temple'), 'Ahmed (Guide)', 'Mahmoud (Driver)', 'AC Minibus', 'Toyota Hiace, 14 seats', 'In Progress', 'Vegetarian meals, early morning pickup', 'Customer prefers historical sites'),
('OP-2025-013', 'BK-2025-013', 'Cairo Tours Ltd', 15, 'Cairo City Tour', '1 day', '2025-01-20', '2025-01-20', JSON_ARRAY('Pyramids', 'Egyptian Museum', 'Khan El Khalili'), 'Fatma (Tour Leader)', 'Hassan (Driver)', 'AC Bus (45 seats)', 'Mercedes Sprinter, Group transport', 'Planned', 'Group lunch at traditional restaurant', 'Corporate group, professional service required'),
('OP-2025-014', 'BK-2025-014', 'Maria Rodriguez', 3, 'Hurghada Diving', '3 days', '2025-01-22', '2025-01-24', JSON_ARRAY('Red Sea', 'Coral Reefs', 'Giftun Island'), 'Omar (Dive Guide)', 'Ali (Captain)', 'Diving Boat', 'Speedboat with diving equipment', 'Issue', 'Beginner divers, safety priority', 'Weather conditions need monitoring'),
('OP-2025-015', 'BK-2025-015', 'Global Travel Co', 8, 'Nile Cruise', '4 days', '2025-01-25', '2025-01-28', JSON_ARRAY('Luxor', 'Edfu', 'Kom Ombo', 'Aswan'), 'Nour (Cruise Rep)', 'Ahmed (Guide)', 'Nile Cruise Ship', 'MS Nile Princess, Deluxe cabin', 'Planned', 'Corporate group, connecting cabins', 'VIP service required'),
('OP-2025-016', 'BK-2025-016', 'John Smith', 2, 'Desert Safari', '2 days', '2025-01-30', '2025-01-31', JSON_ARRAY('White Desert', 'Bahariya Oasis'), 'Khaled (Safari Guide)', 'Mostafa (4WD Driver)', '4WD Jeep', 'Toyota Land Cruiser, Camping equipment', 'Completed', 'Honeymoon couple, romantic setup', 'Excellent feedback received');

-- Insert sample optional services
INSERT INTO operations_optional_services (service_code, trip_id, service_name, category, price, added_by, added_date, status, invoiced)
VALUES
('OPT-001', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-012'), 'Camel Ride', 'Activity', 50.00, 'Ahmed (Guide)', '2025-01-15', 'Added', 0),
('OPT-002', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-012'), 'Sound & Light Show', 'Entertainment', 30.00, 'Ahmed (Guide)', '2025-01-15', 'Added', 0),
('OPT-003', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-014'), 'Underwater Photos', 'Photography', 40.00, 'Omar (Dive Guide)', '2025-01-15', 'Added', 0),
('OPT-004', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-015'), 'Spa Package', 'Wellness', 120.00, 'Nour (Cruise Rep)', '2025-01-15', 'Added', 0),
('OPT-005', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-015'), 'Wine Tasting', 'Dining', 60.00, 'Nour (Cruise Rep)', '2025-01-15', 'Added', 0),
('OPT-006', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-016'), 'Stargazing Experience', 'Activity', 25.00, 'Khaled (Safari Guide)', '2025-01-14', 'Added', 0);

INSERT INTO operations_tasks (task_id, trip_id, title, trip_reference, customer_name, scheduled_at, location, assigned_to, status, priority, task_type, notes)
VALUES
('TASK-001', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-012'), 'Pickup Ahmed Hassan', 'OP-2025-012', 'Ahmed Hassan', '2025-01-15 08:00:00', 'Luxor Hotel', (SELECT id FROM users WHERE email = 'manager@example.com'), 'Pending', 'High', 'Pickup', 'Early morning pickup requested'),
('TASK-002', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-012'), 'Valley of Kings Tour', 'OP-2025-012', 'Ahmed Hassan', '2025-01-15 10:00:00', 'Valley of Kings', (SELECT id FROM users WHERE email = 'agent@example.com'), 'In Progress', 'Medium', 'Tour', 'Guide Ahmed leading 2 pax tour'),
('TASK-003', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-014'), 'Diving Trip Departure', 'OP-2025-014', 'Maria Rodriguez', '2025-01-16 14:00:00', 'Hurghada Marina', (SELECT id FROM users WHERE email = 'agent@example.com'), 'Delayed', 'High', 'Activity', 'Weather conditions being monitored'),
('TASK-004', (SELECT id FROM operations_trips WHERE trip_code = 'OP-2025-015'), 'Confirm Accommodation', 'OP-2025-015', 'Global Travel Co', '2025-01-17 09:30:00', 'Luxor Cruise Terminal', (SELECT id FROM users WHERE email = 'manager@example.com'), 'Completed', 'Medium', 'Logistics', 'Cabins prepared, VIP amenities confirmed');

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read)
VALUES
((SELECT id FROM users WHERE email = 'agent@example.com'), 'lead', 'New Lead Assigned', 'You have been assigned a new lead: Mike Smith', 'lead', 'LD-001', 0),
((SELECT id FROM users WHERE email = 'agent@example.com'), 'support', 'Ticket Escalated', 'Support ticket #ST-102 requires your attention', 'support_ticket', 'ST-102', 0),
((SELECT id FROM users WHERE email = 'manager@example.com'), 'system', 'Daily Digest Ready', 'Your team performance digest is ready to review.', 'report', 'digest-20250115', 1);

-- Insert default workspace settings
INSERT INTO system_settings (workspace_id, default_currency, default_timezone, default_language, pipeline_mode, pipeline_name, lead_alerts, ticket_updates, daily_digest, task_reminders, compact_mode, high_contrast, theme)
VALUES ('default', 'USD', 'Africa/Cairo', 'en', 'standard', NULL, 1, 0, 1, 1, 0, 0, 'light')
ON DUPLICATE KEY UPDATE workspace_id = workspace_id;

-- Insert sample customers
INSERT INTO customers (customer_id, name, email, phone, type, assigned_staff_id) VALUES 
('CU-001', 'Alice Johnson', 'alice@example.com', '+1234567890', 'Individual', (SELECT id FROM users WHERE email = 'agent@example.com')),
('CU-002', 'Tech Corp', 'contact@techcorp.com', '+1987654321', 'Corporate', (SELECT id FROM users WHERE email = 'agent@example.com')),
('CU-003', 'Ahmed Hassan', 'ahmed.hassan@email.com', '+20100123456', 'Individual', (SELECT id FROM users WHERE email = 'agent@example.com')),
('CU-004', 'Cairo Travel Group', 'bookings@cairotravelgroup.com', '+20233334444', 'Corporate', (SELECT id FROM users WHERE email = 'agent@example.com')),
('CU-005', 'Maria Rodriguez', 'maria.r@email.com', '+34912345678', 'Individual', (SELECT id FROM users WHERE email = 'agent@example.com'));

-- Insert sample reservations
INSERT INTO reservations (reservation_id, customer_id, supplier_id, service_type, destination, departure_date, return_date, adults, children, infants, total_amount, status, payment_status, notes, created_by) VALUES
('RES-001', (SELECT id FROM customers WHERE customer_id = 'CU-003'), (SELECT id FROM suppliers WHERE name = 'Hotel Network'), 'Hotel', 'Luxor', '2025-02-01', '2025-02-05', 2, 0, 0, 1000.00, 'Pending', 'Pending', 'Honeymoon package - needs river view room', (SELECT id FROM users WHERE email = 'agent@example.com')),
('RES-002', (SELECT id FROM customers WHERE customer_id = 'CU-004'), (SELECT id FROM suppliers WHERE name = 'Airline Partners'), 'Flight', 'Cairo', '2025-02-10', '2025-02-15', 15, 5, 0, 4500.00, 'Confirmed', 'Partial', 'Corporate group - conference trip', (SELECT id FROM users WHERE email = 'agent@example.com')),
('RES-003', (SELECT id FROM customers WHERE customer_id = 'CU-005'), (SELECT id FROM suppliers WHERE name = 'Hotel Network'), 'Tour', 'Aswan', '2025-02-20', '2025-02-23', 1, 0, 0, 360.00, 'Pending', 'Pending', 'Solo traveler - interested in cultural tours', (SELECT id FROM users WHERE email = 'agent@example.com')),
('RES-004', (SELECT id FROM customers WHERE customer_id = 'CU-001'), (SELECT id FROM suppliers WHERE name = 'Car Rental Co'), 'Package', 'Hurghada', '2025-03-01', '2025-03-07', 3, 2, 1, 2400.00, 'Pending', 'Pending', 'Family vacation with beach activities', (SELECT id FROM users WHERE email = 'agent@example.com')),
('RES-005', (SELECT id FROM customers WHERE customer_id = 'CU-002'), (SELECT id FROM suppliers WHERE name = 'Hotel Network'), 'Hotel', 'Cairo', '2025-02-05', '2025-02-08', 8, 0, 0, 1600.00, 'Confirmed', 'Paid', 'Business retreat - all meals included', (SELECT id FROM users WHERE email = 'agent@example.com'));

-- Insert sample leads
INSERT INTO leads (lead_id, name, email, phone, source, type, agent_id, value) VALUES 
('LD-001', 'Mike Smith', 'mike@example.com', '+1122334455', 'Website', 'B2C', (SELECT id FROM users WHERE email = 'agent@example.com'), 1500.00),
('LD-002', 'Sarah Wilson', 'sarah@example.com', '+1555666777', 'Referral', 'B2B', (SELECT id FROM users WHERE email = 'agent@example.com'), 5000.00);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email, services) VALUES 
('Airline Partners', 'John Doe', '+1111111111', 'contact@airline.com', 'Flight bookings'),
('Hotel Network', 'Jane Smith', '+2222222222', 'info@hotel.com', 'Hotel reservations'),
('Car Rental Co', 'Bob Johnson', '+3333333333', 'rental@car.com', 'Car rental services');

-- Insert sample items/products for travel/reservations
INSERT INTO items (item_id, name, description, price, cost, stock_quantity, min_stock_level, status) VALUES
('IT-001', 'Hotel: Steigenberger Luxor', 'Premium 5-star hotel in Luxor with Nile view', 250.00, 150.00, 50, 5, 'Active'),
('IT-002', 'Hotel: Hilton Aswan Resort', 'Luxury resort in Aswan with full amenities', 280.00, 170.00, 40, 5, 'Active'),
('IT-003', 'Flight: Cairo to Luxor Economy', 'Round trip economy class flight', 180.00, 100.00, 100, 10, 'Active'),
('IT-004', 'Flight: Domestic Business Class', 'Round trip business class domestic flight', 450.00, 250.00, 30, 5, 'Active'),
('IT-005', 'Tour: Valley of Kings', 'Full day guided tour of Valley of Kings', 120.00, 60.00, 80, 10, 'Active'),
('IT-006', 'Tour: Nile Cruise 4 Days', 'Luxor to Aswan 4-day Nile cruise with meals', 600.00, 350.00, 25, 3, 'Active'),
('IT-007', 'Activity: Nile Felucca Ride', '2-hour sunset felucca sail on the Nile', 85.00, 40.00, 60, 5, 'Active'),
('IT-008', 'Activity: Desert Safari', 'Half-day desert safari with ATV and camel ride', 95.00, 50.00, 45, 5, 'Active'),
('IT-009', 'Package: Alexandria 3-Day Tour', 'All-inclusive 3-day package to Alexandria', 450.00, 250.00, 35, 3, 'Active'),
('IT-010', 'Transport: Airport Transfer', 'Round-trip airport transfer (any city)', 60.00, 30.00, 200, 10, 'Active'),
('IT-011', 'Activity: Diving in Red Sea', 'Scuba diving lesson and experience (Red Sea)', 150.00, 80.00, 40, 5, 'Active'),
('IT-012', 'Cruise: Red Sea Diving Package', '4-day liveaboard diving cruise', 800.00, 500.00, 15, 2, 'Active'),
('IT-013', 'Hotel: Movenpick Hurghada', 'Beachfront 4-star hotel in Hurghada', 200.00, 120.00, 55, 5, 'Active'),
('IT-014', 'Activity: Camel Trek', 'Full day camel trek in desert with lunch', 110.00, 55.00, 70, 5, 'Active'),
('IT-015', 'Package: Cairo and Giza 5-Day', 'Comprehensive tour of Cairo and Giza pyramids', 550.00, 300.00, 30, 3, 'Active');

-- Permissions table
CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_permission (module, action)
);

-- Role permissions table
CREATE TABLE role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('admin', 'manager', 'agent', 'customer') NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role, permission_id)
);

-- Insert permissions for all modules
INSERT INTO permissions (name, module, action, description) VALUES
-- Dashboard permissions
('View Dashboard', 'dashboard', 'read', 'View dashboard statistics and charts'),
('Manage Dashboard', 'dashboard', 'manage', 'Manage dashboard settings and widgets'),

-- Users permissions
('View Users', 'users', 'read', 'View user list and details'),
('Create Users', 'users', 'create', 'Create new users'),
('Update Users', 'users', 'update', 'Update user information'),
('Delete Users', 'users', 'delete', 'Delete users'),
('Manage Users', 'users', 'manage', 'Full user management access'),

-- Leads permissions
('View Leads', 'leads', 'read', 'View leads list and details'),
('Create Leads', 'leads', 'create', 'Create new leads'),
('Update Leads', 'leads', 'update', 'Update lead information'),
('Delete Leads', 'leads', 'delete', 'Delete leads'),
('Manage Leads', 'leads', 'manage', 'Full lead management access'),

-- Customers permissions
('View Customers', 'customers', 'read', 'View customer list and details'),
('Create Customers', 'customers', 'create', 'Create new customers'),
('Update Customers', 'customers', 'update', 'Update customer information'),
('Delete Customers', 'customers', 'delete', 'Delete customers'),
('Manage Customers', 'customers', 'manage', 'Full customer management access'),

-- Sales permissions
('View Sales', 'sales', 'read', 'View sales cases and details'),
('Create Sales', 'sales', 'create', 'Create new sales cases'),
('Update Sales', 'sales', 'update', 'Update sales case information'),
('Delete Sales', 'sales', 'delete', 'Delete sales cases'),
('Manage Sales', 'sales', 'manage', 'Full sales management access'),

-- Reservations permissions
('View Reservations', 'reservations', 'read', 'View reservations list and details'),
('Create Reservations', 'reservations', 'create', 'Create new reservations'),
('Update Reservations', 'reservations', 'update', 'Update reservation information'),
('Delete Reservations', 'reservations', 'delete', 'Delete reservations'),
('Manage Reservations', 'reservations', 'manage', 'Full reservation management access'),

-- Finance permissions
('View Finance', 'finance', 'read', 'View financial reports and data'),
('Create Finance', 'finance', 'create', 'Create financial records'),
('Update Finance', 'finance', 'update', 'Update financial information'),
('Delete Finance', 'finance', 'delete', 'Delete financial records'),
('Manage Finance', 'finance', 'manage', 'Full financial management access'),

-- Operations permissions
('View Operations', 'operations', 'read', 'View operational data'),
('Create Operations', 'operations', 'create', 'Create operational records'),
('Update Operations', 'operations', 'update', 'Update operational information'),
('Delete Operations', 'operations', 'delete', 'Delete operational records'),
('Manage Operations', 'operations', 'manage', 'Full operational management access'),

-- Reports permissions
('View Reports', 'reports', 'read', 'View reports and analytics'),
('Create Reports', 'reports', 'create', 'Create custom reports'),
('Update Reports', 'reports', 'update', 'Update report settings'),
('Delete Reports', 'reports', 'delete', 'Delete reports'),
('Manage Reports', 'reports', 'manage', 'Full report management access'),

-- Support permissions
('View Support', 'support', 'read', 'View support tickets'),
('Create Support', 'support', 'create', 'Create support tickets'),
('Update Support', 'support', 'update', 'Update support tickets'),
('Delete Support', 'support', 'delete', 'Delete support tickets'),
('Manage Support', 'support', 'manage', 'Full support management access'),

-- Categories permissions
('View Categories', 'categories', 'read', 'View product/service categories'),
('Create Categories', 'categories', 'create', 'Create new categories'),
('Update Categories', 'categories', 'update', 'Update category information'),
('Delete Categories', 'categories', 'delete', 'Delete categories'),
('Manage Categories', 'categories', 'manage', 'Full category management access'),

-- Items permissions
('View Items', 'items', 'read', 'View products and services'),
('Create Items', 'items', 'create', 'Create new items'),
('Update Items', 'items', 'update', 'Update item information'),
('Delete Items', 'items', 'delete', 'Delete items'),
('Manage Items', 'items', 'manage', 'Full item management access'),

-- Suppliers permissions
('View Suppliers', 'suppliers', 'read', 'View suppliers list'),
('Create Suppliers', 'suppliers', 'create', 'Create new suppliers'),
('Update Suppliers', 'suppliers', 'update', 'Update supplier information'),
('Delete Suppliers', 'suppliers', 'delete', 'Delete suppliers'),
('Manage Suppliers', 'suppliers', 'manage', 'Full supplier management access'),

-- Attendance permissions
('View Attendance', 'attendance', 'read', 'View attendance records'),
('Create Attendance', 'attendance', 'create', 'Create attendance records'),
('Update Attendance', 'attendance', 'update', 'Update attendance information'),
('Delete Attendance', 'attendance', 'delete', 'Delete attendance records'),
('Manage Attendance', 'attendance', 'manage', 'Full attendance management access');

-- Owners permissions
INSERT INTO permissions (name, module, action, description) VALUES
('View Owners', 'owners', 'read', 'View property owners and their portfolios'),
('Create Owners', 'owners', 'create', 'Create new property owner records'),
('Update Owners', 'owners', 'update', 'Update property owner information'),
('Delete Owners', 'owners', 'delete', 'Delete property owner records'),
('Manage Owners', 'owners', 'manage', 'Full owner management access');

-- Properties permissions
INSERT INTO permissions (name, module, action, description) VALUES
('View Properties', 'properties', 'read', 'View managed property inventory'),
('Create Properties', 'properties', 'create', 'Create new property records'),
('Update Properties', 'properties', 'update', 'Update property details'),
('Delete Properties', 'properties', 'delete', 'Delete property records'),
('Manage Properties', 'properties', 'manage', 'Full property management access');

-- Tasks permissions
INSERT INTO permissions (name, module, action, description) VALUES
('View Operations Tasks', 'tasks', 'read', 'View operational task assignments'),
('Create Operations Tasks', 'tasks', 'create', 'Create operational tasks'),
('Update Operations Tasks', 'tasks', 'update', 'Update task information and status'),
('Delete Operations Tasks', 'tasks', 'delete', 'Delete operational tasks'),
('Manage Operations Tasks', 'tasks', 'manage', 'Full operational task management access');

-- Notifications permissions
INSERT INTO permissions (name, module, action, description) VALUES
('View Notifications', 'notifications', 'read', 'View notification center'),
('Create Notifications', 'notifications', 'create', 'Create notifications for users'),
('Update Notifications', 'notifications', 'update', 'Update notification read state'),
('Delete Notifications', 'notifications', 'delete', 'Delete notifications'),
('Manage Notifications', 'notifications', 'manage', 'Full notification management access');

-- Settings permissions
INSERT INTO permissions (name, module, action, description) VALUES
('View Workspace Settings', 'settings', 'read', 'View global workspace settings'),
('Update Workspace Settings', 'settings', 'update', 'Update workspace configuration'),
('Manage Workspace Settings', 'settings', 'manage', 'Full workspace settings access');

-- Assign permissions to roles
-- Admin gets all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;

-- Manager gets most permissions except user management
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE module NOT IN ('users') OR action = 'read';

-- Agent gets limited permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'agent', id FROM permissions 
WHERE module IN ('dashboard', 'leads', 'customers', 'sales', 'reservations', 'support', 'attendance', 'tasks', 'owners', 'properties', 'notifications')
AND action IN ('read', 'create', 'update');

-- Customer gets very limited permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'customer', id FROM permissions 
WHERE module IN ('dashboard', 'reservations', 'support', 'notifications')
AND action = 'read';