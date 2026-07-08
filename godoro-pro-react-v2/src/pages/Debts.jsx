import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';

export default function Debts() {
  const { currentUser, isManager } = useAuth();
  const { allDebtsWithLocations, totalAllDebts, markDebtPaid, deleteDebt } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [search, setSearch] = useState('');

  // Salesperson anaona deni za duka lake pekee
  let list = isManager()
    ? allDebtsWithLocations
    : allDebtsWithLocations.filter(d => String(d.locationId) === String(currentUser.locationId));

  if (search.trim()) {
    const s = search.toLowerCase().trim();
    list = list.filter(d => d.customer.toLowerCase().includes(s) || (d.phone || '').includes(s));
  }

  const total = list.reduce((sum, d) => sum + (d.amount || 0), 0);

  const handleMarkPaid = async (d) => {
    const ok = await confirmAction(`Mark debt of ${fmtS(d.amount)} from "${d.customer}" as fully paid?`);
    if (!ok) return;
    try {
      await markDebtPaid(d.id);
      showToast(`✅ Debt cleared for ${d.customer}!`);
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (d) => {
    const ok = await confirmAction(`Delete this debt record for "${d.customer}"?\n\nThis only removes the debt record, not the sale.`);
    if (!ok) return;
    try {
      await deleteDebt(d.id);
      showToast('🗑️ Debt record deleted');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">💳 Debts ({list.length})</h3>
        <input
          className="form-input"
          style={{ maxWidth: 240 }}
          placeholder="Search customer or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💳</div>
          <div className="stat-label">Total Outstanding {isManager() ? '' : '(Your Shop)'}</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{fmtS(isManager() ? totalAllDebts : total)}</div>
          <div className="stat-sub">{list.length} unpaid customers</div>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">No Outstanding Debts</div>
            <div>All customers are paid up!</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Customer</th>
                <th style={{ padding: 8 }}>Phone</th>
                {isManager() && <th style={{ padding: 8 }}>Location</th>}
                <th style={{ padding: 8 }}>Amount Owed</th>
                {isManager() && <th style={{ padding: 8 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{d.date}</td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{d.customer}</td>
                  <td style={{ padding: 8 }}>{d.phone || 'N/A'}</td>
                  {isManager() && <td style={{ padding: 8 }}>{d.locationIcon} {d.locationName}</td>}
                  <td style={{ padding: 8, color: '#dc2626', fontWeight: 700 }}>{fmtS(d.amount)}</td>
                  {isManager() && (
                    <td style={{ padding: 8 }}>
                      <button className="btn-ghost small" style={{ color: '#16a34a' }} onClick={() => handleMarkPaid(d)}>✅ Mark Paid</button>
                      <button className="btn-ghost small" style={{ color: '#dc2626', marginLeft: 4 }} onClick={() => handleDelete(d)}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1a1a2e', background: '#f8fafc' }}>
                <td colSpan={isManager() ? 4 : 3} style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>Total:</td>
                <td style={{ padding: 8, fontWeight: 900, color: '#dc2626' }}>{fmtS(total)}</td>
                {isManager() && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
