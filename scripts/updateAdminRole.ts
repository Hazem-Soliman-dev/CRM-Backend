import getDatabase from "../src/config/database";

const updateAdminRole = () => {
  try {
    const db = getDatabase();

    // Find the user first
    const user = db
      .prepare("SELECT id, email, role FROM users WHERE email = ?")
      .get("admin@example.com") as any;

    if (!user) {
      console.log("❌ User admin@example.com not found");
      return;
    }

    console.log(`Found user: ${user.email}, current role: ${user.role}`);

    // Update the role
    const result = db
      .prepare(
        "UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE email = ?"
      )
      .run("admin@example.com");

    if (result.changes > 0) {
      console.log("✅ Successfully updated admin@example.com to admin role");

      // Verify
      const updated = db
        .prepare("SELECT email, role FROM users WHERE email = ?")
        .get("admin@example.com") as any;
      console.log(`Verified: ${updated.email} is now ${updated.role}`);
    } else {
      console.log("❌ No changes made");
    }

    db.close();
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
};

updateAdminRole();
