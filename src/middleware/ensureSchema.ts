import { Request, Response, NextFunction } from "express";
import { initializeSchema } from "../config/database";

// Singleton promise to prevent multiple simultaneous initializations
let schemaInitPromise: Promise<void> | null = null;

/**
 * Middleware to ensure database schema is initialized before handling requests.
 * Uses a singleton promise pattern to prevent race conditions when multiple
 * requests arrive simultaneously on a cold start.
 */
export const ensureSchema = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If initialization is already in progress, wait for it
    if (schemaInitPromise) {
      await schemaInitPromise;
      next();
      return;
    }

    // Start initialization and store the promise
    schemaInitPromise = initializeSchema();
    await schemaInitPromise;

    // Clear the promise after successful initialization
    // (initializeSchema has its own internal flag to prevent re-initialization)
    schemaInitPromise = null;

    next();
  } catch (error: any) {
    console.error("❌ Failed to ensure database schema:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }

    // Clear the promise on error so it can be retried
    schemaInitPromise = null;

    // Return 500 error to client
    res.status(500).json({
      success: false,
      message: "Database initialization failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
