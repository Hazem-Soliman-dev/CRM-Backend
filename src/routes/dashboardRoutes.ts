import { Router } from 'express';
import {
  getDashboardStats,
  getRevenueTrend,
  getLeadSources,
  getRecentActivity,
  getPerformanceMetrics
} from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';
import { getTodayTasks } from '../controllers/dashboardController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/dashboard/stats - Get dashboard statistics (role-aware)
router.get(
  '/stats',
  authorize('admin', 'customer', 'sales', 'reservation', 'finance', 'operations'),
  getDashboardStats
);

// GET /api/v1/dashboard/revenue-trend - Get revenue trend
router.get(
  '/revenue-trend',
  authorize('admin', 'sales', 'finance', 'reservation', 'operations'),
  getRevenueTrend
);

// GET /api/v1/dashboard/lead-sources - Get lead sources
router.get(
  '/lead-sources',
  authorize('admin', 'sales'),
  getLeadSources
);

// GET /api/v1/dashboard/recent-activity - Get recent activity
router.get(
  '/recent-activity',
  authorize('admin', 'customer', 'sales', 'reservation', 'finance', 'operations'),
  getRecentActivity
);

// GET /api/v1/dashboard/performance - Get performance metrics
router.get(
  '/performance',
  authorize('admin', 'sales'),
  getPerformanceMetrics
);

// GET /api/v1/dashboard/tasks/today - role-aware daily tasks
router.get(
  '/tasks/today',
  authorize('admin', 'customer', 'sales', 'reservation', 'finance', 'operations'),
  getTodayTasks
);

export default router;
