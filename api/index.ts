import app from '../src/server';
import { initializeDatabase } from '../src/config/database';

// Initialize database for serverless
initializeDatabase();

export default app;

