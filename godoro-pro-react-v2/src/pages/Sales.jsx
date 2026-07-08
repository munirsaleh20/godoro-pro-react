import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';
import AddSaleModal from '../components/AddSaleModal.jsx';
import EditSaleModal from '../components/EditSaleModal.jsx';

export default function Sales() {
  const { currentUser, isManager } = useAuth();
  const { allSalesWithLocations, getSales, totalAllSales, deleteSale, getLocation, getStaffName } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [editSale, setEditSale] = useState(null);

  const manager = isManager();
  const myLocationId = currentUser?.locationId;
  const myLocation = myLocationId ? getLocation(myLocationId) : null;

  // Manager: sales zote za maeneo yote. Salesperson: sales za duka lake tu.
  const list = manager ? allSalesWithLocations : getSales(myLocationId);
  const total = manager ? totalAllSales : list.reduce((sum, s) => sum + s.total, 0);

  const handleDelete = async (sale) => {
    const ok = await confirmAction(`Delete sale for "${sale.customer}"?\n\nThis cannot be undone!`);
    if (!ok) return;
    try {
      await deleteSale(sale.id);
      showToast('🗑️ Sale deleted!');
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  if (!manager && !myLocation) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏬</div>
        <div className="empty-title">No Shop Assigned</div>
        <div>You have not been assigned to a shop yet. Contact your manager.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h3 className="section-title">🛒 {manager ? 'All Sales' : 'My Sales'}</h3>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {manager ? 'All Locations' : myLocation?.name} · Total: <strong>{fmtS(total)}</strong>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ New Sale</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <div className="empty-title">No Sales Recorded</div>
            <div>Sales will appear here once you start selling</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Date</th>
                {manager && <th style={{ padding: 8 }}>Staff</th>}
                <th style={{ padding: 8 }}>Customer</th>
                <th style={{ padding: 8 }}>Items</th>
                {manager && <th style={{ padding: 8 }}>Location</th>}
                <th style={{ padding: 8 }}>Total</th>
                <th style={{ padding: 8 }}>Paid</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Method</th>
                {manager && <th style={{ padding: 8 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{s.date}</td>
                  {manager && <td style={{ padding: 8, fontSize: 12 }}>👤 {getStaffName(s.staffId)}</td>}
                  <td style={{ padding: 8, fontWeight: 600 }}>
                    {s.customer}
                    {s.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.phone}</div>}
                  </td>
                  <td style={{ padding: 8 }}>{s.items}</td>
                  {manager && <td style={{ padding: 8 }}>{s.locationIcon} {s.locationName}</td>}
                  <td style={{ padding: 8, fontWeight: 700 }}>{fmtS(s.total)}</td>
                  <td style={{ padding: 8 }}>{fmtS(s.paid)}</td>
                  <td style={{ padding: 8 }}>
                    <span className="badge" style={s.status === 'Paid'
                      ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a' }
                      : { background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>{s.method}</td>
                  {manager && (
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                      <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => setEditSale(s)}>✏️</button>
                      <button className="btn-ghost small" style={{ color: '#dc2626', marginLeft: 4 }} onClick={() => handleDelete(s)}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddSaleModal
        open={addOpen}
        lockedLocationId={manager ? null : myLocationId}
        onClose={() => setAddOpen(false)}
      />
      <EditSaleModal
        open={!!editSale}
        sale={editSale}
        onClose={() => setEditSale(null)}
      />
    </div>
  );
}
