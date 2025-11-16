import bcrypt from "bcryptjs";
import getDatabase from "../config/database";

type DemoRole = 'admin' | 'customer' | 'sales' | 'reservation' | 'finance' | 'operations';

interface DemoUser {
  email: string;
  full_name: string;
  role: DemoRole;
  department?: string | null;
}

const DEMO_PASSWORD = "password";

const DEMO_USERS: DemoUser[] = [
  { email: "admin@example.com", full_name: "Admin User", role: "admin", department: "Management" },
  { email: "customer@example.com", full_name: "Customer User", role: "customer", department: null },
  { email: "sales@example.com", full_name: "Sales User", role: "sales", department: "Sales" },
  { email: "reservation@example.com", full_name: "Reservation User", role: "reservation", department: "Reservation" },
  { email: "finance@example.com", full_name: "Finance User", role: "finance", department: "Finance" },
  { email: "operations@example.com", full_name: "Operations User", role: "operations", department: "Operations" },
];

export async function seedDemoUsers(): Promise<void> {
  const db = getDatabase();
  const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, saltRounds);

  const findStmt = db.prepare("SELECT id FROM users WHERE email = ?");
  const insertStmt = db.prepare(`
    INSERT INTO users (email, password, full_name, role, department, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  db.prepare("BEGIN").run();
  try {
    for (const user of DEMO_USERS) {
      const existing = findStmt.get(user.email) as { id: number } | undefined;
      if (!existing) {
        insertStmt.run(
          user.email,
          hashedPassword,
          user.full_name,
          user.role,
          user.department ?? null
        );
      }
    }
    db.prepare("COMMIT").run();
    console.log("✅ Demo users ensured.");
  } catch (err) {
    db.prepare("ROLLBACK").run();
    console.error("❌ Failed to seed demo users:", err);
  }
}


