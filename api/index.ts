import app from "../src/server";
import { initializeDatabaseWithSeed } from "../src/config/database";

// Initialize database, schema, and seed data for serverless
// This runs on cold start to ensure database is ready
(async () => {
  try {
    await initializeDatabaseWithSeed();
    console.log("✅ Serverless database initialization complete");
  } catch (error: any) {
    console.error(
      "❌ Failed to initialize database for serverless:",
      error.message
    );
    // Don't throw - let the app continue, middleware will handle retries
  }
})();

export default app;
