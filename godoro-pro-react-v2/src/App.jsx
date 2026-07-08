import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useData } from './context/DataContext.jsx';
import { useToast } from './context/ToastContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Sidebar, { NAV_ITEMS } from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Locations from './pages/Locations.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import Staff from './pages/Staff.jsx';
import Debts from './pages/Debts.jsx';
import Expenses from './pages/Expenses.jsx';
import Transfers from './pages/Transfers.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  const { currentUser, authLoading } = useAuth();
  const { loadLocations, loadProducts, loadSales, loadStaff, loadDebts, loadExpenses, loadTransfers } = useData();
  const { showToast } = useToast();
  const [page, setPage] = useState('dashboard');
  const [dataLoading, setDataLoading] = useState(false);

  // BUG FIX: kabla ya hapa, ukurasa (page) uliobaki kuwa uleule (mfano "staff")
  // hata baada ya mtumiaji mmoja ku-logout na mwingine (mwenye role tofauti,
  // mfano salesperson) ku-login kwenye kifaa/tab kilekile - ndio maana
  // "Access Denied" ilionekana mara moja baada ya login bila hata kubofya
  // Staff. Sasa page inarudi "dashboard" kila mtumiaji anapobadilika.
  useEffect(() => {
    setPage('dashboard');
  }, [currentUser?.id]);

  // Ulinzi wa ziada: kama kwa sababu yoyote page ya sasa si miongoni mwa
  // kurasa zinazoruhusiwa kwa role ya mtumiaji huyu, mrudishe dashboard
  // moja kwa moja badala ya kuonyesha "Access Denied".
  useEffect(() => {
    if (!currentUser) return;
    const navItem = NAV_ITEMS.find(item => item.key === page);
    if (navItem && !navItem.roles.includes(currentUser.role)) {
      setPage('dashboard');
    }
  }, [page, currentUser]);

  useEffect(() => {
    if (currentUser) {
      setDataLoading(true);
      Promise.all([loadLocations(), loadProducts(), loadSales(), loadStaff(), loadDebts(), loadExpenses(), loadTransfers()])
        .catch((err) => showToast('Failed to load data: ' + err.message, 'error'))
        .finally(() => setDataLoading(false));
    }
  }, [currentUser, loadLocations, loadProducts, loadSales, loadStaff, loadDebts, loadExpenses, loadTransfers, showToast]);

  if (authLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div className="main-content">
        <div className="topbar">
          <div>
            <strong>{currentUser.name}</strong>{' '}
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'manager' ? '🏢 Manager' : '🛒 Salesperson'}
            </span>
          </div>
        </div>
        <div className="page-content">
          {dataLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading data...</div>
          ) : (
            <>
              {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
              {page === 'sales' && <Sales />}
              {page === 'inventory' && <Inventory />}
              {page === 'staff' && <Staff />}
              {page === 'debts' && <Debts />}
              {page === 'expenses' && <Expenses />}
              {page === 'transfers' && <Transfers />}
              {page === 'reports' && <Reports />}
              {page === 'stores' && <Locations type="store" />}
              {page === 'shops' && <Locations type="shop" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
