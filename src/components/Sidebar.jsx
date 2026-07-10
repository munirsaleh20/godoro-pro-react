import { useAuth } from '../context/AuthContext.jsx';

// Foundation phase: dashboard + stores + shops tu.
// Kurasa nyingine (sales, products, staff, debts, expenses, profit)
// zitaongezwa hatua zijazo na kuongezwa hapa.
export const NAV_ITEMS = [
  { key: 'dashboard', label: '🏠 Dashboard', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'sales', label: '🛒 Sales', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'debts', label: '💳 Debts', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'expenses', label: '💸 Expenses', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'inventory', label: '📦 Inventory', roles: ['owner', 'manager', 'salesperson'] },
  { key: 'transfers', label: '🔄 Transfers', roles: ['owner', 'manager'] },
  { key: 'reports', label: '📊 Profit & Reports', roles: ['owner'] },
  { key: 'staff', label: '👥 Staff', roles: ['owner', 'manager'] },
  { key: 'stores', label: '🏪 Stores', roles: ['owner', 'manager'] },
  { key: 'shops', label: '🏬 Shops', roles: ['owner', 'manager'] },
];

export default function Sidebar({ currentPage, onNavigate }) {
  const { currentUser, logout } = useAuth();
  const role = currentUser?.role;

  return (
    <div className="sidebar">
      <div className="sidebar-brand">🛏️ Godoro Pro</div>
      <div className="sidebar-nav">
        {NAV_ITEMS.filter(item => item.roles.includes(role)).map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${currentPage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 'auto', padding: '12px' }}>
        <button className="sidebar-nav-item" onClick={logout}>🚪 Logout</button>
      </div>
    </div>
  );
}
