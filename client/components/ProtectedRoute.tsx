
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { PermissionResource, Role } from '../types';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: PermissionResource;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requiredPermission }) => {
  const { isAuthenticated, role, isReady } = useAuthStore();
  const { can } = usePermissions();
  const location = useLocation();

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'client' ? '/portal' : '/dashboard'} replace />;
  }

  if (requiredPermission && !can('view', requiredPermission)) {
    return <Navigate to={role === 'client' ? '/portal' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
