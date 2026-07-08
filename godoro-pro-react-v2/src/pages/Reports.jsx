import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS, today } from '../utils/format.js';

export default function Reports() {
  const { isOwner } = useAuth();
  const { sales, expenses, locations } = useData();

  const [period, setPeriod] = useState('month'); // today | month | year | all
  const [locationId, setLocationId] = useState('all');

  if (!isOwner()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Profit & Reports is for Owner only.</div>
      </div>
    );
  }

  const todayStr = today();
  const thisMonth = todayStr.slice(0, 7);
  const thisYear = todayStr.slice(0, 4);

  const inPeriod = (dateStr) => {
    if (!dateStr) return false;
    if (period === 'today') return dateStr === todayStr;
    if (period === 'month') return dateStr.startsWith(thisMonth);
    if (period === 'year') return dateStr.startsWith(thisYear);
    return true; // all
  };

  const filteredSales = sales.filter(s => (
    (locationId === 'all' || String(s.locationId) === String(locationId)) && inPeriod(s.date)
  ));
  const filteredExpenses = expenses.filter(e => (
    (locationId === 'all' || String(e.locationId) === String(locationId)) && inPeriod(e.date)
  ));

  // MUHIMU: "Revenue" (Mauzo Yote) ni jumla ya mauzo yote yaliyofanyika,
  // hata yale ambayo bado ni deni (Debt) - kwa taarifa tu, si faida.
  const revenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

  // Faida (Profit) HAIPASWI kuhesabu pesa ambayo bado haijalipwa (madeni).
  // Kwa hiyo tunachukua mauzo yaliyolipwa kikamilifu (status === 'Paid')
  // pekee, kisha tunatoa gharama ya bidhaa yenyewe (unit_cost - bei ya
  // ununuzi) kabla ya kutoa expenses. Hii ndiyo faida halisi.
  const paidSales = filteredSales.filter(s => s.status === 'Paid');
  const cashCollected = paidSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const costOfGoodsSold = paidSales.reduce((sum, s) => sum + (s.unitCost || 0) * (s.quantity || 1), 0);
  const grossProfit = cashCollected - costOfGoodsSold;

  // Madeni ambayo bado hayajalipwa kwa kipindi hiki - yanaonyeshwa kama
  // taarifa tu (hayahesabiwi kwenye faida mpaka mteja atakapolipa).
  const unpaidInPeriod = filteredSales
    .filter(s => s.status !== 'Paid')
    .reduce((sum, s) => sum + Math.max(0, (s.total || 0) - (s.paid || 0)), 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const profit = grossProfit - totalExpenses;

  // Per-location breakdown (haiheshimu filter ya location - inaonyesha zote kila mara)
  const perLocation = useMemo(() => {
    return locations.map(loc => {
      const locSales = sales.filter(s => String(s.locationId) === String(loc.id) && inPeriod(s.date));
      const locPaidSales = locSales.filter(s => s.status === 'Paid');
      const locExpenses = expenses.filter(e => String(e.locationId) === String(loc.id) && inPeriod(e.date));
      const rev = locSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const cash = locPaidSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const cogs = locPaidSales.reduce((sum, s) => sum + (s.unitCost || 0) * (s.quantity || 1), 0);
      const exp = locExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      return { ...loc, revenue: rev, expenses: exp, profit: (cash - cogs) - exp, count: locSales.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, sales, expenses, period]);

  // Daily breakdown kwa kipindi kilichochaguliwa (revenue/expenses/profit kwa siku)
  const dailyBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      if (!s.date) return;
      map[s.date] = map[s.date] || { date: s.date, revenue: 0, expenses: 0, cash: 0, cogs: 0 };
      map[s.date].revenue += s.total || 0;
      if (s.status === 'Paid') {
        map[s.date].cash += s.total || 0;
        map[s.date].cogs += (s.unitCost || 0) * (s.quantity || 1);
      }
    });
    filteredExpenses.forEach(e => {
      if (!e.date) return;
      map[e.date] = map[e.date] || { date: e.date, revenue: 0, expenses: 0, cash: 0, cogs: 0 };
      map[e.date].expenses += e.amount || 0;
    });
    return Object.values(map)
      .map(d => ({ ...d, profit: (d.cash - d.cogs) - d.expenses }))
      .sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSales, filteredExpenses]);

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">📊 Profit & Reports</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ padding: '6px 12px', fontSize: 13, minWidth: 130 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <select className="form-select" style={{ padding: '6px 12px', fontSize: 13, minWidth: 150 }} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.type === 'store' ? '🏪' : '🏬'} {loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="manager-stat-cards">
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#e07b2a' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(224,123,42,0.08)' }}>📈</div>
          <div className="stat-label">Total Sales (Invoiced)</div>
          <div className="stat-value">{fmtS(revenue)}</div>
          <div className="stat-sub">{filteredSales.length} transactions (incl. unpaid debts)</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#2563eb' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.08)' }}>💵</div>
          <div className="stat-label">Cash Collected</div>
          <div className="stat-value">{fmtS(cashCollected)}</div>
          <div className="stat-sub">{paidSales.length} fully-paid sales</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#f59e0b' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>🏭</div>
          <div className="stat-label">Cost of Goods Sold</div>
          <div className="stat-value">{fmtS(costOfGoodsSold)}</div>
          <div className="stat-sub">Buy-price of paid sales only</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💸</div>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value">{fmtS(totalExpenses)}</div>
          <div className="stat-sub">{filteredExpenses.length} expense records</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#94a3b8' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(148,163,184,0.08)' }}>⏳</div>
          <div className="stat-label">Unpaid Debts (This Period)</div>
          <div className="stat-value" style={{ color: '#64748b' }}>{fmtS(unpaidInPeriod)}</div>
          <div className="stat-sub">Not counted in profit until paid</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: profit >= 0 ? '#16a34a' : '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.08)' }}>💰</div>
          <div className="stat-label">Net Profit</div>
          <div className="stat-value" style={{ color: profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(profit)}</div>
          <div className="stat-sub">Cash Collected − Cost of Goods − Expenses</div>
        </div>
      </div>

      <h3 className="section-title" style={{ margin: '20px 0 12px' }}>📍 Breakdown by Location ({period === 'today' ? 'Today' : period === 'month' ? 'This Month' : period === 'year' ? 'This Year' : 'All Time'})</h3>
      <div className="table-container" style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Location</th>
              <th style={{ padding: 8 }}>Sales</th>
              <th style={{ padding: 8 }}>Revenue</th>
              <th style={{ padding: 8 }}>Expenses</th>
              <th style={{ padding: 8 }}>Profit</th>
            </tr>
          </thead>
          <tbody>
            {perLocation.map(loc => (
              <tr key={loc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>{loc.type === 'store' ? '🏪' : '🏬'} {loc.name}</td>
                <td style={{ padding: 8 }}>{loc.count}</td>
                <td style={{ padding: 8, color: '#16a34a' }}>{fmtS(loc.revenue)}</td>
                <td style={{ padding: 8, color: '#dc2626' }}>{fmtS(loc.expenses)}</td>
                <td style={{ padding: 8, fontWeight: 700, color: loc.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(loc.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title" style={{ margin: '20px 0 12px' }}>🗓️ Daily Breakdown</h3>
      <div className="table-container" style={{ overflowX: 'auto' }}>
        {dailyBreakdown.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗓️</div>
            <div className="empty-title">No Data</div>
            <div>No sales or expenses recorded for this period</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Revenue</th>
                <th style={{ padding: 8 }}>Expenses</th>
                <th style={{ padding: 8 }}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {dailyBreakdown.map(d => (
                <tr key={d.date} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{d.date}</td>
                  <td style={{ padding: 8, color: '#16a34a' }}>{fmtS(d.revenue)}</td>
                  <td style={{ padding: 8, color: '#dc2626' }}>{fmtS(d.expenses)}</td>
                  <td style={{ padding: 8, fontWeight: 700, color: d.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(d.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
