import Database from "better-sqlite3";
import * as path from "path";
import bcrypt from "bcryptjs";

// Determine database path - use /tmp for Vercel serverless, local file for development
const isVercel = process.env.VERCEL === "1";
const dbPath = isVercel
  ? "/tmp/database.db"
  : path.join(process.cwd(), "database.db");

// Seed test data
const seedTestData = async () => {
  let db: Database.Database | null = null;

  try {
    console.log("🌱 Seeding test data...");

    // Open database connection
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Check if admin user exists (to get admin ID for created_by fields)
    const adminUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get("admin@example.com") as any;
    if (!adminUser) {
      throw new Error(
        "Admin user not found. Please run database initialization first."
      );
    }
    const adminId = adminUser.id;

    console.log(`   Using admin user ID: ${adminId}`);

    // Seed departments
    console.log("   Creating departments...");
    const departments = [
      {
        name: "Sales",
        description: "Sales and customer acquisition",
        manager_id: null,
      },
      {
        name: "Operations",
        description: "Operations and logistics",
        manager_id: null,
      },
      {
        name: "Support",
        description: "Customer support and service",
        manager_id: null,
      },
      {
        name: "Marketing",
        description: "Marketing and promotions",
        manager_id: null,
      },
    ];

    const insertDept = db.prepare(`
      INSERT OR IGNORE INTO departments (name, description, manager_id)
      VALUES (?, ?, ?)
    `);

    const deptIds: number[] = [];
    for (const dept of departments) {
      try {
        insertDept.run(dept.name, dept.description, dept.manager_id);
        const deptId = (
          db.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (deptId) deptIds.push(deptId);
      } catch (e) {
        // Department might already exist, get its ID
        const existing = db
          .prepare("SELECT id FROM departments WHERE name = ?")
          .get(dept.name) as any;
        if (existing) deptIds.push(existing.id);
      }
    }

    // Seed additional users (agents and managers)
    console.log("   Creating test users...");
    const testUsers = [
      {
        email: "manager1@example.com",
        password: "password",
        full_name: "John Manager",
        role: "manager",
        department: "Sales",
      },
      {
        email: "agent1@example.com",
        password: "password",
        full_name: "Jane Agent",
        role: "agent",
        department: "Sales",
      },
      {
        email: "agent2@example.com",
        password: "password",
        full_name: "Bob Agent",
        role: "agent",
        department: "Operations",
      },
      {
        email: "customer1@example.com",
        password: "password",
        full_name: "Alice Customer",
        role: "customer",
        department: null,
      },
    ];

    const saltRounds = 10;
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (email, password, full_name, role, department, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const userIds: { [key: string]: number } = {};
    for (const user of testUsers) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        const deptName = user.department || null;
        insertUser.run(
          user.email,
          hashedPassword,
          user.full_name,
          user.role,
          deptName,
          "active"
        );
        const userId = (
          db.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (userId) userIds[user.email] = userId;
      } catch (e) {
        // User might already exist, get its ID
        const existing = db
          .prepare("SELECT id FROM users WHERE email = ?")
          .get(user.email) as any;
        if (existing) userIds[user.email] = existing.id;
      }
    }

    // Seed suppliers
    console.log("   Creating suppliers...");
    const suppliers = [
      {
        name: "Airline Express",
        contact_person: "John Smith",
        phone: "+1234567890",
        email: "contact@airline.com",
        address: "123 Airport Rd",
        services: "Flight booking, Tickets",
        status: "Active",
      },
      {
        name: "Hotel Grand",
        contact_person: "Sarah Johnson",
        phone: "+1234567891",
        email: "sales@hotel.com",
        address: "456 Main St",
        services: "Hotel booking, Accommodation",
        status: "Active",
      },
      {
        name: "Car Rental Pro",
        contact_person: "Mike Brown",
        phone: "+1234567892",
        email: "info@carrental.com",
        address: "789 Auto Ave",
        services: "Car rental, Transportation",
        status: "Active",
      },
    ];

    const insertSupplier = db.prepare(`
      INSERT OR IGNORE INTO suppliers (name, contact_person, phone, email, address, services, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const supplierIds: number[] = [];
    for (const supplier of suppliers) {
      try {
        insertSupplier.run(
          supplier.name,
          supplier.contact_person,
          supplier.phone,
          supplier.email,
          supplier.address,
          supplier.services,
          supplier.status
        );
        const supplierId = (
          db.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (supplierId) supplierIds.push(supplierId);
      } catch (e) {
        const existing = db
          .prepare("SELECT id FROM suppliers WHERE name = ?")
          .get(supplier.name) as any;
        if (existing) supplierIds.push(existing.id);
      }
    }

    // Seed customers
    console.log("   Creating customers...");
    const customers = [
      {
        customer_id: "CU-" + Date.now().toString().slice(-8) + "1",
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "+1987654321",
        company: null,
        type: "Individual",
        status: "Active",
        contact_method: "Email",
        assigned_staff_id: userIds["agent1@example.com"] || null,
      },
      {
        customer_id: "CU-" + Date.now().toString().slice(-8) + "2",
        name: "Tech Corp",
        email: "info@techcorp.com",
        phone: "+1987654322",
        company: "Tech Corp Inc",
        type: "Corporate",
        status: "Active",
        contact_method: "Phone",
        assigned_staff_id: userIds["agent1@example.com"] || null,
      },
      {
        customer_id: "CU-" + Date.now().toString().slice(-8) + "3",
        name: "Bob Williams",
        email: "bob@example.com",
        phone: "+1987654323",
        company: null,
        type: "Individual",
        status: "Active",
        contact_method: "SMS",
        assigned_staff_id: userIds["agent2@example.com"] || null,
      },
      {
        customer_id: "CU-" + Date.now().toString().slice(-8) + "4",
        name: "Global Travel Ltd",
        email: "contact@globaltravel.com",
        phone: "+1987654324",
        company: "Global Travel Ltd",
        type: "Corporate",
        status: "Active",
        contact_method: "Email",
        assigned_staff_id: userIds["manager1@example.com"] || null,
      },
    ];

    const insertCustomer = db.prepare(`
      INSERT OR IGNORE INTO customers (customer_id, name, email, phone, company, type, status, contact_method, assigned_staff_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customerIds: number[] = [];
    for (const customer of customers) {
      try {
        insertCustomer.run(
          customer.customer_id,
          customer.name,
          customer.email,
          customer.phone,
          customer.company,
          customer.type,
          customer.status,
          customer.contact_method,
          customer.assigned_staff_id
        );
        const customerId = (
          db.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (customerId) customerIds.push(customerId);
      } catch (e) {
        const existing = db
          .prepare("SELECT id FROM customers WHERE customer_id = ?")
          .get(customer.customer_id) as any;
        if (existing) customerIds.push(existing.id);
      }
    }

    // Seed leads
    console.log("   Creating leads...");
    const leads = [
      {
        lead_id: "LD-" + Date.now().toString().slice(-8) + "1",
        name: "David Lee",
        email: "david@example.com",
        phone: "+1122334455",
        company: null,
        source: "Website",
        type: "B2C",
        status: "New",
        agent_id: userIds["agent1@example.com"] || null,
        value: 5000,
      },
      {
        lead_id: "LD-" + Date.now().toString().slice(-8) + "2",
        name: "Enterprise Solutions",
        email: "sales@enterprise.com",
        phone: "+1122334456",
        company: "Enterprise Solutions",
        source: "Social Media",
        type: "B2B",
        status: "Qualified",
        agent_id: userIds["agent1@example.com"] || null,
        value: 25000,
      },
      {
        lead_id: "LD-" + Date.now().toString().slice(-8) + "3",
        name: "Emma Davis",
        email: "emma@example.com",
        phone: "+1122334457",
        company: null,
        source: "Referral",
        type: "B2C",
        status: "Contacted",
        agent_id: userIds["agent2@example.com"] || null,
        value: 3000,
      },
      {
        lead_id: "LD-" + Date.now().toString().slice(-8) + "4",
        name: "Premium Tours",
        email: "info@premiumtours.com",
        phone: "+1122334458",
        company: "Premium Tours",
        source: "Email",
        type: "B2B",
        status: "Proposal",
        agent_id: userIds["manager1@example.com"] || null,
        value: 15000,
      },
    ];

    const insertLead = db.prepare(`
      INSERT OR IGNORE INTO leads (lead_id, name, email, phone, company, source, type, status, agent_id, value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const lead of leads) {
      try {
        insertLead.run(
          lead.lead_id,
          lead.name,
          lead.email,
          lead.phone,
          lead.company,
          lead.source,
          lead.type,
          lead.status,
          lead.agent_id,
          lead.value
        );
      } catch (e) {
        // Lead might already exist
      }
    }

    // Seed reservations (only if we have customers and suppliers)
    if (customerIds.length > 0 && supplierIds.length > 0) {
      console.log("   Creating reservations...");
      const reservations = [
        {
          reservation_id: "RES-" + Date.now().toString().slice(-8) + "1",
          customer_id: customerIds[0],
          supplier_id: supplierIds[0],
          service_type: "Flight",
          destination: "Paris, France",
          departure_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          return_date: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          adults: 2,
          children: 0,
          infants: 0,
          total_amount: 2500.0,
          status: "Confirmed",
          payment_status: "Paid",
          created_by: adminId,
        },
        {
          reservation_id: "RES-" + Date.now().toString().slice(-8) + "2",
          customer_id: customerIds[1],
          supplier_id: supplierIds[1],
          service_type: "Hotel",
          destination: "Tokyo, Japan",
          departure_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          return_date: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          adults: 4,
          children: 2,
          infants: 0,
          total_amount: 4500.0,
          status: "Pending",
          payment_status: "Partial",
          created_by: adminId,
        },
        {
          reservation_id: "RES-" + Date.now().toString().slice(-8) + "3",
          customer_id: customerIds[2],
          supplier_id: supplierIds[2],
          service_type: "Car Rental",
          destination: "Dubai, UAE",
          departure_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          return_date: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          adults: 2,
          children: 0,
          infants: 0,
          total_amount: 800.0,
          status: "Confirmed",
          payment_status: "Paid",
          created_by: adminId,
        },
      ];

      const insertReservation = db.prepare(`
        INSERT OR IGNORE INTO reservations (
          reservation_id, customer_id, supplier_id, service_type, destination,
          departure_date, return_date, adults, children, infants, total_amount,
          status, payment_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const reservation of reservations) {
        try {
          insertReservation.run(
            reservation.reservation_id,
            reservation.customer_id,
            reservation.supplier_id,
            reservation.service_type,
            reservation.destination,
            reservation.departure_date,
            reservation.return_date,
            reservation.adults,
            reservation.children,
            reservation.infants,
            reservation.total_amount,
            reservation.status,
            reservation.payment_status,
            reservation.created_by
          );
        } catch (e) {
          // Reservation might already exist
        }
      }
    }

    // Seed support tickets (only if we have customers)
    if (customerIds.length > 0) {
      console.log("   Creating support tickets...");
      const supportTickets = [
        {
          customer_id: customerIds[0],
          subject: "Need help with booking modification",
          description:
            "I would like to change my travel dates for the Paris trip.",
          priority: "Medium",
          status: "Open",
          assigned_to: userIds["agent1@example.com"] || null,
        },
        {
          customer_id: customerIds[1],
          subject: "Payment issue",
          description:
            "There seems to be an issue with my payment transaction.",
          priority: "High",
          status: "In Progress",
          assigned_to: userIds["agent1@example.com"] || null,
        },
        {
          customer_id: customerIds[2],
          subject: "Request for refund",
          description: "I need to cancel my booking and get a refund.",
          priority: "Urgent",
          status: "Open",
          assigned_to: userIds["agent2@example.com"] || null,
        },
      ];

      const insertTicket = db.prepare(`
        INSERT OR IGNORE INTO support_tickets (
          customer_id, subject, description, priority, status, assigned_to
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const ticket of supportTickets) {
        try {
          insertTicket.run(
            ticket.customer_id,
            ticket.subject,
            ticket.description,
            ticket.priority,
            ticket.status,
            ticket.assigned_to
          );
        } catch (e) {
          // Ticket might already exist
        }
      }
    }

    // Seed categories
    console.log("   Creating categories...");
    const categories = [
      {
        name: "Accommodation",
        description: "Hotels and lodging",
        parent_id: null,
      },
      {
        name: "Transportation",
        description: "Flights and car rentals",
        parent_id: null,
      },
      {
        name: "Activities",
        description: "Tours and activities",
        parent_id: null,
      },
      { name: "Hotels", description: "Hotel bookings", parent_id: null },
      { name: "Flights", description: "Flight bookings", parent_id: null },
    ];

    const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO categories (name, description, parent_id)
      VALUES (?, ?, ?)
    `);

    const categoryIds: number[] = [];
    for (const category of categories) {
      try {
        insertCategory.run(
          category.name,
          category.description,
          category.parent_id
        );
        const catId = (
          db.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (catId) categoryIds.push(catId);
      } catch (e) {
        const existing = db
          .prepare("SELECT id FROM categories WHERE name = ?")
          .get(category.name) as any;
        if (existing) categoryIds.push(existing.id);
      }
    }

    // Seed items (need categories and suppliers)
    if (categoryIds.length > 0 && supplierIds.length > 0) {
      console.log("   Creating items...");
      const items = [
        {
          item_id: "ITM-" + Date.now().toString().slice(-8) + "1",
          name: "Deluxe Hotel Room",
          description: "Premium hotel room with ocean view",
          category_id: categoryIds[3] || categoryIds[0],
          supplier_id: supplierIds[1],
          price: 150.0,
          cost: 100.0,
          stock_quantity: 10,
          min_stock_level: 2,
          status: "Active",
        },
        {
          item_id: "ITM-" + Date.now().toString().slice(-8) + "2",
          name: "Business Class Flight",
          description: "Business class airline ticket",
          category_id: categoryIds[4] || categoryIds[1],
          supplier_id: supplierIds[0],
          price: 800.0,
          cost: 600.0,
          stock_quantity: 5,
          min_stock_level: 1,
          status: "Active",
        },
        {
          item_id: "ITM-" + Date.now().toString().slice(-8) + "3",
          name: "Luxury Car Rental",
          description: "Premium car rental package",
          category_id: categoryIds[1],
          supplier_id: supplierIds[2],
          price: 75.0,
          cost: 50.0,
          stock_quantity: 8,
          min_stock_level: 2,
          status: "Active",
        },
      ];

      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO items (item_id, name, description, category_id, supplier_id, price, cost, stock_quantity, min_stock_level, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const itemIds: number[] = [];
      for (const item of items) {
        try {
          insertItem.run(
            item.item_id,
            item.name,
            item.description,
            item.category_id,
            item.supplier_id,
            item.price,
            item.cost,
            item.stock_quantity,
            item.min_stock_level,
            item.status
          );
          const itemId = (
            db.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          if (itemId) itemIds.push(itemId);
        } catch (e) {
          const existing = db
            .prepare("SELECT id FROM items WHERE item_id = ?")
            .get(item.item_id) as any;
          if (existing) itemIds.push(existing.id);
        }
      }

      // Seed payments (need reservations)
      const reservationRows = db
        .prepare("SELECT id, reservation_id FROM reservations LIMIT 3")
        .all() as any[];
      if (reservationRows.length > 0) {
        console.log("   Creating payments...");
        const payments = [
          {
            payment_id: "PAY-" + Date.now().toString().slice(-8) + "1",
            booking_id: reservationRows[0]?.id || customerIds[0],
            customer_id: customerIds[0],
            amount: 2500.0,
            payment_method: "Credit Card",
            payment_status: "Completed",
            transaction_id: "TXN-" + Date.now() + "1",
            payment_date: new Date().toISOString().split("T")[0],
            created_by: adminId,
          },
          {
            payment_id: "PAY-" + Date.now().toString().slice(-8) + "2",
            booking_id: reservationRows[1]?.id || customerIds[1],
            customer_id: customerIds[1],
            amount: 2250.0,
            payment_method: "Bank Transfer",
            payment_status: "Completed",
            transaction_id: "TXN-" + Date.now() + "2",
            payment_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            created_by: adminId,
          },
          {
            payment_id: "PAY-" + Date.now().toString().slice(-8) + "3",
            booking_id: reservationRows[2]?.id || customerIds[2],
            customer_id: customerIds[2],
            amount: 800.0,
            payment_method: "Credit Card",
            payment_status: "Completed",
            transaction_id: "TXN-" + Date.now() + "3",
            payment_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            created_by: adminId,
          },
        ];

        const insertPayment = db.prepare(`
          INSERT OR IGNORE INTO payments (payment_id, booking_id, customer_id, amount, payment_method, payment_status, transaction_id, payment_date, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const payment of payments) {
          try {
            insertPayment.run(
              payment.payment_id,
              payment.booking_id,
              payment.customer_id,
              payment.amount,
              payment.payment_method,
              payment.payment_status,
              payment.transaction_id,
              payment.payment_date,
              payment.created_by
            );
          } catch (e) {
            // Payment might already exist
          }
        }
      }

      // Seed sales cases (need customers, leads, users)
      if (customerIds.length > 0) {
        console.log("   Creating sales cases...");
        const leadRows = db
          .prepare("SELECT id FROM leads LIMIT 2")
          .all() as any[];
        const salesCases = [
          {
            case_id: "CASE-" + Date.now().toString().slice(-8) + "1",
            customer_id: customerIds[0],
            lead_id: leadRows[0]?.id || null,
            title: "Corporate Travel Package",
            description: "Annual corporate travel package for Tech Corp",
            status: "In Progress",
            case_type: "B2B",
            value: 50000,
            probability: 75,
            expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            assigned_to: userIds["agent1@example.com"] || null,
            created_by: adminId,
          },
          {
            case_id: "CASE-" + Date.now().toString().slice(-8) + "2",
            customer_id: customerIds[1],
            lead_id: leadRows[1]?.id || null,
            title: "Individual Vacation Booking",
            description: "Family vacation to Europe",
            status: "Quoted",
            case_type: "B2C",
            value: 12000,
            probability: 60,
            expected_close_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            assigned_to: userIds["agent2@example.com"] || null,
            created_by: adminId,
          },
        ];

        const insertSalesCase = db.prepare(`
          INSERT OR IGNORE INTO sales_cases (case_id, customer_id, lead_id, title, description, status, case_type, value, probability, expected_close_date, assigned_to, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const salesCaseIds: number[] = [];
        for (const salesCase of salesCases) {
          try {
            insertSalesCase.run(
              salesCase.case_id,
              salesCase.customer_id,
              salesCase.lead_id,
              salesCase.title,
              salesCase.description,
              salesCase.status,
              salesCase.case_type,
              salesCase.value,
              salesCase.probability,
              salesCase.expected_close_date,
              salesCase.assigned_to,
              salesCase.created_by
            );
            const caseId = (
              db.prepare("SELECT last_insert_rowid() as id").get() as any
            ).id;
            if (caseId) salesCaseIds.push(caseId);
          } catch (e) {
            const existing = db
              .prepare("SELECT id FROM sales_cases WHERE case_id = ?")
              .get(salesCase.case_id) as any;
            if (existing) salesCaseIds.push(existing.id);
          }
        }

        // Seed sales case items
        if (salesCaseIds.length > 0 && itemIds.length > 0) {
          console.log("   Creating sales case items...");
          const insertSalesCaseItem = db.prepare(`
            INSERT OR IGNORE INTO sales_case_items (sales_case_id, item_id)
            VALUES (?, ?)
          `);

          insertSalesCaseItem.run(salesCaseIds[0], itemIds[0]);
          insertSalesCaseItem.run(salesCaseIds[0], itemIds[1]);
          insertSalesCaseItem.run(salesCaseIds[1], itemIds[0]);
        }

        // Seed sales case departments
        if (salesCaseIds.length > 0 && deptIds.length > 0) {
          console.log("   Creating sales case departments...");
          const insertSalesCaseDept = db.prepare(`
            INSERT OR IGNORE INTO sales_case_departments (sales_case_id, department_id)
            VALUES (?, ?)
          `);

          insertSalesCaseDept.run(salesCaseIds[0], deptIds[0]); // Sales
          insertSalesCaseDept.run(salesCaseIds[0], deptIds[1]); // Operations
          insertSalesCaseDept.run(salesCaseIds[1], deptIds[0]); // Sales
        }
      }
    }

    // Seed property owners
    console.log("   Creating property owners...");
    const propertyOwners = [
      {
        owner_id: "OWN-" + Date.now().toString().slice(-8) + "1",
        company_name: "Luxury Properties Inc",
        primary_contact: "John Doe",
        email: "contact@luxuryprops.com",
        phone: "+1555123456",
        locations: "New York, Miami, Los Angeles",
        manager_id: userIds["manager1@example.com"] || null,
      },
      {
        owner_id: "OWN-" + Date.now().toString().slice(-8) + "2",
        company_name: "Beach Resorts Ltd",
        primary_contact: "Jane Smith",
        email: "info@beachresorts.com",
        phone: "+1555123457",
        locations: "Maldives, Bahamas, Caribbean",
        manager_id: userIds["manager1@example.com"] || null,
      },
    ];

    const insertOwner = db.prepare(`
      INSERT OR IGNORE INTO property_owners (owner_id, company_name, primary_contact, email, phone, locations, manager_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const ownerIds: number[] = [];
    for (const owner of propertyOwners) {
      try {
        insertOwner.run(
          owner.owner_id,
          owner.company_name,
          owner.primary_contact,
          owner.email,
          owner.phone,
          owner.locations,
          owner.manager_id
        );
        const ownerId = (
          db.prepare("SELECT last_insert_rowid() as id").get() as any
        ).id;
        if (ownerId) ownerIds.push(ownerId);
      } catch (e) {
        const existing = db
          .prepare("SELECT id FROM property_owners WHERE owner_id = ?")
          .get(owner.owner_id) as any;
        if (existing) ownerIds.push(existing.id);
      }
    }

    // Seed properties
    if (ownerIds.length > 0) {
      console.log("   Creating properties...");
      const properties = [
        {
          property_id: "PROP-" + Date.now().toString().slice(-8) + "1",
          name: "Luxury Villa Beachfront",
          location: "Maldives",
          property_type: "Villa",
          status: "Available",
          nightly_rate: 500.0,
          capacity: 6,
          occupancy: 0,
          description: "Stunning beachfront villa with private pool",
          owner_id: ownerIds[0],
        },
        {
          property_id: "PROP-" + Date.now().toString().slice(-8) + "2",
          name: "Downtown Apartment",
          location: "New York",
          property_type: "Apartment",
          status: "Available",
          nightly_rate: 200.0,
          capacity: 4,
          occupancy: 0,
          description: "Modern apartment in city center",
          owner_id: ownerIds[1],
        },
        {
          property_id: "PROP-" + Date.now().toString().slice(-8) + "3",
          name: "Mountain Cabin",
          location: "Switzerland",
          property_type: "Villa",
          status: "Reserved",
          nightly_rate: 300.0,
          capacity: 8,
          occupancy: 4,
          description: "Cozy mountain cabin with fireplace",
          owner_id: ownerIds[0],
        },
      ];

      const insertProperty = db.prepare(`
        INSERT OR IGNORE INTO properties (property_id, name, location, property_type, status, nightly_rate, capacity, occupancy, description, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const propertyIds: number[] = [];
      for (const property of properties) {
        try {
          insertProperty.run(
            property.property_id,
            property.name,
            property.location,
            property.property_type,
            property.status,
            property.nightly_rate,
            property.capacity,
            property.occupancy,
            property.description,
            property.owner_id
          );
          const propId = (
            db.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          if (propId) propertyIds.push(propId);
        } catch (e) {
          const existing = db
            .prepare("SELECT id FROM properties WHERE property_id = ?")
            .get(property.property_id) as any;
          if (existing) propertyIds.push(existing.id);
        }
      }

      // Seed property availability
      if (propertyIds.length > 0) {
        console.log("   Creating property availability...");
        const insertAvailability = db.prepare(`
          INSERT OR IGNORE INTO property_availability (property_id, date, status)
          VALUES (?, ?, ?)
        `);

        const today = new Date();
        for (const propId of propertyIds) {
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split("T")[0];
            const status = i % 7 === 0 ? "Reserved" : "Available";
            insertAvailability.run(propId, dateStr, status);
          }
        }
      }
    }

    // Seed operations trips (need customers)
    if (customerIds.length > 0) {
      console.log("   Creating operations trips...");
      const operationsTrips = [
        {
          trip_code: "TRIP-" + Date.now().toString().slice(-8) + "1",
          booking_reference: "BR-" + Date.now(),
          customer_name: "Alice Johnson",
          customer_count: 2,
          itinerary: "Paris -> Rome -> Barcelona",
          duration: "7 days",
          start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end_date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          destinations: "Paris, Rome, Barcelona",
          assigned_guide: "Guide 1",
          assigned_driver: "Driver 1",
          transport: "Bus",
          status: "Planned",
        },
        {
          trip_code: "TRIP-" + Date.now().toString().slice(-8) + "2",
          booking_reference: "BR-" + (Date.now() + 1),
          customer_name: "Tech Corp Group",
          customer_count: 8,
          itinerary: "Tokyo -> Kyoto -> Osaka",
          duration: "10 days",
          start_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          destinations: "Tokyo, Kyoto, Osaka",
          assigned_guide: "Guide 2",
          assigned_driver: "Driver 2",
          transport: "Van",
          status: "In Progress",
        },
      ];

      const insertTrip = db.prepare(`
        INSERT OR IGNORE INTO operations_trips (
          trip_code, booking_reference, customer_name, customer_count, itinerary, duration,
          start_date, end_date, destinations, assigned_guide, assigned_driver, transport, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const tripIds: number[] = [];
      for (const trip of operationsTrips) {
        try {
          insertTrip.run(
            trip.trip_code,
            trip.booking_reference,
            trip.customer_name,
            trip.customer_count,
            trip.itinerary,
            trip.duration,
            trip.start_date,
            trip.end_date,
            trip.destinations,
            trip.assigned_guide,
            trip.assigned_driver,
            trip.transport,
            trip.status
          );
          const tripId = (
            db.prepare("SELECT last_insert_rowid() as id").get() as any
          ).id;
          if (tripId) tripIds.push(tripId);
        } catch (e) {
          const existing = db
            .prepare("SELECT id FROM operations_trips WHERE trip_code = ?")
            .get(trip.trip_code) as any;
          if (existing) tripIds.push(existing.id);
        }
      }

      // Seed operations optional services
      if (tripIds.length > 0) {
        console.log("   Creating operations optional services...");
        const insertOptionalService = db.prepare(`
          INSERT OR IGNORE INTO operations_optional_services (service_code, trip_id, service_name, category, price, added_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const timestamp = Date.now();
        insertOptionalService.run(
          "SRV-" + timestamp + "1",
          tripIds[0],
          "Airport Transfer",
          "Transportation",
          50.0,
          new Date().toISOString().split("T")[0],
          "Confirmed"
        );
        insertOptionalService.run(
          "SRV-" + timestamp + "2",
          tripIds[0],
          "City Tour",
          "Activity",
          75.0,
          new Date().toISOString().split("T")[0],
          "Added"
        );
        insertOptionalService.run(
          "SRV-" + timestamp + "3",
          tripIds[1],
          "Photography Service",
          "Activity",
          150.0,
          new Date().toISOString().split("T")[0],
          "Added"
        );
      }

      // Seed operations tasks
      if (tripIds.length > 0 && Object.keys(userIds).length > 0) {
        console.log("   Creating operations tasks...");
        const operationsTasks = [
          {
            task_id: "TASK-" + Date.now().toString().slice(-8) + "1",
            trip_id: tripIds[0],
            title: "Prepare welcome package",
            scheduled_at: new Date(
              Date.now() + 10 * 24 * 60 * 60 * 1000
            ).toISOString(),
            location: "Paris Airport",
            assigned_to: userIds["agent1@example.com"] || null,
            status: "Pending",
            priority: "Medium",
            task_type: "Preparation",
          },
          {
            task_id: "TASK-" + Date.now().toString().slice(-8) + "2",
            trip_id: tripIds[1],
            title: "Confirm hotel bookings",
            scheduled_at: new Date(
              Date.now() + 20 * 24 * 60 * 60 * 1000
            ).toISOString(),
            location: "Tokyo",
            assigned_to: userIds["agent2@example.com"] || null,
            status: "In Progress",
            priority: "High",
            task_type: "Booking",
          },
        ];

        const insertTask = db.prepare(`
          INSERT OR IGNORE INTO operations_tasks (task_id, trip_id, title, scheduled_at, location, assigned_to, status, priority, task_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const task of operationsTasks) {
          try {
            insertTask.run(
              task.task_id,
              task.trip_id,
              task.title,
              task.scheduled_at,
              task.location,
              task.assigned_to,
              task.status,
              task.priority,
              task.task_type
            );
          } catch (e) {
            // Task might already exist
          }
        }
      }
    }

    // Seed roles
    console.log("   Creating roles...");
    const roles = [
      {
        name: "Sales Representative",
        description: "Handles customer sales and inquiries",
        permissions: null,
      },
      {
        name: "Operations Coordinator",
        description: "Manages operations and logistics",
        permissions: null,
      },
      {
        name: "Customer Support",
        description: "Provides customer support services",
        permissions: null,
      },
    ];

    const insertRole = db.prepare(`
      INSERT OR IGNORE INTO roles (name, description)
      VALUES (?, ?)
    `);

    for (const role of roles) {
      try {
        insertRole.run(role.name, role.description);
      } catch (e) {
        // Role might already exist
      }
    }

    // Seed notifications (need users)
    if (Object.keys(userIds).length > 0) {
      console.log("   Creating notifications...");
      const notifications = [
        {
          user_id: userIds["agent1@example.com"] || adminId,
          type: "lead",
          title: "New Lead Assigned",
          message: "You have been assigned a new lead",
          is_read: 0,
        },
        {
          user_id: userIds["agent2@example.com"] || adminId,
          type: "task",
          title: "Task Due Soon",
          message: "Your task is due in 2 days",
          is_read: 0,
        },
        {
          user_id: adminId,
          type: "payment",
          title: "Payment Received",
          message: "Payment of $2500 received",
          is_read: 1,
        },
      ];

      const insertNotification = db.prepare(`
        INSERT OR IGNORE INTO notifications (user_id, type, title, message, is_read)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const notification of notifications) {
        try {
          insertNotification.run(
            notification.user_id,
            notification.type,
            notification.title,
            notification.message,
            notification.is_read
          );
        } catch (e) {
          // Notification might already exist
        }
      }
    }

    // Seed activities (need users)
    if (Object.keys(userIds).length > 0 && customerIds.length > 0) {
      console.log("   Creating activities...");
      const activities = [
        {
          entity_type: "customer",
          entity_id: customerIds[0].toString(),
          action: "created",
          description: "Customer created",
          performed_by_id: adminId,
        },
        {
          entity_type: "lead",
          entity_id: "1",
          action: "updated",
          description: "Lead status changed to Qualified",
          performed_by_id: userIds["agent1@example.com"] || adminId,
        },
        {
          entity_type: "reservation",
          entity_id: "1",
          action: "created",
          description: "Reservation created for Paris trip",
          performed_by_id: adminId,
        },
      ];

      const insertActivity = db.prepare(`
        INSERT OR IGNORE INTO activities (entity_type, entity_id, action, description, performed_by_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const activity of activities) {
        try {
          insertActivity.run(
            activity.entity_type,
            activity.entity_id,
            activity.action,
            activity.description,
            activity.performed_by_id
          );
        } catch (e) {
          // Activity might already exist
        }
      }
    }

    // Seed leave requests (need users)
    if (Object.keys(userIds).length > 0) {
      console.log("   Creating leave requests...");
      const leaveRequests = [
        {
          user_id: userIds["agent1@example.com"] || adminId,
          leave_type: "Vacation",
          start_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end_date: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          reason: "Family vacation",
          status: "Pending",
          days_requested: 7,
        },
        {
          user_id: userIds["agent2@example.com"] || adminId,
          leave_type: "Sick",
          start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          reason: "Medical appointment",
          status: "Approved",
          days_requested: 2,
        },
      ];

      const insertLeaveRequest = db.prepare(`
        INSERT OR IGNORE INTO leave_requests (user_id, leave_type, start_date, end_date, reason, status, days_requested)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const leaveRequest of leaveRequests) {
        try {
          insertLeaveRequest.run(
            leaveRequest.user_id,
            leaveRequest.leave_type,
            leaveRequest.start_date,
            leaveRequest.end_date,
            leaveRequest.reason,
            leaveRequest.status,
            leaveRequest.days_requested
          );
        } catch (e) {
          // Leave request might already exist
        }
      }
    }

    // Seed attendance (need users)
    if (Object.keys(userIds).length > 0) {
      console.log("   Creating attendance records...");
      const insertAttendance = db.prepare(`
        INSERT OR IGNORE INTO attendance (user_id, clock_in, clock_out, break_start, break_end, total_hours, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const clockIn = new Date(date);
        clockIn.setHours(9, 0, 0, 0);
        const clockOut = new Date(date);
        clockOut.setHours(17, 30, 0, 0);
        const breakStart = new Date(date);
        breakStart.setHours(12, 0, 0, 0);
        const breakEnd = new Date(date);
        breakEnd.setHours(12, 30, 0, 0);

        insertAttendance.run(
          userIds["agent1@example.com"] || adminId,
          clockIn.toISOString(),
          clockOut.toISOString(),
          breakStart.toISOString(),
          breakEnd.toISOString(),
          8.0,
          "Present"
        );
      }
    }

    db.close();
    db = null;
    console.log("✅ Test data seeded successfully!");
    console.log("");
    console.log("📊 Summary:");
    console.log(`   - ${testUsers.length} test users created`);
    console.log(`   - ${suppliers.length} suppliers created`);
    console.log(`   - ${customers.length} customers created`);
    console.log(`   - ${leads.length} leads created`);
    console.log(`   - 3 reservations created`);
    console.log(`   - 3 support tickets created`);
    console.log(`   - ${categories.length} categories created`);
    console.log(`   - 3 items created`);
    console.log(`   - 3 payments created`);
    console.log(`   - 2 sales cases created`);
    console.log(`   - 2 property owners created`);
    console.log(`   - 3 properties created`);
    console.log(`   - 2 operations trips created`);
    console.log(`   - 2 operations tasks created`);
    console.log(`   - 3 notifications created`);
    console.log(`   - 3 activities created`);
    console.log(`   - 2 leave requests created`);
    console.log(`   - 7 attendance records created`);
    console.log("");
    console.log("🔑 Test user credentials:");
    console.log("   - manager1@example.com / password");
    console.log("   - agent1@example.com / password");
    console.log("   - agent2@example.com / password");
    console.log("   - customer1@example.com / password");
  } catch (error: any) {
    console.error("❌ Failed to seed test data:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (db) {
      db.close();
    }
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log("✅ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

export default seedTestData;
