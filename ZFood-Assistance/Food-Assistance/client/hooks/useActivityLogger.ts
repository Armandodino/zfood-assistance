import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../utils/api';

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

export type EntityType = 'client' | 'order' | null;

interface LogActivityParams {
  actionType: ActionType;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

export function useActivityLogger() {
  const { currentUser } = useAuth();

  const logActivity = useCallback(async (params: LogActivityParams) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/activity-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: currentUser.id,
          adminName: currentUser.name,
          adminEmail: currentUser.email,
          actionType: params.actionType,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          entityName: params.entityName || null,
          details: params.details || null,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to log activity:', await response.text());
      }
    } catch (error) {
      console.warn('Error logging activity:', error);
    }
  }, [currentUser]);

  const logLogin = useCallback(() => {
    return logActivity({ actionType: 'login' });
  }, [logActivity]);

  const logLogout = useCallback(() => {
    return logActivity({ actionType: 'logout' });
  }, [logActivity]);

  const logClientAction = useCallback((
    action: 'create_client' | 'update_client' | 'delete_client',
    clientId: string,
    clientName: string,
    details?: Record<string, any>
  ) => {
    return logActivity({
      actionType: action,
      entityType: 'client',
      entityId: clientId,
      entityName: clientName,
      details,
    });
  }, [logActivity]);

  const logOrderAction = useCallback((
    action: 'create_order' | 'update_order' | 'delete_order' | 'update_payment',
    orderId: string,
    orderRef: string,
    details?: Record<string, any>
  ) => {
    return logActivity({
      actionType: action,
      entityType: 'order',
      entityId: orderId,
      entityName: orderRef,
      details,
    });
  }, [logActivity]);

  return {
    logActivity,
    logLogin,
    logLogout,
    logClientAction,
    logOrderAction,
  };
}
