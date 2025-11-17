-- Travel CRM Database Schema for SQLite
-- Converted from MySQL schema

PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK(role IN ('admin','customer','sales','reservation','finance','operations')) NOT NULL DEFAULT 'customer',
    department TEXT,
    avatar_url TEXT,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    type TEXT CHECK(type IN ('Individual', 'Corporate')) NOT NULL DEFAULT 'Individual',
    status TEXT CHECK(status IN ('Active', 'Inactive', 'Suspended')) DEFAULT 'Active',
    contact_method TEXT CHECK(contact_method IN ('Email', 'Phone', 'SMS')) DEFAULT 'Email',
    assigned_staff_id INTEGER,
    total_bookings INTEGER DEFAULT 0,
    total_value REAL DEFAULT 0.00,
    last_trip TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    source TEXT CHECK(source IN ('Website', 'Social Media', 'Email', 'Walk-in', 'Referral')) NOT NULL,
    type TEXT CHECK(type IN ('B2B', 'B2C')) NOT NULL,
    status TEXT CHECK(status IN ('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost')) DEFAULT 'New',
    agent_id INTEGER,
    value REAL,
    notes TEXT,
    last_contact TEXT,
    next_followup TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    services TEXT,
    status TEXT CHECK(status IN ('Active', 'Inactive')) DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    supplier_id INTEGER,
    service_type TEXT CHECK(service_type IN ('Flight', 'Hotel', 'Car Rental', 'Tour', 'Package', 'Other')) NOT NULL,
    destination TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    return_date TEXT,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER DEFAULT 0,
    infants INTEGER DEFAULT 0,
    total_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')) DEFAULT 'Pending',
    payment_status TEXT CHECK(payment_status IN ('Pending', 'Partial', 'Paid', 'Refunded')) DEFAULT 'Pending',
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Reservation Notes table
CREATE TABLE IF NOT EXISTS reservation_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    note_type TEXT CHECK(note_type IN ('internal', 'interdepartmental', 'supplier_update')) DEFAULT 'internal',
    target_department TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Reservation Documents table
CREATE TABLE IF NOT EXISTS reservation_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_data TEXT NOT NULL, -- Base64 encoded file
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    uploaded_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT UNIQUE NOT NULL,
    booking_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Other')) NOT NULL,
    payment_status TEXT CHECK(payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded')) DEFAULT 'Pending',
    transaction_id TEXT,
    payment_date TEXT NOT NULL,
    due_date TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
    status TEXT CHECK(status IN ('Open', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'Open',
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Support Ticket Notes table
CREATE TABLE IF NOT EXISTS support_ticket_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Sales Cases table
CREATE TABLE IF NOT EXISTS sales_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    lead_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('Open', 'In Progress', 'Quoted', 'Won', 'Lost')) DEFAULT 'Open',
    case_type TEXT CHECK(case_type IN ('B2C', 'B2B')) DEFAULT 'B2C',
    quotation_status TEXT CHECK(quotation_status IN ('Draft', 'Sent', 'Accepted', 'Rejected')) DEFAULT 'Draft',
    value REAL,
    probability INTEGER DEFAULT 0,
    expected_close_date TEXT,
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Property Owners table
CREATE TABLE IF NOT EXISTS property_owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    primary_contact TEXT,
    email TEXT,
    phone TEXT,
    status TEXT CHECK(status IN ('Active', 'Onboarding', 'Dormant')) DEFAULT 'Active',
    portfolio_size INTEGER DEFAULT 0,
    locations TEXT,
    manager_id INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id TEXT UNIQUE NOT NULL,
    owner_id INTEGER,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    property_type TEXT CHECK(property_type IN ('Apartment', 'Villa', 'Commercial', 'Land')) NOT NULL,
    status TEXT CHECK(status IN ('Available', 'Reserved', 'Sold', 'Under Maintenance')) DEFAULT 'Available',
    nightly_rate REAL DEFAULT 0.00,
    capacity INTEGER DEFAULT 0,
    occupancy INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES property_owners(id) ON DELETE SET NULL
);

-- Property Availability table
CREATE TABLE IF NOT EXISTS property_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT CHECK(status IN ('Available', 'Reserved', 'Unavailable')) DEFAULT 'Available',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE (property_id, date)
);

-- Operations Trips table
CREATE TABLE IF NOT EXISTS operations_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_code TEXT UNIQUE NOT NULL,
    booking_reference TEXT,
    customer_name TEXT NOT NULL,
    customer_count INTEGER DEFAULT 1,
    itinerary TEXT,
    duration TEXT,
    start_date TEXT,
    end_date TEXT,
    destinations TEXT,
    assigned_guide TEXT,
    assigned_driver TEXT,
    transport TEXT,
    transport_details TEXT,
    status TEXT CHECK(status IN ('Planned', 'In Progress', 'Issue', 'Completed')) DEFAULT 'Planned',
    special_requests TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Operations Optional Services table
CREATE TABLE IF NOT EXISTS operations_optional_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_code TEXT UNIQUE NOT NULL,
    trip_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    category TEXT,
    price REAL DEFAULT 0.00,
    added_by TEXT,
    added_date TEXT,
    status TEXT CHECK(status IN ('Added', 'Confirmed', 'Cancelled')) DEFAULT 'Added',
    invoiced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES operations_trips(id) ON DELETE CASCADE
);

-- Operations Tasks table
CREATE TABLE IF NOT EXISTS operations_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT UNIQUE NOT NULL,
    trip_id INTEGER,
    title TEXT NOT NULL,
    trip_reference TEXT,
    customer_name TEXT,
    scheduled_at TEXT,
    location TEXT,
    assigned_to INTEGER,
    status TEXT CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Delayed')) DEFAULT 'Pending',
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    task_type TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES operations_trips(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Operations Trip Notes table
CREATE TABLE IF NOT EXISTS operations_trip_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    note_type TEXT CHECK(note_type IN ('internal', 'interdepartmental')) DEFAULT 'internal',
    target_department TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES operations_trips(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT CHECK(type IN ('lead', 'customer', 'booking', 'payment', 'support', 'system', 'task')) DEFAULT 'system',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System Settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL UNIQUE,
    default_currency TEXT NOT NULL DEFAULT 'USD',
    default_timezone TEXT NOT NULL DEFAULT 'UTC',
    default_language TEXT NOT NULL DEFAULT 'en',
    pipeline_mode TEXT CHECK(pipeline_mode IN ('standard', 'enterprise', 'custom')) DEFAULT 'standard',
    pipeline_name TEXT,
    lead_alerts INTEGER DEFAULT 1,
    ticket_updates INTEGER DEFAULT 0,
    daily_digest INTEGER DEFAULT 1,
    task_reminders INTEGER DEFAULT 1,
    compact_mode INTEGER DEFAULT 0,
    high_contrast INTEGER DEFAULT 0,
    theme TEXT CHECK(theme IN ('light', 'dark')) DEFAULT 'light',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    supplier_id INTEGER,
    price REAL NOT NULL,
    cost REAL,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('Active', 'Inactive', 'Discontinued')) DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    clock_in TEXT NOT NULL,
    clock_out TEXT,
    break_start TEXT,
    break_end TEXT,
    total_hours REAL DEFAULT 0.00,
    status TEXT CHECK(status IN ('Present', 'Absent', 'Late', 'Half Day')) DEFAULT 'Present',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    leave_type TEXT CHECK(leave_type IN ('Sick', 'Vacation', 'Personal', 'Emergency', 'Other')) NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    approved_by INTEGER,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id TEXT UNIQUE NOT NULL,
    entity_type TEXT CHECK(entity_type IN ('customer', 'lead', 'reservation', 'support_ticket', 'user', 'attendance')) NOT NULL,
    entity_id TEXT NOT NULL,
    activity_type TEXT CHECK(activity_type IN ('created', 'updated', 'deleted', 'status_changed', 'assigned', 'commented', 'message_sent')) NOT NULL,
    description TEXT NOT NULL,
    details TEXT,
    performed_by_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (performed_by_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sales Case Items junction table
CREATE TABLE IF NOT EXISTS sales_case_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_case_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sales_case_id) REFERENCES sales_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE (sales_case_id, item_id)
);

-- Sales Case Departments junction table
CREATE TABLE IF NOT EXISTS sales_case_departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_case_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sales_case_id) REFERENCES sales_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE (sales_case_id, department_id)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (module, action)
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT CHECK(role IN ('admin','customer','sales','reservation','finance','operations')) NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE (role, permission_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_staff ON customers(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_supplier ON reservations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(clock_in);
CREATE INDEX IF NOT EXISTS idx_property_availability_property ON property_availability(property_id);
CREATE INDEX IF NOT EXISTS idx_property_availability_date ON property_availability(date);
CREATE INDEX IF NOT EXISTS idx_property_owners_manager ON property_owners(manager_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_performed_by ON activities(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

