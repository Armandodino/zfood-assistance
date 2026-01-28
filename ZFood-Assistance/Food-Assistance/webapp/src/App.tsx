import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Users, ShoppingCart, TrendingUp, AlertCircle, 
  CheckCircle, Clock, Activity, RefreshCw, Menu, X,
  Plus, Sparkles, Award, Target, Gift, Loader2, Eye, LogOut,
  Package, Factory, AlertTriangle, FileText, Calendar, Edit, Trash2
} from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  fetchClients, fetchOrders, fetchActivityLogs, updateOrderPayment, 
  createClient, createOrder, getAIAdvice, fetchStock, updateStock, 
  fetchProduction, addProduction, deleteProduction, fetchClientOrders, updateClient, deleteClient,
  deleteActivityLog, deleteOldActivityLogs, deleteAllActivityLogs, fetchUsers, updateUser, loginUser,
  type StockConfig, type DailyProduction, type ClientOrderSummary, type User
} from './api';
import type { Client, Order, ActivityLog, DashboardStats } from './types';

const COLORS = {
  primary: '#16a34a',
  accent: '#f97316',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#eab308',
  info: '#3b82f6',
};

const BASKET_GOAL = 120;
const BASKET_PRICE = 5000;

type Admin = User;

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activityData, setActivityData] = useState<{
    recentLogins: ActivityLog[];
    recentActions: ActivityLog[];
    actionsByAdmin: { adminId: string; name: string; count: number; lastAction: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'orders' | 'stock' | 'supervision' | 'ai' | 'accounts'>('dashboard');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<{ id: string; name: string; email: string; password: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAddProduction, setShowAddProduction] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState<string | null>(null);
  const [clientDetail, setClientDetail] = useState<ClientOrderSummary | null>(null);
  const [loadingClientDetail, setLoadingClientDetail] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', quartier: '', phone: '' });
  const [showEditClient, setShowEditClient] = useState<string | null>(null);
  const [editClientData, setEditClientData] = useState({ name: '', quartier: '', phone: '' });
  const [showDeleteClient, setShowDeleteClient] = useState<string | null>(null);
  const [newOrder, setNewOrder] = useState({ clientId: '', quantity: 1, paymentType: 'unpaid' as 'unpaid' | 'partial' | 'full', paidAmount: 0, date: format(new Date(), 'yyyy-MM-dd') });
  const [newProduction, setNewProduction] = useState({ date: format(new Date(), 'yyyy-MM-dd'), basketsProduced: 0, notes: '' });
  const [stock, setStock] = useState<StockConfig | null>(null);
  const [production, setProduction] = useState<DailyProduction[]>([]);
  
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const session = localStorage.getItem('zfood_session');
    if (session) {
      const { admin, expiresAt } = JSON.parse(session);
      if (new Date(expiresAt) > new Date()) {
        return true;
      }
      localStorage.removeItem('zfood_session');
    }
    return false;
  });
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; name: string; email: string; isSudo?: boolean } | null>(() => {
    const session = localStorage.getItem('zfood_session');
    if (session) {
      const { admin, expiresAt } = JSON.parse(session);
      if (new Date(expiresAt) > new Date()) {
        return admin;
      }
    }
    return null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const resetInactivityTimer = () => {
    if (currentAdmin) {
      const expiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT).toISOString();
      localStorage.setItem('zfood_session', JSON.stringify({ admin: currentAdmin, expiresAt }));
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, handleActivity));
    
    const checkSession = setInterval(() => {
      const session = localStorage.getItem('zfood_session');
      if (session) {
        const { expiresAt } = JSON.parse(session);
        if (new Date(expiresAt) <= new Date()) {
          handleLogout();
        }
      }
    }, 30000);
    
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInterval(checkSession);
    };
  }, [currentAdmin]);

  const handleLogin = async () => {
    setLoadingLogin(true);
    setLoginError('');
    
    try {
      const user = await loginUser(loginEmail, loginPassword);
      const adminData = { id: user.id, name: user.name, email: user.email, isSudo: user.isSudo };
      const expiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT).toISOString();
      localStorage.setItem('zfood_session', JSON.stringify({ admin: adminData, expiresAt }));
      setCurrentAdmin(adminData);
      setLoadingLogin(false);
      setLoading(true);
      setIsLoggedIn(true);
      setLoginEmail('');
      setLoginPassword('');
      await loadData();
    } catch (error: any) {
      setLoginError(error.message || 'Email ou mot de passe incorrect');
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zfood_session');
    setIsLoggedIn(false);
    setCurrentAdmin(null);
    setActiveTab('dashboard');
  };

  const requestAuth = (action: () => void) => {
    setPendingAction(() => action);
    setShowSecurityModal(true);
    setSecurityPassword('');
    setSecurityError('');
  };

  const validateSecurity = async () => {
    if (!currentAdmin?.email) {
      setSecurityError('Erreur: Utilisateur non connecté');
      return;
    }
    try {
      await loginUser(currentAdmin.email, securityPassword);
      setShowSecurityModal(false);
      setSecurityPassword('');
      setSecurityError('');
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch {
      setSecurityError('Mot de passe incorrect');
    }
  };

  const cancelSecurity = () => {
    setShowSecurityModal(false);
    setSecurityPassword('');
    setSecurityError('');
    setPendingAction(null);
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [clientsData, ordersData, logsData, stockData, productionData, usersData] = await Promise.all([
        fetchClients(),
        fetchOrders(),
        fetchActivityLogs().catch(() => null),
        fetchStock().catch(() => null),
        fetchProduction().catch(() => []),
        fetchUsers().catch(() => []),
      ]);
      setClients(clientsData);
      setOrders(ordersData);
      setActivityData(logsData);
      if (stockData) setStock(stockData);
      setProduction(productionData);
      if (usersData.length > 0) setAdmins(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewClientDetail = async (clientId: string) => {
    setShowClientDetail(clientId);
    setLoadingClientDetail(true);
    setClientDetail(null);
    try {
      const detail = await fetchClientOrders(clientId);
      setClientDetail(detail);
    } catch (error) {
      console.error('Error fetching client detail:', error);
    } finally {
      setLoadingClientDetail(false);
    }
  };

  const handleAddProduction = async () => {
    if (!newProduction.date || newProduction.basketsProduced <= 0) return;
    try {
      await addProduction(newProduction, currentAdmin?.id || 'admin', currentAdmin?.name || 'Admin Bureau');
      setNewProduction({ date: format(new Date(), 'yyyy-MM-dd'), basketsProduced: 0, notes: '' });
      setShowAddProduction(false);
      loadData();
    } catch (error) {
      console.error('Error adding production:', error);
    }
  };

  const handleDeleteProduction = async (productionId: string) => {
    if (!currentAdmin?.isSudo) {
      alert('Seuls les administrateurs sudo peuvent supprimer une production');
      return;
    }
    if (!confirm('Voulez-vous vraiment supprimer cette production ? Le stock sera ajusté.')) return;
    try {
      await deleteProduction(productionId, currentAdmin?.id || 'admin', currentAdmin?.name || 'Admin');
      loadData();
    } catch (error) {
      console.error('Error deleting production:', error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats: DashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.date.startsWith(today));
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthOrders = orders.filter(o => {
      const orderDate = parseISO(o.date);
      return isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
    });
    
    return {
      totalRevenue: orders.reduce((sum, o) => sum + o.amount, 0),
      unpaidTotal: orders.filter(o => !o.isPaid).reduce((sum, o) => sum + o.amount, 0),
      paidTotal: orders.filter(o => o.isPaid).reduce((sum, o) => sum + o.amount, 0),
      totalClients: clients.length,
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + o.amount, 0),
      monthOrders: monthOrders.length,
      monthRevenue: monthOrders.reduce((sum, o) => sum + o.amount, 0),
      monthBaskets: monthOrders.reduce((sum, o) => sum + o.quantity, 0),
    };
  }, [clients, orders]);

  const revenueByDay = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });
    
    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.date.startsWith(date));
      return {
        date: format(parseISO(date), 'EEE', { locale: fr }),
        fullDate: date,
        revenue: dayOrders.reduce((sum, o) => sum + o.amount, 0),
        orders: dayOrders.length,
        paid: dayOrders.filter(o => o.isPaid).reduce((sum, o) => sum + o.amount, 0),
        unpaid: dayOrders.filter(o => !o.isPaid).reduce((sum, o) => sum + o.amount, 0),
      };
    });
  }, [orders]);

  const paymentDistribution = useMemo(() => [
    { name: 'Payé', value: stats.paidTotal, color: COLORS.success },
    { name: 'Impayé', value: stats.unpaidTotal, color: COLORS.danger },
  ], [stats]);

  const topClients = useMemo(() => {
    const clientOrders = clients.map(client => {
      const clientOrderList = orders.filter(o => o.clientId === client.id);
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const monthBaskets = clientOrderList
        .filter(o => isWithinInterval(parseISO(o.date), { start: monthStart, end: monthEnd }))
        .reduce((sum, o) => sum + o.quantity, 0);
      
      return {
        ...client,
        orderCount: clientOrderList.length,
        totalSpent: clientOrderList.reduce((sum, o) => sum + o.amount, 0),
        monthBaskets,
        progress: Math.min((monthBaskets / BASKET_GOAL) * 100, 100),
      };
    });
    return clientOrders.sort((a, b) => b.monthBaskets - a.monthBaskets).slice(0, 10);
  }, [clients, orders]);

  const ordersByQuartier = useMemo(() => {
    const quartierMap: Record<string, number> = {};
    orders.forEach(order => {
      const client = clients.find(c => c.id === order.clientId);
      const quartier = client?.quartier || 'Inconnu';
      quartierMap[quartier] = (quartierMap[quartier] || 0) + order.amount;
    });
    return Object.entries(quartierMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [clients, orders]);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    if (orderFilter === 'paid') filtered = filtered.filter(o => o.isPaid);
    if (orderFilter === 'unpaid') filtered = filtered.filter(o => !o.isPaid);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, orderFilter]);

  const handlePaymentToggle = async (orderId: string, currentStatus: boolean) => {
    try {
      await updateOrderPayment(orderId, !currentStatus);
      loadData();
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.quartier) return;
    try {
      await createClient(newClient);
      setNewClient({ name: '', quartier: '', phone: '' });
      setShowAddClient(false);
      await loadData();
      showSuccess('Client ajouté avec succès !');
      setActiveTab('clients');
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditClientData({ name: client.name, quartier: client.quartier, phone: client.phone || '' });
    setShowEditClient(client.id);
  };

  const handleUpdateClient = async () => {
    if (!showEditClient || !editClientData.name || !editClientData.quartier) return;
    try {
      await updateClient(showEditClient, editClientData);
      setShowEditClient(null);
      setEditClientData({ name: '', quartier: '', phone: '' });
      loadData();
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleDeleteClient = async () => {
    if (!showDeleteClient) return;
    try {
      await deleteClient(showDeleteClient);
      setShowDeleteClient(null);
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleAddOrder = async () => {
    if (!newOrder.clientId) return;
    const client = clients.find(c => c.id === newOrder.clientId);
    if (!client) return;
    
    try {
      const totalAmount = newOrder.quantity * BASKET_PRICE;
      const actualPaidAmount = newOrder.paymentType === 'full' ? totalAmount : (newOrder.paymentType === 'partial' ? newOrder.paidAmount : 0);
      const collectionDate = new Date(newOrder.date);
      collectionDate.setDate(collectionDate.getDate() + 3);
      
      await createOrder({
        clientId: newOrder.clientId,
        clientName: client.name,
        quantity: newOrder.quantity,
        amount: totalAmount,
        paidAmount: actualPaidAmount,
        isPaid: actualPaidAmount >= totalAmount,
        date: newOrder.date,
        collectionDate: actualPaidAmount >= totalAmount ? newOrder.date : format(collectionDate, 'yyyy-MM-dd'),
      });
      setNewOrder({ clientId: '', quantity: 1, paymentType: 'unpaid', paidAmount: 0, date: format(new Date(), 'yyyy-MM-dd') });
      setShowAddOrder(false);
      await loadData();
      showSuccess('Commande ajoutée avec succès !');
      setActiveTab('orders');
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const advice = await getAIAdvice(stats);
      setAiAdvice(advice);
    } catch (error) {
      console.error('Error getting AI advice:', error);
      setAiAdvice('Erreur lors de la génération des conseils. Veuillez réessayer.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <img 
                src="/zfood-logo.png" 
                alt="ZFood Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg shadow-primary-500/30 object-cover"
              />
              <h1 className="text-3xl font-bold text-slate-800">ZFood</h1>
              <p className="text-slate-500 mt-2">Dashboard Bureau</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input 
                  type="email" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="votre@email.ci"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Entrez votre mot de passe"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                {loginError && (
                  <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                    <AlertCircle size={14} />
                    {loginError}
                  </div>
                )}
              </div>
              <button 
                onClick={handleLogin}
                disabled={loadingLogin}
                className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loadingLogin ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                ZFood Assistance v2.0 - Gestion Attiéké
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <img 
              src="/zfood-logo.png" 
              alt="ZFood Logo" 
              className="w-28 h-28 mx-auto rounded-2xl shadow-2xl object-cover animate-pulse"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Loader2 size={24} className="text-primary-500 animate-spin" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ZFood</h1>
          <p className="text-white/80 font-medium">Chargement du tableau de bord...</p>
          <div className="mt-6 flex justify-center gap-1">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <img src="/zfood-logo.png" alt="ZFood" className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <h1 className="font-bold text-slate-800">ZFood</h1>
                <p className="text-xs text-slate-500">Dashboard Bureau</p>
              </div>
            </div>
          ) : (
            <img src="/zfood-logo.png" alt="ZFood" className="w-10 h-10 rounded-xl object-cover" />
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Tableau de bord', sudoOnly: false },
            { id: 'clients', icon: Users, label: 'Clients', sudoOnly: false },
            { id: 'orders', icon: ShoppingCart, label: 'Commandes', sudoOnly: false },
            { id: 'stock', icon: Package, label: 'Stock & Production', sudoOnly: false },
            { id: 'supervision', icon: Eye, label: 'Supervision', sudoOnly: true },
            { id: 'accounts', icon: Users, label: 'Comptes', sudoOnly: true },
            { id: 'ai', icon: Sparkles, label: 'Conseils IA', sudoOnly: false },
          ].filter(item => !item.sudoOnly || currentAdmin?.isSudo).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            onClick={() => setShowAddClient(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all"
          >
            <Plus size={18} />
            {sidebarOpen && <span>Nouveau client</span>}
          </button>
          <button
            onClick={() => setShowAddOrder(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-all"
            style={{ backgroundColor: COLORS.accent }}
          >
            <ShoppingCart size={18} />
            {sidebarOpen && <span>Nouvelle commande</span>}
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {sidebarOpen && <span>Actualiser</span>}
          </button>
          <button
            onClick={() => {
              if (confirm('Voulez-vous vraiment vous déconnecter?')) {
                handleLogout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-all"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {activeTab === 'dashboard' && 'Tableau de bord'}
                {activeTab === 'clients' && 'Gestion des clients'}
                {activeTab === 'orders' && 'Suivi des commandes'}
                {activeTab === 'stock' && 'Stock & Production'}
                {activeTab === 'supervision' && 'Supervision des agents'}
                {activeTab === 'accounts' && 'Gestion des comptes'}
                {activeTab === 'ai' && 'Conseils IA'}
              </h2>
              <p className="text-slate-500 text-sm">
                {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Paniers vendus ce mois</p>
              <p className="font-bold text-primary-600">{(stats as any).monthBaskets || 0} paniers</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenu Total" value={`${stats.totalRevenue.toLocaleString()} F`} icon={TrendingUp} color="primary" subtitle={`${stats.totalOrders} commandes`} />
                <StatCard title="Montant Payé" value={`${stats.paidTotal.toLocaleString()} F`} icon={CheckCircle} color="success" subtitle={`${((stats.paidTotal / stats.totalRevenue) * 100 || 0).toFixed(0)}% du total`} />
                <StatCard title="Montant Impayé" value={`${stats.unpaidTotal.toLocaleString()} F`} icon={AlertCircle} color="danger" subtitle={`${orders.filter(o => !o.isPaid).length} commandes`} />
                <StatCard title="Clients Actifs" value={stats.totalClients.toString()} icon={Users} color="info" subtitle="clients enregistrés" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Aujourd'hui" value={`${stats.todayRevenue.toLocaleString()} F`} icon={Clock} color="accent" subtitle={`${stats.todayOrders} commandes`} />
                <StatCard title="Ce mois" value={`${((stats as any).monthRevenue || 0).toLocaleString()} F`} icon={Target} color="primary" subtitle={`${(stats as any).monthOrders || 0} commandes`} />
                <StatCard title="Paniers du mois" value={((stats as any).monthBaskets || 0).toString()} icon={Gift} color="success" subtitle={`sur ${BASKET_GOAL} objectif`} />
                <StatCard title="Ticket moyen" value={`${Math.round(stats.totalRevenue / (stats.totalOrders || 1)).toLocaleString()} F`} icon={Award} color="info" subtitle="par commande" />
              </div>

              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Ventes du mois</h3>
                    <p className="text-primary-100">{((stats as any).monthBaskets || 0)} paniers vendus (à 5000 F/panier)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{((stats as any).monthBaskets || 0) * BASKET_PRICE / 1000}K F</p>
                    <p className="text-primary-100">CA du mois</p>
                  </div>
                </div>
                <p className="text-sm text-primary-100 mt-2 flex items-center gap-2">
                  <Gift size={16} />
                  Chaque client qui atteint {BASKET_GOAL} paniers ce mois reçoit un panier cadeau!
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenus des 7 derniers jours</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString()} F`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Répartition paiements</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} F`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    {paymentDistribution.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-slate-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Programme fidélité - Top 10</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {topClients.map((client, index) => (
                      <div key={client.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{client.name}</p>
                              <p className="text-xs text-slate-500">{client.quartier}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary-600">{client.monthBaskets} paniers</p>
                            <p className="text-xs text-slate-500">ce mois</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`rounded-full h-2 transition-all ${client.progress >= 100 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                            style={{ width: `${client.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {client.progress >= 100 ? '🎉 Objectif 120 atteint!' : `${BASKET_GOAL - client.monthBaskets} paniers restants`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Ventes par quartier</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ordersByQuartier} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" width={100} />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} F`} />
                      <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Liste des clients ({clients.length})</h3>
                <button onClick={() => setShowAddClient(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                  <Plus size={18} /> Ajouter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Quartier</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Téléphone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Commandes</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Ce mois</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Progression</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map(client => {
                      const clientOrders = orders.filter(o => o.clientId === client.id);
                      const monthStart = startOfMonth(new Date());
                      const monthEnd = endOfMonth(new Date());
                      const monthBaskets = clientOrders.filter(o => isWithinInterval(parseISO(o.date), { start: monthStart, end: monthEnd })).reduce((sum, o) => sum + o.quantity, 0);
                      const progress = Math.min((monthBaskets / BASKET_GOAL) * 100, 100);
                      
                      return (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-600 font-semibold">{client.name.charAt(0)}</span>
                              </div>
                              <span className="font-medium text-slate-800">{client.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{client.quartier}</td>
                          <td className="px-6 py-4 text-slate-600">{client.phone || '-'}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                              {clientOrders.length}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{monthBaskets} paniers</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-200 rounded-full h-2">
                                <div className={`rounded-full h-2 ${progress >= 100 ? 'bg-yellow-500' : 'bg-primary-500'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                              <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 flex-nowrap">
                              <button
                                onClick={() => handleViewClientDetail(client.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-medium whitespace-nowrap"
                                title="Voir détails"
                              >
                                <FileText size={12} />
                                <span className="hidden lg:inline">Détail</span>
                              </button>
                              {currentAdmin?.isSudo && (
                                <>
                                  <button
                                    onClick={() => handleEditClient(client)}
                                    className="flex items-center justify-center w-8 h-8 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                                    title="Modifier"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteClient(client.id)}
                                    className="flex items-center justify-center w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                  {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'paid', label: 'Payées' },
                    { id: 'unpaid', label: 'Impayées' },
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setOrderFilter(filter.id as typeof orderFilter)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${orderFilter === filter.id ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAddOrder(true)} className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600" style={{ backgroundColor: COLORS.accent }}>
                  <Plus size={18} /> Nouvelle commande
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Client</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Quantité</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Montant</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{order.clientName}</td>
                          <td className="px-6 py-4 text-slate-600">{format(parseISO(order.date), 'dd MMM yyyy', { locale: fr })}</td>
                          <td className="px-6 py-4 text-slate-600">{order.quantity} panier(s)</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{order.amount.toLocaleString()} F</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {order.isPaid ? <CheckCircle size={14} /> : <Clock size={14} />}
                              {order.isPaid ? 'Payée' : 'Impayée'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {currentAdmin?.isSudo ? (
                              <button onClick={() => requestAuth(() => handlePaymentToggle(order.id, order.isPaid))} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${order.isPaid ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-primary-500 text-white hover:bg-primary-600'}`}>
                                {order.isPaid ? 'Annuler' : 'Marquer payée'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">Sudo requis</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        (stock?.currentStock || 0) <= (stock?.minStockAlert || 10) ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <Package className={(stock?.currentStock || 0) <= (stock?.minStockAlert || 10) ? 'text-red-600' : 'text-green-600'} size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Stock actuel</p>
                        <p className="text-2xl font-bold text-slate-800">{stock?.currentStock || 0} paniers</p>
                      </div>
                    </div>
                  </div>
                  {(stock?.currentStock || 0) <= (stock?.minStockAlert || 10) && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700">
                      <AlertTriangle size={18} />
                      <span className="text-sm font-medium">Stock faible! Seuil: {stock?.minStockAlert || 10}</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Factory className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Production du jour</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {production.find(p => p.date === format(new Date(), 'yyyy-MM-dd'))?.basketsProduced || 0} paniers
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Prix panier</p>
                      <p className="text-2xl font-bold text-slate-800">{stock?.basketPrice || 5000} F</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Historique de production</h3>
                <button
                  onClick={() => setShowAddProduction(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  <Plus size={18} /> Nouvelle production
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Produits</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Vendus</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Stock avant</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Stock après</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Admin</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Notes</th>
                        {currentAdmin?.isSudo && <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {production.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-800">{format(parseISO(record.date), 'dd MMM yyyy', { locale: fr })}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">+{record.basketsProduced}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">-{record.basketsSold}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{record.stockBefore}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{record.stockAfter}</td>
                          <td className="px-6 py-4 text-slate-600">{record.adminName}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{record.notes || '-'}</td>
                          {currentAdmin?.isSudo && (
                            <td className="px-6 py-4">
                              <button
                                onClick={() => requestAuth(() => handleDeleteProduction(record.id))}
                                className="flex items-center justify-center w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {production.length === 0 && (
                        <tr>
                          <td colSpan={currentAdmin?.isSudo ? 8 : 7} className="px-6 py-12 text-center text-slate-500">
                            Aucune production enregistrée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'supervision' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Les logs de plus de 3 jours sont automatiquement supprimés.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (confirm('Supprimer les logs de plus de 3 jours ?')) {
                        await deleteOldActivityLogs();
                        loadData();
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    Nettoyer anciens
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Supprimer TOUS les logs d\'activité ? Cette action est irréversible.')) {
                        await deleteAllActivityLogs();
                        loadData();
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    Tout supprimer
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activityData?.actionsByAdmin.map(admin => (
                  <div key={admin.adminId} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="text-primary-600" size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{admin.name}</h4>
                        <p className="text-sm text-slate-500">{admin.count} actions</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Dernière activité: {format(parseISO(admin.lastAction), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Historique des activités</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityData?.recentActions.map(action => (
                    <div key={action.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        action.actionType === 'login' ? 'bg-green-100' : action.actionType === 'logout' ? 'bg-slate-100' : action.actionType.includes('create') ? 'bg-blue-100' : action.actionType.includes('update') ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        <Activity size={18} className={action.actionType === 'login' ? 'text-green-600' : action.actionType === 'logout' ? 'text-slate-600' : action.actionType.includes('create') ? 'text-blue-600' : action.actionType.includes('update') ? 'text-yellow-600' : 'text-red-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{action.adminName}</p>
                          <p className="text-xs text-slate-400">{format(parseISO(action.createdAt), 'dd/MM HH:mm', { locale: fr })}</p>
                        </div>
                        <p className="text-sm text-slate-600">{action.actionType.replace('_', ' ')}{action.entityName && ` - ${action.entityName}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Comptes administrateurs</h3>
                <div className="space-y-4">
                  {admins.map((admin: typeof admins[0]) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${admin.isSudo ? 'bg-amber-100' : 'bg-primary-100'}`}>
                          <Users className={admin.isSudo ? 'text-amber-600' : 'text-primary-600'} size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800">{admin.name}</h4>
                            {admin.isSudo && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Sudo</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingAdmin({ id: admin.id, name: admin.name, email: admin.email, password: '' })}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-sm font-medium"
                      >
                        <Edit size={14} />
                        Modifier
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Note :</strong> Les modifications des comptes sont enregistrées localement sur cet appareil.
                </p>
              </div>
            </div>
          )}

          {editingAdmin && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Modifier le compte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={editingAdmin.name}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingAdmin.email}
                      onChange={(e) => currentAdmin?.isSudo && setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                      disabled={!currentAdmin?.isSudo}
                      className={`w-full px-4 py-2 border border-slate-300 rounded-lg ${
                        currentAdmin?.isSudo 
                          ? 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500' 
                          : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                      }`}
                    />
                    {!currentAdmin?.isSudo && (
                      <p className="text-xs text-amber-600 mt-1">Seul le Super Admin peut modifier l'email</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={editingAdmin.password}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                      placeholder="Laisser vide pour ne pas changer"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditingAdmin(null)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const updateData: Partial<Admin> = {
                          name: editingAdmin.name,
                        };
                        if (currentAdmin?.isSudo && editingAdmin.email) {
                          updateData.email = editingAdmin.email;
                        }
                        if (editingAdmin.password) {
                          updateData.password = editingAdmin.password;
                        }
                        await updateUser(editingAdmin.id, updateData);
                        await loadData();
                        setEditingAdmin(null);
                      } catch (error) {
                        console.error('Error updating admin:', error);
                        alert('Erreur lors de la mise à jour');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Assistant IA Business</h3>
                    <p className="text-purple-100">Conseils personnalisés pour maximiser vos revenus</p>
                  </div>
                </div>
                <button
                  onClick={handleGetAdvice}
                  disabled={loadingAdvice}
                  className="w-full py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                >
                  {loadingAdvice ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Obtenir des conseils personnalisés
                    </>
                  )}
                </button>
              </div>

              {aiAdvice && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Sparkles className="text-purple-500" size={20} />
                    Conseils pour ZFood
                  </h3>
                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{aiAdvice}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Résumé des données analysées</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-slate-600">Revenu total</span><span className="font-semibold">{stats.totalRevenue.toLocaleString()} F</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Taux de paiement</span><span className="font-semibold">{((stats.paidTotal / stats.totalRevenue) * 100 || 0).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Clients actifs</span><span className="font-semibold">{stats.totalClients}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Paniers ce mois</span><span className="font-semibold">{(stats as any).monthBaskets || 0}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Points à améliorer</h4>
                  <div className="space-y-3">
                    {stats.unpaidTotal > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle size={16} />
                        <span>{stats.unpaidTotal.toLocaleString()} F impayés</span>
                      </div>
                    )}
                    {((stats as any).monthBaskets || 0) < BASKET_GOAL && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Target size={16} />
                        <span>{BASKET_GOAL - ((stats as any).monthBaskets || 0)} paniers pour l'objectif</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-blue-600">
                      <TrendingUp size={16} />
                      <span>Ticket moyen: {Math.round(stats.totalRevenue / (stats.totalOrders || 1)).toLocaleString()} F</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Nouveau client</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Nom du client" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quartier *</label>
                <input type="text" value={newClient.quartier} onChange={(e) => setNewClient({ ...newClient, quartier: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Quartier" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input type="tel" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Numéro de téléphone" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddClient(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => requestAuth(handleAddClient)} disabled={!newClient.name || !newClient.quartier} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {showEditClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Modifier le client</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input type="text" value={editClientData.name} onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Nom du client" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quartier *</label>
                <input type="text" value={editClientData.quartier} onChange={(e) => setEditClientData({ ...editClientData, quartier: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Quartier" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input type="tel" value={editClientData.phone} onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Numéro de téléphone" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditClient(null)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => requestAuth(handleUpdateClient)} disabled={!editClientData.name || !editClientData.quartier} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Supprimer le client</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et supprimera également toutes ses commandes.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteClient(null)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => requestAuth(handleDeleteClient)} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {showAddOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Nouvelle commande</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                <select value={newOrder.clientId} onChange={(e) => setNewOrder({ ...newOrder, clientId: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.quartier}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantité (paniers)</label>
                <input type="number" min="1" value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                <p className="text-sm text-slate-500 mt-1">Montant: {(newOrder.quantity * BASKET_PRICE).toLocaleString()} F</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={newOrder.date} onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Statut de paiement</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewOrder({ ...newOrder, paymentType: 'unpaid', paidAmount: 0 })} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${newOrder.paymentType === 'unpaid' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    Impayé
                  </button>
                  <button type="button" onClick={() => setNewOrder({ ...newOrder, paymentType: 'partial' })} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${newOrder.paymentType === 'partial' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    Partiel
                  </button>
                  <button type="button" onClick={() => setNewOrder({ ...newOrder, paymentType: 'full', paidAmount: newOrder.quantity * BASKET_PRICE })} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${newOrder.paymentType === 'full' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    Payé
                  </button>
                </div>
                {newOrder.paymentType === 'partial' && (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-600 mb-1">Montant reçu (sur {(newOrder.quantity * BASKET_PRICE).toLocaleString()} F)</label>
                    <input type="number" min="0" max={newOrder.quantity * BASKET_PRICE} value={newOrder.paidAmount} onChange={(e) => setNewOrder({ ...newOrder, paidAmount: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Montant payé" />
                    {newOrder.paidAmount > 0 && newOrder.paidAmount < newOrder.quantity * BASKET_PRICE && (
                      <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                        <Clock size={14} /> Reste à payer: {(newOrder.quantity * BASKET_PRICE - newOrder.paidAmount).toLocaleString()} F (encaissement dans 3 jours)
                      </p>
                    )}
                  </div>
                )}
                {newOrder.paymentType === 'unpaid' && (
                  <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                    <Calendar size={14} /> Encaissement prévu dans 3 jours
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddOrder(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => requestAuth(handleAddOrder)} disabled={!newOrder.clientId} className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: COLORS.accent }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {showAddProduction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Nouvelle production</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input type="date" value={newProduction.date} onChange={(e) => setNewProduction({ ...newProduction, date: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paniers produits *</label>
                <input type="number" min="1" value={newProduction.basketsProduced} onChange={(e) => setNewProduction({ ...newProduction, basketsProduced: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Nombre de paniers" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={newProduction.notes} onChange={(e) => setNewProduction({ ...newProduction, notes: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Notes optionnelles" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddProduction(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={() => requestAuth(handleAddProduction)} disabled={!newProduction.date || newProduction.basketsProduced <= 0} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {showClientDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
            {loadingClientDetail ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={48} className="animate-spin text-primary-500 mb-4" />
                <p className="text-slate-600 font-medium">Chargement des détails...</p>
              </div>
            ) : clientDetail ? (
              <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{clientDetail.client.name}</h3>
                <p className="text-slate-500">{clientDetail.client.quartier} - {clientDetail.client.phone || 'Pas de téléphone'}</p>
              </div>
              <button onClick={() => setShowClientDetail(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{clientDetail.totalOrders}</p>
                <p className="text-sm text-slate-500">Commandes</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{clientDetail.totalBaskets}</p>
                <p className="text-sm text-slate-500">Paniers</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{clientDetail.totalPaid.toLocaleString()} F</p>
                <p className="text-sm text-slate-500">Payé</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{clientDetail.totalUnpaid.toLocaleString()} F</p>
                <p className="text-sm text-slate-500">Impayé</p>
              </div>
            </div>

            <h4 className="font-semibold text-slate-800 mb-3">Historique des commandes</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Paniers</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientDetail.orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{format(parseISO(order.date), 'dd/MM/yyyy', { locale: fr })}</td>
                      <td className="px-4 py-3 text-slate-600">{order.quantity}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{order.amount.toLocaleString()} F</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {order.isPaid ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {order.isPaid ? 'Payée' : 'Impayée'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">Client non trouvé</p>
                <button onClick={() => setShowClientDetail(null)} className="mt-4 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}


      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Validation requise</h3>
                <p className="text-sm text-slate-500">Entrez votre mot de passe pour confirmer</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mot de passe ({currentAdmin?.name})
                </label>
                <input 
                  type="password" 
                  value={securityPassword} 
                  onChange={(e) => setSecurityPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && validateSecurity()}
                  placeholder="Entrez votre mot de passe"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
                {securityError && <p className="text-red-500 text-sm mt-2">{securityError}</p>}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={cancelSecurity}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button 
                  onClick={validateSecurity}
                  className="flex-1 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle }: { title: string; value: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: 'primary' | 'success' | 'danger' | 'info' | 'accent'; subtitle: string; }) {
  const colors = { primary: 'bg-primary-500 shadow-primary-500/30', success: 'bg-green-500 shadow-green-500/30', danger: 'bg-red-500 shadow-red-500/30', info: 'bg-blue-500 shadow-blue-500/30', accent: 'bg-orange-500 shadow-orange-500/30' };
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

export default App;
