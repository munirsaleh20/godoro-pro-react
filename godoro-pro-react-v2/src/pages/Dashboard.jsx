import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS } from '../utils/format.js';
import ProductLocator from '../components/ProductLocator.jsx';

export default function Dashboard({ onNavigate }) {
  const { currentUser, isManager } = useAuth();
  const { locations } = useData();

  if (isManager()) {
    return <ManagerDashboard locations={locations} onNavigate={onNavigate} />;
  }

  return <SalespersonDashboard currentUser={currentUser} onNavigate={onNavigate} />;
}

function ManagerDashboard({ locations, onNavigate }) {
  const { allProductsWithLocations, totalAllSales, totalAllDebts } = useData();
  const totalStores = locations.filter(l => l.type === 'store').length;
  const totalShops = locations.filter(l => l.type === 'shop').length;
  const totalProducts = allProductsWithLocations.length;
  const totalStock = allProductsWithLocations.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div>
      <ProductLocator />
      <div className="manager-stat-cards">
        <div className="manager-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('sales')}>
          <div className="bg-circle" style={{ background: '#16a34a' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.08)' }}>🛒</div>
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">{fmtS(totalAllSales)}</div>
          <div className="stat-sub">All locations, all time</div>
        </div>
        <div className="manager-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('debts')}>
          <div className="bg-circle" style={{ background: '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💳</div>
          <div className="stat-label">Outstanding Debts</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{fmtS(totalAllDebts)}</div>
          <div className="stat-sub">Unpaid by customers</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#e07b2a' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(224,123,42,0.08)' }}>🏪</div>
          <div className="stat-label">Stores</div>
          <div className="stat-value">{totalStores}</div>
          <div className="stat-sub">Warehouses</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#0d9488' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(13,148,136,0.08)' }}>🏬</div>
          <div className="stat-label">Shops</div>
          <div className="stat-value">{totalShops}</div>
          <div className="stat-sub">Open for sales</div>
        </div>
        <div className="manager-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('inventory')}>
          <div className="bg-circle" style={{ background: '#7c3aed' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.08)' }}>📦</div>
          <div className="stat-label">Products</div>
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-sub">{totalStock} units total</div>
        </div>
      </div>

      <h3 className="section-title" style={{ marginBottom: 12 }}>All Locations</h3>
      <div className="manager-stores-grid">
        {locations.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">🏪</div>
            <div className="empty-title">No Locations</div>
            <div>Add a Store or Shop to get started</div>
          </div>
        ) : locations.map(loc => {
          const isShop = loc.type === 'shop';
          return (
            <div
              key={loc.id}
              className="manager-store-card"
              onClick={() => onNavigate(isShop ? 'shops' : 'stores')}
            >
              <div className="store-header">
                <div>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{isShop ? '🏬' : '🏪'}</div>
                  <div className="store-name">{loc.name}</div>
                  <div className="store-location">📍 {loc.location}</div>
                </div>
                <span className={isShop ? 'status-open' : 'status-closed'}>
                  {isShop ? '🟢 Shop' : '📦 Store'}
                </span>
              </div>
              <div className="store-footer">{loc.phone || 'No phone on file'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SalespersonDashboard({ currentUser, onNavigate }) {
  const { getSales, getDebts, getLocation } = useData();
  const mySales = getSales(currentUser.locationId);
  const myDebts = getDebts(currentUser.locationId);
  const myShop = getLocation(currentUser.locationId);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = mySales.filter(s => s.date === todayStr);
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalDebt = myDebts.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div>
      <h3 className="section-title" style={{ marginBottom: 4 }}>Karibu, {currentUser.name} 👋</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        🏬 {myShop ? myShop.name : 'No shop assigned'}
      </p>

      <div className="manager-stat-cards">
        <div className="manager-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('sales')}>
          <div className="bg-circle" style={{ background: '#16a34a' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.08)' }}>💰</div>
          <div className="stat-label">Today's Sales</div>
          <div className="stat-value">{fmtS(todayTotal)}</div>
          <div className="stat-sub">{todaySales.length} sale(s) today</div>
        </div>
        <div className="manager-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('debts')}>
          <div className="bg-circle" style={{ background: '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💳</div>
          <div className="stat-label">Outstanding Debts</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{fmtS(totalDebt)}</div>
          <div className="stat-sub">{myDebts.length} customer(s)</div>
        </div>
        <div className="manager-stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('sales')}>
          <div className="bg-circle" style={{ background: '#e07b2a' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(224,123,42,0.08)' }}>🛒</div>
          <div className="stat-label">Total Sales (all time)</div>
          <div className="stat-value">{mySales.length}</div>
          <div className="stat-sub">Click to record a new sale</div>
        </div>
      </div>

      <ProductLocator />
    </div>
  );
}
