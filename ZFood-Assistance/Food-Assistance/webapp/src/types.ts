export interface Client {
  id: string;
  name: string;
  quartier: string;
  phone: string;
  createdAt: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  quantity: number;
  amount: number;
  paidAmount: number;
  isPaid: boolean;
  paidAt?: string;
  date: string;
  collectionDate: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  adminId: string;
  adminName: string;
  adminEmail: string;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  unpaidTotal: number;
  paidTotal: number;
  totalClients: number;
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
}
