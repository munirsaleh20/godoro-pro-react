import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS, today } from '../utils/format.js';

export default function Reports() {
  const { isOwner } = useAuth();
  const { sales, expenses, locations, products, wholesaleTransactions } = useData();

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

  // MUHIMU: "Revenue" (Total Sales / Invoiced) sasa ni PESA HALISI
  // ilizoingia mkononi tu - kwa mauzo yaliyolipwa kikamilifu tunachukua
  // 'total', na kwa mauzo ya deni tunachukua kiasi kilicholipwa ('paid')
  // pekee. Sehemu ya deni ambayo bado haijalipwa HAIHESABIWI hapa.
  const actualPaidAmount = (s) => (s.status === 'Paid' ? (s.total || 0) : (s.paid || 0));
  const revenue = filteredSales.reduce((sum, s) => sum + actualPaidAmount(s), 0);

  // Faida (Profit) HAIPASWI kuhesabu pesa ambayo bado haijalipwa (madeni).
  // "Cash Collected" ni PESA HALISI zilizoingia mkononi - inajumuisha
  // mauzo yaliyolipwa kikamilifu NA sehemu iliyokwisha kulipwa kwenye
  // mauzo ya deni (partial payments). Sehemu ya deni isiyolipwa haihesabiwi.
  const paidSales = filteredSales.filter(s => s.status === 'Paid');
  const cashCollected = filteredSales.reduce((sum, s) => sum + actualPaidAmount(s), 0);
  // COGS inahesabiwa kwa uwiano uleule wa kiasi kilicholipwa dhidi ya bei
  // nzima ya mauzo - hii inahakikisha faida haizidishwi kwa kuhesabu pesa
  // ya deni bila kutoa gharama husika ya bidhaa hiyo.
  const costOfGoodsSold = filteredSales.reduce((sum, s) => {
    const fullCost = (s.unitCost || 0) * (s.quantity || 1);
    if (s.status === 'Paid') return sum + fullCost;
    const total = s.total || 0;
    const fraction = total > 0 ? (s.paid || 0) / total : 0;
    return sum + fullCost * fraction;
  }, 0);
  const grossProfit = cashCollected - costOfGoodsSold;

  // Madeni ambayo bado hayajalipwa kwa kipindi hiki - yanaonyeshwa kama
  // taarifa tu (hayahesabiwi kwenye faida mpaka mteja atakapolipa).
  const unpaidInPeriod = filteredSales
    .filter(s => s.status !== 'Paid')
    .reduce((sum, s) => sum + Math.max(0, (s.total || 0) - (s.paid || 0)), 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // FAIDA YA WHOLESALE (Jumla): kila mzigo ('goods') uliotolewa kwa mteja wa
  // jumla una faida = (unitPrice - buyPrice) x quantity kwa kila bidhaa.
  // Tunatofautisha CHANZO cha faida hiyo:
  //   - 'store'    = mzigo ulitoka kwenye stock ya duka/store letu
  //   - 'dropship' = mzigo ulitoka MOJA KWA MOJA kiwandani (Supplier) kwenda
  //                  kwa mteja wa jumla, bila kupitia stock yetu
  // Kama mzigo wa zamani haukuwa na buyPrice/source (kabla ya kipengele hiki
  // kuwekwa), unahesabiwa kama faida ya TZS 0 kwa usalama badala ya kukisia.
  //
  // Faida haihesabiwi kwa kiasi kizima cha mzigo (invoiced) - badala yake
  // inarekebishwa kwa UWIANO WA MALIPO ALIYOKWISHALIPA mteja huyo (lifetime,
  // goods zote dhidi ya payments zote), sawa na mtindo uleule unaotumika kwa
  // "Cost of Goods Sold" ya mauzo ya kawaida hapo juu - ili tusihesabu faida
  // ya pesa ambayo bado haijalipwa.
  const custLifetimeTotals = {};
  wholesaleTransactions.forEach(t => {
    const key = String(t.customerId);
    custLifetimeTotals[key] = custLifetimeTotals[key] || { goods: 0, paid: 0 };
    if (t.type === 'goods') custLifetimeTotals[key].goods += t.amount || 0;
    else if (t.type === 'payment') custLifetimeTotals[key].paid += t.amount || 0;
  });

  const wholesaleProfit = useMemo(() => {
    let storeProfit = 0, dropshipProfit = 0;
    wholesaleTransactions
      .filter(t => t.type === 'goods' && inPeriod(t.date) && (locationId === 'all' || String(t.locationId) === String(locationId)))
      .forEach(t => {
        const tot = custLifetimeTotals[String(t.customerId)] || { goods: 0, paid: 0 };
        const fraction = tot.goods > 0 ? Math.min(1, tot.paid / tot.goods) : 0;
        (t.items || []).forEach(it => {
          const margin = (it.quantity || 0) * ((it.unitPrice || 0) - (it.buyPrice || 0));
          const adjusted = margin * fraction;
          if (it.source === 'dropship') dropshipProfit += adjusted;
          else storeProfit += adjusted;
        });
      });
    return { storeProfit, dropshipProfit, total: storeProfit + dropshipProfit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wholesaleTransactions, period, locationId]);

  const profit = grossProfit - totalExpenses + wholesaleProfit.total;

  // Per-location breakdown (haiheshimu filter ya location - inaonyesha zote kila mara)
  const perLocation = useMemo(() => {
    return locations.map(loc => {
      const locSales = sales.filter(s => String(s.locationId) === String(loc.id) && inPeriod(s.date));
      const locExpenses = expenses.filter(e => String(e.locationId) === String(loc.id) && inPeriod(e.date));
      const rev = locSales.reduce((sum, s) => sum + actualPaidAmount(s), 0);
      const cash = locSales.reduce((sum, s) => sum + actualPaidAmount(s), 0);
      const cogs = locSales.reduce((sum, s) => {
        const fullCost = (s.unitCost || 0) * (s.quantity || 1);
        if (s.status === 'Paid') return sum + fullCost;
        const total = s.total || 0;
        const fraction = total > 0 ? (s.paid || 0) / total : 0;
        return sum + fullCost * fraction;
      }, 0);
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
      map[s.date].revenue += actualPaidAmount(s);
      map[s.date].cash += actualPaidAmount(s);
      {
        const fullCost = (s.unitCost || 0) * (s.quantity || 1);
        if (s.status === 'Paid') {
          map[s.date].cogs += fullCost;
        } else {
          const total = s.total || 0;
          const fraction = total > 0 ? (s.paid || 0) / total : 0;
          map[s.date].cogs += fullCost * fraction;
        }
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

  // Thamani ya mzigo (stock) uliopo SASA - haihusiani na "period" (leo/mwezi/
  // mwaka) kwa sababu ni "snapshot" ya sasa hivi, lakini inaheshimu filter
  // ya "location" ili uweze kuona thamani ya duka/store moja pekee ukitaka.
  const inventoryProducts = useMemo(() => (
    locationId === 'all' ? products : products.filter(p => String(p.locationId) === String(locationId))
  ), [products, locationId]);
  const stockValueAtSellPrice = inventoryProducts.reduce((sum, p) => sum + (p.sell || 0) * (p.stock || 0), 0);
  const stockValueAtBuyPrice = inventoryProducts.reduce((sum, p) => sum + (p.buy || 0) * (p.stock || 0), 0);
  const totalStockUnits = inventoryProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const potentialProfit = stockValueAtSellPrice - stockValueAtBuyPrice;

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

      <h3 className="section-title" style={{ margin: '4px 0 12px' }}>🧾 Faida ya Wholesale — {period === 'today' ? 'Leo' : period === 'month' ? 'Mwezi Huu' : period === 'year' ? 'Mwaka Huu' : 'Muda Wote'}</h3>
      <div className="manager-stat-cards" style={{ marginBottom: 20 }}>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#0ea5e9' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.08)' }}>🏪</div>
          <div className="stat-label">Faida ya Wholesale (Store)</div>
          <div className="stat-value" style={{ color: '#0ea5e9' }}>{fmtS(wholesaleProfit.storeProfit)}</div>
          <div className="stat-sub">Mizigo iliyotoka kwenye stock yetu</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#9333ea' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(147,51,234,0.08)' }}>🏭</div>
          <div className="stat-label">Faida ya Wholesale (Dropship/Supplier)</div>
          <div className="stat-value" style={{ color: '#9333ea' }}>{fmtS(wholesaleProfit.dropshipProfit)}</div>
          <div className="stat-sub">Mizigo iliyotoka moja kwa moja kiwandani</div>
        </div>
      </div>

      <h3 className="section-title" style={{ margin: '4px 0 12px' }}>📊 Muhtasari wa Jumla (Sales + Wholesale)</h3>
      <div className="manager-stat-cards">
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#e07b2a' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(224,123,42,0.08)' }}>📈</div>
          <div className="stat-label">Total Sales (Invoiced)</div>
          <div className="stat-value">{fmtS(revenue)}</div>
          <div className="stat-sub">{filteredSales.length} transactions (paid amounts only)</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#2563eb' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.08)' }}>💵</div>
          <div className="stat-label">Cash Collected</div>
          <div className="stat-value">{fmtS(cashCollected)}</div>
          <div className="stat-sub">{paidSales.length} fully-paid + partial payments</div>
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
          <div className="stat-sub">Sales Profit + Wholesale Profit (Store+Dropship) − Expenses</div>
        </div>
      </div>

      <h3 className="section-title" style={{ margin: '20px 0 12px' }}>
        📦 Thamani ya Mzigo Uliopo Sasa (Current Stock Value)
        {locationId !== 'all' && ` — ${locations.find(l => String(l.id) === String(locationId))?.name || ''}`}
      </h3>
      <div className="manager-stat-cards">
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#0d9488' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(13,148,136,0.08)' }}>🏷️</div>
          <div className="stat-label">Thamani kwa Bei ya Kuuza (Sell Price)</div>
          <div className="stat-value" style={{ color: '#0d9488' }}>{fmtS(stockValueAtSellPrice)}</div>
          <div className="stat-sub">Ukiuza mzigo wote uliopo kwa bei ya sasa</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#7c3aed' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.08)' }}>💼</div>
          <div className="stat-label">Thamani kwa Bei ya Kununua (Buy Price)</div>
          <div className="stat-value" style={{ color: '#7c3aed' }}>{fmtS(stockValueAtBuyPrice)}</div>
          <div className="stat-sub">Ulichowekeza kwenye mzigo uliopo ({totalStockUnits} units)</div>
        </div>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: potentialProfit >= 0 ? '#16a34a' : '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.08)' }}>📈</div>
          <div className="stat-label">Faida Inayotarajiwa (Potential Profit)</div>
          <div className="stat-value" style={{ color: potentialProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(potentialProfit)}</div>
          <div className="stat-sub">Ukiuza mzigo wote — kabla ya matumizi</div>
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
