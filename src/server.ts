import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { ensureSchema } from "./middleware/ensureSchema";
import routes from "./routes";
import { testConnection, initializeDatabase, seedData } from "./config/database";
import { seedDemoUsers } from "./seed/demoUsers";

// Load environment variables
dotenv.config();

// Validate required environment variables (SQLite doesn't need DB config)
const requiredEnvVars = ["JWT_SECRET"];
const missingVars: string[] = [];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error("Please set these variables in your .env file.");
  process.exit(1);
}

// Warn about optional but recommended variables
const optionalEnvVars = ["JWT_EXPIRES_IN", "JWT_REFRESH_EXPIRES_IN"];
const missingOptional: string[] = [];

optionalEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    missingOptional.push(varName);
  }
});

if (missingOptional.length > 0 && process.env.NODE_ENV !== "production") {
  console.warn("⚠️  Missing optional environment variables (using defaults):");
  missingOptional.forEach((varName) => {
    console.warn(`   - ${varName}`);
  });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration - allow all origins
app.use(
  cors({
    origin: true, // Allow any origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Ensure database schema is initialized before handling requests
// This is critical for Vercel serverless where schema initialization is skipped
app.use(ensureSchema);

// API routes
app.use("/api/v1", routes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Initialize database connection
initializeDatabase();

// Start server (only in non-serverless mode)
const startServer = async () => {
  // Skip server start in Vercel serverless environment
  if (process.env.VERCEL === "1") {
    return;
  }

  try {
    // Initialize schema and seed data before starting server
    const { initializeSchema } = await import("./config/database");
    await initializeSchema();
    // Seed core demo data if empty
    await seedData();
    // Seed demo users after schema init
    await seedDemoUsers();

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("❌ Failed to connect to database. Server will not start.");
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Only start server if not in Vercel serverless mode
if (process.env.VERCEL !== "1") {
  startServer();
}

// Export app for Vercel serverless
export default app;
