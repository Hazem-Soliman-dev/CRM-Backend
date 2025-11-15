import { Router } from 'express';
import {
  getDashboardStats,
  getRevenueTrend,
  getLeadSources,
  getRecentActivity,
  getPerformanceMetrics
} from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/dashboard/stats - Get dashboard statistics
router.get('/stats', authorize('admin', 'manager', 'agent'), getDashboardStats);

// GET /api/v1/dashboard/revenue-trend - Get revenue trend
router.get('/revenue-trend', authorize('admin', 'manager'), getRevenueTrend);

// GET /api/v1/dashboard/lead-sources - Get lead sources
router.get('/lead-sources', authorize('admin', 'manager'), getLeadSources);

// GET /api/v1/dashboard/recent-activity - Get recent activity
router.get('/recent-activity', authorize('admin', 'manager', 'agent'), getRecentActivity);

// GET /api/v1/dashboard/performance - Get performance metrics
router.get('/performance', authorize('admin', 'manager', 'agent'), getPerformanceMetrics);

export default router;
