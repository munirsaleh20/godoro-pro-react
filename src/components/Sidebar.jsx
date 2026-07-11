import { useAuth } from '../context/AuthContext.jsx';

// Foundation phase: dashboard + stores + shops tu.
// Kurasa nyingine (sales, products, staff, debts, expenses, profit)
// zitaongezwa hatua zijazo na kuongezwa hapa.
export const NAV_ITEMS = [
  { key: 'dashboard', label: '🏠 Dashboard', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'sales', label: '🛒 Sales', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'debts', label: '💳 Debts', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'wholesale', label: '📊 Wholesale', roles: ['owner', 'manager'] },
  { key: 'suppliers', label: '🏭 Suppliers', roles: ['owner', 'manager'] },
  { key: 'expenses', label: '💸 Expenses', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'inventory', label: '📦 Inventory', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'transfers', label: '🔄 Transfers', roles: ['owner', 'manager'] },
  { key: 'reports', label: '📊 Profit & Reports', roles: ['owner'] },
  { key: 'staff', label: '👥 Staff', roles: ['owner', 'manager'] },
  { key: 'stores', label: '🏪 Stores', roles: ['owner', 'manager'] },
  { key: 'shops', label: '🏬 Shops', roles: ['owner', 'manager'] },
];

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }) {
  const { currentUser, logout } = useAuth();
  const role = currentUser?.role;

  // Kwenye simu, ukibofya kiungo cha nav, funga drawer moja kwa moja
  // ili mtumiaji aone ukurasa aliouchagua badala ya kubaki chini ya menu.
  const handleNavigate = (key) => {
    onNavigate(key);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Giza nyuma ya menu (backdrop) - linaonekana simu pekee wakati drawer iko wazi */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">🛏️ Godoro Pro</div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Funga menu">✕</button>
        </div>
        <div className="sidebar-nav">
          {NAV_ITEMS.filter(item => item.roles.includes(role)).map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => handleNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '12px' }}>
          <button className="sidebar-nav-item" onClick={logout}>🚪 Logout</button>
        </div>
      </div>
    </>
  );
}
