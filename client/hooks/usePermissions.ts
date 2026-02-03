
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { PermissionResource, Role } from '../types';

type Action = 'view' | 'manage' | 'export';

export const usePermissions = () => {
  const { role } = useAuthStore();
  const { permissions } = useSettingsStore();

  const can = (action: Action, resource: PermissionResource): boolean => {
    // Admin always has access
    if (role === 'admin') return true;
    
    // Clients usually have restricted fixed access, but if we wanted to map them, we could.
    // For now, assuming standard client behavior handled by routes, but returning false for these system resources.
    if (role === 'client') {
        // Clients should only see Settings (for password change) in global nav.
        if (resource === 'settings') return action === 'view';
        return false;
    }

    if (!role || (role !== 'manager' && role !== 'agent')) return false;

    return permissions[role][resource][action];
  };

  return { can };
};
