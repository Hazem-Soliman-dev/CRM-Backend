import { Request, Response, NextFunction } from 'express';
import { PermissionModel } from '../models/permissionModel';
import { errorResponse } from '../utils/response';

export const checkPermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }

      // Bypass permission checks for admin role
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const hasPermission = await PermissionModel.hasPermission(
        req.user.role,
        module,
        action
      );

      if (!hasPermission) {
        errorResponse(res, `Access denied. Required permission: ${module}:${action}`, 403);
        return;
      }

      next();
    } catch (error: any) {
      console.error('Permission check error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        role: req.user?.role,
        module,
        action
      });
      
      // If permission tables don't exist or query fails, deny access with clear message
      if (error?.code === 'SQLITE_ERROR' || error?.message?.includes('no such table')) {
        errorResponse(res, 'Permission system not initialized. Please contact administrator.', 500);
      } else {
        errorResponse(res, `Permission check failed: ${error?.message || 'Unknown error'}`, 500);
      }
    }
  };
};

export const checkModuleAccess = (module: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }

      // Bypass permission checks for admin role
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Check if user has any permission for this module
      const modulePermissions = await PermissionModel.getPermissionsByModule(module);
      const rolePermissions = await PermissionModel.getRolePermissions(req.user.role);
      
      const hasModuleAccess = modulePermissions.some(modulePerm => 
        rolePermissions.some(rolePerm => rolePerm.id === modulePerm.id)
      );

      if (!hasModuleAccess) {
        errorResponse(res, `Access denied. No permissions for module: ${module}`, 403);
        return;
      }

      next();
    } catch (error: any) {
      console.error('Module access check error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        role: req.user?.role,
        module
      });
      
      // If permission tables don't exist or query fails, deny access with clear message
      if (error?.code === 'SQLITE_ERROR' || error?.message?.includes('no such table')) {
        errorResponse(res, 'Permission system not initialized. Please contact administrator.', 500);
      } else {
        errorResponse(res, `Module access check failed: ${error?.message || 'Unknown error'}`, 500);
      }
    }
  };
};

// Permission middleware for common operations
export const requireRead = (module: string) => checkPermission(module, 'read');
export const requireCreate = (module: string) => checkPermission(module, 'create');
export const requireUpdate = (module: string) => checkPermission(module, 'update');
export const requireDelete = (module: string) => checkPermission(module, 'delete');
export const requireManage = (module: string) => checkPermission(module, 'manage');
