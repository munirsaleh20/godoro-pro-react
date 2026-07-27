import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS } from '../utils/format.js';

export default function Returns() {
  const { isManager } = useAuth();
  const { returns, getLocation } = useData();

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Returns are for Owner/Manager only.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 className="section-title">↩️ Returns & Exchanges</h3>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Use the ↩️ button next to a sale on the Sales page to record a new return or exchange.
          </div>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {returns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">↩️</div>
            <div className="empty-title">No Returns Yet</div>
            <div>Returns and exchanges recorded from the Sales page will appear here</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Location</th>
                <th style={{ padding: 8 }}>Customer</th>
                <th style={{ padding: 8 }}>Type</th>
                <th style={{ padding: 8 }}>Returned</th>
                <th style={{ padding: 8 }}>Given Instead</th>
                <th style={{ padding: 8 }}>Refund Value</th>
                <th style={{ padding: 8 }}>Difference</th>
                <th style={{ padding: 8 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => {
                const loc = getLocation(r.locationId);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8 }}>{r.date}</td>
                    <td style={{ padding: 8 }}>{loc ? (loc.type === 'store' ? '🏪' : '🏬') : ''} {loc?.name || 'Unknown'}</td>
                    <td style={{ padding: 8 }}>{r.customer || '—'}</td>
                    <td style={{ padding: 8 }}>
                      <span className="badge" style={r.type === 'exchange'
                        ? { background: 'rgba(217,119,6,0.1)', color: '#d97706' }
                        : { background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                        {r.type === 'exchange' ? '🔁 Exchange' : '↩️ Return'}
                      </span>
                    </td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.returnedName} × {r.returnedQuantity}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.type === 'exchange' ? `${r.exchangeName} × ${r.exchangeQuantity}` : '—'}</td>
                    <td style={{ padding: 8, fontWeight: 700 }}>{fmtS(r.refundAmount)}</td>
                    <td style={{ padding: 8, fontWeight: 700, color: r.differenceAmount > 0 ? '#d97706' : r.differenceAmount < 0 ? '#dc2626' : '#16a34a' }}>
                      {r.type === 'exchange' ? (
                        r.differenceAmount > 0 ? `+${fmtS(r.differenceAmount)} (customer pays)` :
                        r.differenceAmount < 0 ? `-${fmtS(Math.abs(r.differenceAmount))} (refund)` : 'Even'
                      ) : '—'}
                    </td>
                    <td style={{ padding: 8, fontSize: 12, color: '#64748b' }}>{r.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
