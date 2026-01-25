import type { Client, Order, ActivityLog } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://zfood-assistance.vercel.app/api';

export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(`${API_BASE}/clients`);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function fetchActivityLogs(): Promise<{
  recentLogins: ActivityLog[];
  recentActions: ActivityLog[];
  actionsByAdmin: { adminId: string; name: string; count: number; lastAction: string }[];
}> {
  const res = await fetch(`${API_BASE}/activity-logs/summary`, {
    headers: {
      'x-admin-password': 'ZFOOD',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch activity logs');
  return res.json();
}

export async function updateOrderPayment(orderId: string, isPaid: boolean): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': 'ZFOOD',
    },
    body: JSON.stringify({ isPaid }),
  });
  if (!res.ok) throw new Error('Failed to update order');
  return res.json();
}

export async function createClient(data: { name: string; quartier: string; phone: string }): Promise<Client> {
  const res = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...data, password: 'ZFOOD' }),
  });
  if (!res.ok) throw new Error('Failed to create client');
  return res.json();
}

export async function updateClient(clientId: string, data: { name?: string; quartier?: string; phone?: string }): Promise<Client> {
  const res = await fetch(`${API_BASE}/clients/${clientId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': 'ZFOOD',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update client');
  return res.json();
}

export async function deleteClient(clientId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/clients/${clientId}`, {
    method: 'DELETE',
    headers: {
      'x-admin-password': 'ZFOOD',
    },
  });
  if (!res.ok) throw new Error('Failed to delete client');
}

export async function createOrder(data: {
  clientId: string;
  clientName: string;
  quantity: number;
  amount: number;
  paidAmount: number;
  isPaid: boolean;
  date: string;
  collectionDate: string;
}): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...data, password: 'ZFOOD' }),
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}

export async function getAIAdvice(stats: {
  totalRevenue: number;
  paidTotal: number;
  unpaidTotal: number;
  totalClients: number;
  todayOrders: number;
  todayRevenue: number;
  totalOrders: number;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/ai-advice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stats }),
  });
  if (!res.ok) throw new Error('Failed to get AI advice');
  const data = await res.json();
  return data.advice;
}

export interface StockConfig {
  id: string;
  currentStock: number;
  minStockAlert: number;
  basketPrice: number;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
}

export interface DailyProduction {
  id: string;
  date: string;
  basketsProduced: number;
  basketsSold: number;
  stockBefore: number;
  stockAfter: number;
  notes: string | null;
  adminId: string;
  adminName: string;
  createdAt: string;
}

export interface ClientOrderSummary {
  client: Client;
  orders: Order[];
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  totalBaskets: number;
}

export async function fetchStock(): Promise<StockConfig> {
  const res = await fetch(`${API_BASE}/stock`);
  if (!res.ok) throw new Error('Failed to fetch stock');
  return res.json();
}

export async function updateStock(data: Partial<StockConfig>, adminId: string, adminName: string): Promise<StockConfig> {
  const res = await fetch(`${API_BASE}/stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': 'ZFOOD',
      'x-admin-id': adminId,
      'x-admin-name': adminName,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update stock');
  return res.json();
}

export async function fetchProduction(): Promise<DailyProduction[]> {
  const res = await fetch(`${API_BASE}/production`);
  if (!res.ok) throw new Error('Failed to fetch production');
  return res.json();
}

export async function addProduction(data: { date: string; basketsProduced: number; notes?: string }, adminId: string, adminName: string): Promise<DailyProduction> {
  const res = await fetch(`${API_BASE}/production`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': 'ZFOOD',
      'x-admin-id': adminId,
      'x-admin-name': adminName,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add production');
  return res.json();
}

export async function deleteProduction(productionId: string, adminId: string, adminName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/production/${productionId}`, {
    method: 'DELETE',
    headers: {
      'x-admin-password': 'ZFOOD',
      'x-admin-id': adminId,
      'x-admin-name': adminName,
    },
  });
  if (!res.ok) throw new Error('Failed to delete production');
}

export async function fetchClientOrders(clientId: string): Promise<ClientOrderSummary> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/orders`);
  if (!res.ok) throw new Error('Failed to fetch client orders');
  return res.json();
}

export async function deleteActivityLog(logId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/activity-logs?logId=${logId}`, {
    method: 'DELETE',
    headers: {
      'x-admin-password': 'ZFOOD',
    },
  });
  if (!res.ok) throw new Error('Failed to delete activity log');
}

export async function deleteOldActivityLogs(): Promise<void> {
  const res = await fetch(`${API_BASE}/activity-logs?deleteOld=true`, {
    method: 'DELETE',
    headers: {
      'x-admin-password': 'ZFOOD',
    },
  });
  if (!res.ok) throw new Error('Failed to delete old activity logs');
}

export async function deleteAllActivityLogs(): Promise<void> {
  const res = await fetch(`${API_BASE}/activity-logs`, {
    method: 'DELETE',
    headers: {
      'x-admin-password': 'ZFOOD',
    },
  });
  if (!res.ok) throw new Error('Failed to delete all activity logs');
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  isSudo: boolean;
  mustChangePassword?: boolean;
  fonction?: string;
  phone?: string;
  photo?: string;
  createdAt?: string;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Email ou mot de passe incorrect' }));
    throw new Error(error.error || 'Email ou mot de passe incorrect');
  }
  return res.json();
}
