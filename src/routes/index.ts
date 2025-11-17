import { Router } from 'express';
import authRoutes from './authRoutes';
import leadRoutes from './leadRoutes';
import customerRoutes from './customerRoutes';
import reservationRoutes from './reservationRoutes';
import paymentRoutes from './paymentRoutes';
import invoiceRoutes from './invoiceRoutes';
import supportRoutes from './supportRoutes';
import dashboardRoutes from './dashboardRoutes';
import categoryRoutes from './categoryRoutes';
import itemRoutes from './itemRoutes';
import supplierRoutes from './supplierRoutes';
import salesCaseRoutes from './salesCaseRoutes';
import attendanceRoutes from './attendanceRoutes';
import userRoutes from './userRoutes';
import ownerRoutes from './ownerRoutes';
import propertyRoutes from './propertyRoutes';
import operationsTaskRoutes from './operationsTaskRoutes';
import operationsTripRoutes from './operationsTripRoutes';
import notificationRoutes from './notificationRoutes';
import settingsRoutes from './settingsRoutes';
import activityRoutes from './activityRoutes';
import departmentRoutes from './departmentRoutes';
import roleRoutes from './roleRoutes';
import exportRoutes from './exportRoutes';
import reportExportRoutes from './reportExportRoutes';
import accountingExportRoutes from './accountingExportRoutes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Travel CRM API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/customers', customerRoutes);
router.use('/reservations', reservationRoutes);
router.use('/bookings', reservationRoutes); // Alias for reservations to support frontend
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/support', supportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/categories', categoryRoutes);
router.use('/items', itemRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales-cases', salesCaseRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/users', userRoutes);
router.use('/owners', ownerRoutes);
router.use('/properties', propertyRoutes);
router.use('/operations/tasks', operationsTaskRoutes);
router.use('/operations/trips', operationsTripRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/activities', activityRoutes);
router.use('/departments', departmentRoutes);
router.use('/roles', roleRoutes);
router.use('/export', exportRoutes);
router.use('/reports', reportExportRoutes);
router.use('/accounting', accountingExportRoutes);

export default router;
