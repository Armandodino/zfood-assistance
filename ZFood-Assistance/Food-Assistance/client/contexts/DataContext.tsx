import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getApiUrl } from "@/lib/query-client";

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

interface DataContextType {
  clients: Client[];
  orders: Order[];
  isLoading: boolean;
  addClient: (client: Omit<Client, "id" | "createdAt">) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addOrder: (order: Omit<Order, "id" | "createdAt">) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  getClientOrders: (clientId: string) => Order[];
  getClientOrderCount: (clientId: string) => number;
  getTotalRevenue: () => number;
  getUnpaidTotal: () => number;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiUrl = getApiUrl();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [clientsRes, ordersRes] = await Promise.all([
        fetch(`${apiUrl}/api/clients`),
        fetch(`${apiUrl}/api/orders`),
      ]);
      
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Error loading data from server:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const addClient = useCallback(async (client: Omit<Client, "id" | "createdAt">) => {
    try {
      const res = await fetch(`${apiUrl}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error adding client:", error);
    }
  }, [apiUrl, loadData]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      const res = await fetch(`${apiUrl}/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error updating client:", error);
    }
  }, [apiUrl, loadData]);

  const deleteClient = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  }, [apiUrl, loadData]);

  const addOrder = useCallback(async (order: Omit<Order, "id" | "createdAt">) => {
    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error adding order:", error);
    }
  }, [apiUrl, loadData]);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    try {
      const res = await fetch(`${apiUrl}/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  }, [apiUrl, loadData]);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/orders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  }, [apiUrl, loadData]);

  const getClientOrders = useCallback((clientId: string) => {
    return orders.filter((o) => o.clientId === clientId).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [orders]);

  const getClientOrderCount = useCallback((clientId: string) => {
    return orders.filter((o) => o.clientId === clientId).reduce((sum, o) => sum + (o.quantity || 1), 0);
  }, [orders]);

  const getTotalRevenue = useCallback(() => {
    return orders.filter((o) => o.isPaid).reduce((sum, o) => sum + o.amount, 0);
  }, [orders]);

  const getUnpaidTotal = useCallback(() => {
    return orders.filter((o) => !o.isPaid).reduce((sum, o) => sum + (o.amount - (o.paidAmount || 0)), 0);
  }, [orders]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return (
    <DataContext.Provider
      value={{
        clients,
        orders,
        isLoading,
        addClient,
        updateClient,
        deleteClient,
        addOrder,
        updateOrder,
        deleteOrder,
        getClientOrders,
        getClientOrderCount,
        getTotalRevenue,
        getUnpaidTotal,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
