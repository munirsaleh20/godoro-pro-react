import { useEffect, useRef, useState } from 'react';
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
import Wholesale from './pages/Wholesale.jsx';

const VALID_PAGES = [
  'dashboard', 'sales', 'inventory', 'staff', 'debts',
  'expenses', 'transfers', 'reports', 'stores', 'shops', 'wholesale',
];

// Inasoma ukurasa wa sasa kutoka kwenye URL (#debts, #sales, n.k.) ili
// mtumiaji akifanya refresh (F5), abaki kwenye ukurasa aliokuwepo badala
// ya kurudishwa Dashboard kila wakati.
function pageFromHash() {
  const h = window.location.hash.replace('#', '');
  return VALID_PAGES.includes(h) ? h : 'dashboard';
}

export default function App() {
  const { currentUser, authLoading } = useAuth();
  const { loadLocations, loadProducts, loadSales, loadStaff, loadDebts, loadExpenses, loadTransfers, loadWholesaleCustomers, loadWholesaleTransactions } = useData();
  const { showToast } = useToast();
  const [page, setPageState] = useState(pageFromHash);
  const [dataLoading, setDataLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Kubadilisha ukurasa daima kunasasisha URL hash pia, ili refresh iweze
  // kubaki hapohapo.
  const setPage = (key) => {
    setPageState(key);
    window.location.hash = key;
    setSidebarOpen(false);
  };

  // Endapo mtumiaji anatumia vitufe vya "back/forward" vya browser.
  useEffect(() => {
    const onHashChange = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // BUG FIX (asili): ukurasa uliobaki kuwa uleule (mfano "staff") hata
  // baada ya mtumiaji mmoja ku-logout na mwingine (mwenye role tofauti,
  // mfano salesperson) ku-login kwenye kifaa/tab kilekile - ndio maana
  // "Access Denied" ilionekana mara moja baada ya login bila hata kubofya
  // Staff. Sasa page inarudi "dashboard" MTUMIAJI ANAPOBADILIKA KWELI
  // (logout + login mwingine) - LAKINI si wakati wa refresh ya kawaida ya
  // ukurasa (hapo tunataka abaki pale pale, ndiyo maana tunatumia
  // hasHydrated hapa chini kuruka mzunguko wa kwanza wa uthibitisho).
  const hasHydratedRef = useRef(false);
  const prevUserIdRef = useRef(undefined);
  useEffect(() => {
    if (authLoading) return; // bado tunathibitisha session ya awali, subiri
    if (!hasHydratedRef.current) {
      // Huu ni uthibitisho wa kwanza baada ya refresh/kufungua app -
      // acha ukurasa uliopo (kutoka hash) uendelee kama ulivyo.
      hasHydratedRef.current = true;
      prevUserIdRef.current = currentUser?.id;
      return;
    }
    if (prevUserIdRef.current !== currentUser?.id) {
      // Mtumiaji halisi amebadilika (login/logout/mtumiaji mwingine) -
      // rudisha Dashboard kwa usalama.
      setPage('dashboard');
    }
    prevUserIdRef.current = currentUser?.id;
  }, [currentUser?.id, authLoading]);

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
      // Wholesale ni Owner/Manager pekee - Salesperson hatakiwi hata kupokea
      // ombi la data hii kutoka kwenye mtandao (achilia mbali kuiona), hivyo
      // hatuiiti kabisa kwake.
      const isOwnerOrManager = currentUser.role === 'owner' || currentUser.role === 'manager';
      const loaders = [loadLocations(), loadProducts(), loadSales(), loadStaff(), loadDebts(), loadExpenses(), loadTransfers()];
      if (isOwnerOrManager) loaders.push(loadWholesaleCustomers(), loadWholesaleTransactions());
      Promise.all(loaders)
        .catch((err) => showToast('Failed to load data: ' + err.message, 'error'))
        .finally(() => setDataLoading(false));
    }
  }, [currentUser, loadLocations, loadProducts, loadSales, loadStaff, loadDebts, loadExpenses, loadTransfers, loadWholesaleCustomers, loadWholesaleTransactions, showToast]);

  if (authLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Fungua menu"
            >
              ☰
            </button>
            <div>
              <strong>{currentUser.name}</strong>{' '}
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'manager' ? '🏢 Manager' : '🛒 Salesperson'}
              </span>
            </div>
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
              {page === 'wholesale' && <Wholesale />}
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
