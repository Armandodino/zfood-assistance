// Google Apps Script Web App Template for ZFood Assistance

export const APPS_SCRIPT_CODE = `
// Code.gs - Main Apps Script Code
const ADMIN_PASSWORD = "ZFOOD";
const MONTHLY_GOAL = 120;

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('ZFood Assistance - Tableau de Bord')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getClients() {
  const sheet = getSpreadsheet().getSheetByName('Clients');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  return data.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    quartier: row[2],
    phone: row[3],
    createdAt: row[4],
    totalOrders: row[5] || 0,
    totalBaskets: row[6] || 0,
    totalAmount: row[7] || 0,
    paidBaskets: row[8] || 0,
    unpaidBaskets: row[9] || 0,
    paidAmount: row[10] || 0,
    unpaidAmount: row[11] || 0,
    monthlyBaskets: row[12] || 0,
    goalReached: row[13] === 'ATTEINT',
    progress: row[14]
  }));
}

function getOrders() {
  const sheet = getSpreadsheet().getSheetByName('Commandes');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  return data.slice(1).map(row => ({
    id: row[0],
    clientName: row[1],
    quartier: row[2],
    quantity: row[3] || 1,
    amount: row[4],
    isPaid: row[5] === 'PAYE',
    date: row[6],
    paidAt: row[7],
    sameDay: row[8] === 'OUI'
  }));
}

function getStats() {
  const clients = getClients();
  const orders = getOrders();
  
  const totalBaskets = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalPaid = orders.filter(o => o.isPaid).reduce((sum, o) => sum + o.amount, 0);
  const totalUnpaid = orders.filter(o => !o.isPaid).reduce((sum, o) => sum + o.amount, 0);
  const unpaidCount = orders.filter(o => !o.isPaid).length;
  
  return {
    clientCount: clients.length,
    orderCount: orders.length,
    basketCount: totalBaskets,
    revenue: totalRevenue,
    paid: totalPaid,
    unpaid: totalUnpaid,
    unpaidCount: unpaidCount,
    monthlyGoal: MONTHLY_GOAL
  };
}

function verifyPassword(password) {
  return password === ADMIN_PASSWORD;
}

function addClient(name, quartier, phone, password) {
  if (!verifyPassword(password)) return { success: false, message: 'Mot de passe incorrect' };
  
  const sheet = getSpreadsheet().getSheetByName('Clients');
  if (!sheet) return { success: false, message: 'Feuille Clients introuvable' };
  
  const id = Utilities.getUuid().substring(0, 8);
  const date = new Date().toLocaleDateString('fr-FR');
  
  sheet.appendRow([id, name, quartier, phone, date, 0, 0, 0, 0, 0, 0, 0, 0, 'EN COURS', '0%']);
  
  return { success: true, message: 'Client ajoute avec succes' };
}

function addOrder(clientName, quantity, amount, isPaid, password) {
  if (!verifyPassword(password)) return { success: false, message: 'Mot de passe incorrect' };
  
  const sheet = getSpreadsheet().getSheetByName('Commandes');
  if (!sheet) return { success: false, message: 'Feuille Commandes introuvable' };
  
  const id = Utilities.getUuid().substring(0, 8);
  const date = new Date().toLocaleDateString('fr-FR');
  const status = isPaid ? 'PAYE' : 'IMPAYE';
  const paidAt = isPaid ? date : 'En attente';
  
  sheet.appendRow([id, clientName, '-', quantity, amount, status, date, paidAt, isPaid ? 'OUI' : '-']);
  
  return { success: true, message: 'Commande ajoutee avec succes' };
}

function updateOrderStatus(orderId, isPaid, password) {
  if (!verifyPassword(password)) return { success: false, message: 'Mot de passe incorrect' };
  
  const sheet = getSpreadsheet().getSheetByName('Commandes');
  if (!sheet) return { success: false, message: 'Feuille Commandes introuvable' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === orderId) {
      const status = isPaid ? 'PAYE' : 'IMPAYE';
      const paidAt = isPaid ? new Date().toLocaleDateString('fr-FR') : 'En attente';
      sheet.getRange(i + 1, 6).setValue(status);
      sheet.getRange(i + 1, 8).setValue(paidAt);
      return { success: true, message: 'Statut mis a jour' };
    }
  }
  
  return { success: false, message: 'Commande introuvable' };
}
`;

export const APPS_SCRIPT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <?!= include('Styles'); ?>
</head>
<body>
  <div class="app">
    <header class="header">
      <div class="logo-section">
        <div class="logo">ZF</div>
        <div class="brand">
          <h1>ZFood Assistance</h1>
          <p class="slogan">Numero 1 dans Attieke</p>
        </div>
      </div>
      <div class="sync-badge">Synchronise</div>
    </header>
    
    <nav class="tabs">
      <button class="tab active" onclick="showSection('dashboard')">Dashboard</button>
      <button class="tab" onclick="showSection('clients')">Clients</button>
      <button class="tab" onclick="showSection('orders')">Commandes</button>
      <button class="tab" onclick="showSection('add')">Ajouter</button>
    </nav>
    
    <main id="content">
      <section id="dashboard" class="section active">
        <div class="stats-grid">
          <div class="stat-card green">
            <div class="stat-icon">👥</div>
            <div class="stat-value" id="stat-clients">-</div>
            <div class="stat-label">Clients</div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon">🧺</div>
            <div class="stat-value" id="stat-baskets">-</div>
            <div class="stat-label">Paniers</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-icon">💰</div>
            <div class="stat-value" id="stat-revenue">-</div>
            <div class="stat-label">Chiffre d'affaires</div>
          </div>
          <div class="stat-card red">
            <div class="stat-icon">⏳</div>
            <div class="stat-value" id="stat-unpaid">-</div>
            <div class="stat-label">Impayes</div>
          </div>
        </div>
        
        <div class="info-card">
          <h3>Objectif Mensuel</h3>
          <p><span id="monthly-goal">120</span> paniers par client</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
        </div>
      </section>
      
      <section id="clients" class="section">
        <div class="section-header">
          <h2>Liste des Clients</h2>
          <span class="count" id="client-count">0</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Quartier</th>
                <th>Tel</th>
                <th>Paniers</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody id="clients-table"></tbody>
          </table>
        </div>
      </section>
      
      <section id="orders" class="section">
        <div class="section-header">
          <h2>Historique Commandes</h2>
          <span class="count" id="order-count">0</span>
        </div>
        <div class="filter-tabs">
          <button class="filter active" onclick="filterOrders('all')">Tous</button>
          <button class="filter" onclick="filterOrders('paid')">Payes</button>
          <button class="filter" onclick="filterOrders('unpaid')">Impayes</button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Qte</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="orders-table"></tbody>
          </table>
        </div>
      </section>
      
      <section id="add" class="section">
        <div class="form-card">
          <h3>Nouveau Client</h3>
          <form id="client-form" onsubmit="submitClient(event)">
            <input type="text" id="client-name" placeholder="Nom du client" required>
            <input type="text" id="client-quartier" placeholder="Quartier" required>
            <input type="tel" id="client-phone" placeholder="Telephone">
            <input type="password" id="client-password" placeholder="Mot de passe admin" required>
            <button type="submit" class="btn-primary">Ajouter Client</button>
          </form>
        </div>
        
        <div class="form-card">
          <h3>Nouvelle Commande</h3>
          <form id="order-form" onsubmit="submitOrder(event)">
            <input type="text" id="order-client" placeholder="Nom du client" required>
            <input type="number" id="order-quantity" placeholder="Nombre de paniers" value="1" min="1" required>
            <input type="number" id="order-amount" placeholder="Montant (FCFA)" value="5000" required>
            <select id="order-status">
              <option value="false">Impaye</option>
              <option value="true">Paye</option>
            </select>
            <input type="password" id="order-password" placeholder="Mot de passe admin" required>
            <button type="submit" class="btn-primary">Ajouter Commande</button>
          </form>
        </div>
      </section>
    </main>
    
    <footer class="footer">
      <p>Developpe par Zfood</p>
    </footer>
  </div>
  
  <div id="toast" class="toast"></div>
  <div id="loading" class="loading">Chargement...</div>
  
  <?!= include('Script'); ?>
</body>
</html>
`;

export const APPS_SCRIPT_STYLES = `
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

.header {
  background: linear-gradient(135deg, #16a34a 0%, #14532d 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 50px;
  height: 50px;
  background: white;
  color: #16a34a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 20px;
}

.brand h1 {
  font-size: 20px;
  font-weight: 700;
}

.slogan {
  color: #f97316;
  font-size: 12px;
  font-weight: 600;
}

.sync-badge {
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.tabs {
  display: flex;
  background: #14532d;
  overflow-x: auto;
}

.tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-family: 'Poppins', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.tab.active {
  background: white;
  color: #16a34a;
}

.section {
  display: none;
  padding: 20px;
}

.section.active {
  display: block;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-left: 4px solid;
}

.stat-card.green { border-color: #16a34a; }
.stat-card.orange { border-color: #f97316; }
.stat-card.red { border-color: #dc2626; }

.stat-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.info-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}

.info-card h3 {
  color: #92400e;
  font-weight: 600;
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
  margin-top: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #f97316;
  border-radius: 4px;
  transition: width 0.5s;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.count {
  background: #16a34a;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter {
  padding: 8px 16px;
  border: none;
  background: #f3f4f6;
  border-radius: 20px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.filter.active {
  background: #16a34a;
  color: white;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #14532d;
  color: white;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

tr:nth-child(even) {
  background: #f9fafb;
}

.status-paid {
  background: #dcfce7;
  color: #16a34a;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-unpaid {
  background: #fee2e2;
  color: #dc2626;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.form-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.form-card h3 {
  color: #16a34a;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #dcfce7;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input, select {
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  transition: border-color 0.3s;
}

input:focus, select:focus {
  outline: none;
  border-color: #16a34a;
}

.btn-primary {
  background: linear-gradient(135deg, #16a34a 0%, #14532d 100%);
  color: white;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
}

.footer {
  background: #f9fafb;
  padding: 16px;
  text-align: center;
  color: #6b7280;
  font-size: 12px;
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: #1f2937;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s;
  z-index: 1000;
}

.toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.toast.success { background: #16a34a; }
.toast.error { background: #dc2626; }

.loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #16a34a;
  z-index: 999;
}

.loading.hidden {
  display: none;
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  th, td {
    padding: 8px 4px;
    font-size: 11px;
  }
}
</style>
`;

export const APPS_SCRIPT_JS = `
<script>
let allOrders = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', loadData);

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  
  document.getElementById(sectionId).classList.add('active');
  document.querySelector(\`[onclick="showSection('\${sectionId}')"]\`).classList.add('active');
}

function loadData() {
  showLoading(true);
  
  google.script.run
    .withSuccessHandler(updateStats)
    .withFailureHandler(handleError)
    .getStats();
    
  google.script.run
    .withSuccessHandler(updateClients)
    .withFailureHandler(handleError)
    .getClients();
    
  google.script.run
    .withSuccessHandler(updateOrders)
    .withFailureHandler(handleError)
    .getOrders();
}

function updateStats(stats) {
  document.getElementById('stat-clients').textContent = stats.clientCount;
  document.getElementById('stat-baskets').textContent = stats.basketCount;
  document.getElementById('stat-revenue').textContent = formatMoney(stats.revenue);
  document.getElementById('stat-unpaid').textContent = formatMoney(stats.unpaid);
  document.getElementById('monthly-goal').textContent = stats.monthlyGoal;
  showLoading(false);
}

function updateClients(clients) {
  const tbody = document.getElementById('clients-table');
  document.getElementById('client-count').textContent = clients.length;
  
  tbody.innerHTML = clients.map(c => \`
    <tr>
      <td><strong>\${c.name}</strong></td>
      <td>\${c.quartier}</td>
      <td>\${c.phone || '-'}</td>
      <td>\${c.totalBaskets}</td>
      <td>\${formatMoney(c.totalAmount)}</td>
    </tr>
  \`).join('');
}

function updateOrders(orders) {
  allOrders = orders;
  document.getElementById('order-count').textContent = orders.length;
  renderOrders();
  showLoading(false);
}

function renderOrders() {
  let filtered = allOrders;
  if (currentFilter === 'paid') filtered = allOrders.filter(o => o.isPaid);
  if (currentFilter === 'unpaid') filtered = allOrders.filter(o => !o.isPaid);
  
  const tbody = document.getElementById('orders-table');
  tbody.innerHTML = filtered.map(o => \`
    <tr>
      <td><strong>\${o.clientName}</strong></td>
      <td>\${o.quantity}</td>
      <td>\${formatMoney(o.amount)}</td>
      <td><span class="\${o.isPaid ? 'status-paid' : 'status-unpaid'}">\${o.isPaid ? 'Paye' : 'Impaye'}</span></td>
      <td>\${o.date}</td>
    </tr>
  \`).join('');
}

function filterOrders(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
  document.querySelector(\`[onclick="filterOrders('\${filter}')"]\`).classList.add('active');
  renderOrders();
}

function submitClient(e) {
  e.preventDefault();
  showLoading(true);
  
  const name = document.getElementById('client-name').value;
  const quartier = document.getElementById('client-quartier').value;
  const phone = document.getElementById('client-phone').value;
  const password = document.getElementById('client-password').value;
  
  google.script.run
    .withSuccessHandler(result => {
      showLoading(false);
      if (result.success) {
        showToast(result.message, 'success');
        document.getElementById('client-form').reset();
        loadData();
      } else {
        showToast(result.message, 'error');
      }
    })
    .withFailureHandler(handleError)
    .addClient(name, quartier, phone, password);
}

function submitOrder(e) {
  e.preventDefault();
  showLoading(true);
  
  const clientName = document.getElementById('order-client').value;
  const quantity = parseInt(document.getElementById('order-quantity').value);
  const amount = parseInt(document.getElementById('order-amount').value);
  const isPaid = document.getElementById('order-status').value === 'true';
  const password = document.getElementById('order-password').value;
  
  google.script.run
    .withSuccessHandler(result => {
      showLoading(false);
      if (result.success) {
        showToast(result.message, 'success');
        document.getElementById('order-form').reset();
        loadData();
      } else {
        showToast(result.message, 'error');
      }
    })
    .withFailureHandler(handleError)
    .addOrder(clientName, quantity, amount, isPaid, password);
}

function formatMoney(value) {
  return new Intl.NumberFormat('fr-FR').format(value || 0);
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.className = 'toast', 3000);
}

function showLoading(show) {
  document.getElementById('loading').className = show ? 'loading' : 'loading hidden';
}

function handleError(error) {
  showLoading(false);
  showToast('Erreur: ' + error.message, 'error');
}
</script>
`;
