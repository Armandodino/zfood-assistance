import { getApiUrl } from './api';

export type ActionType = 
  | 'login' 
  | 'logout' 
  | 'create_client' 
  | 'update_client' 
  | 'delete_client' 
  | 'create_order' 
  | 'update_order' 
  | 'delete_order' 
  | 'update_payment';

interface LogParams {
  adminId: string;
  adminName: string;
  adminEmail: string;
  actionType: ActionType;
  entityType?: 'client' | 'order' | null;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/api/activity-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adminId: params.adminId,
        adminName: params.adminName,
        adminEmail: params.adminEmail,
        actionType: params.actionType,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        details: params.details || null,
      }),
    });
  } catch (error) {
    console.warn('Failed to log activity:', error);
  }
}
