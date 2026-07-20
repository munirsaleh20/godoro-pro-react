import { useState, Fragment } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';
import AddSaleModal from '../components/AddSaleModal.jsx';
import EditSaleModal from '../components/EditSaleModal.jsx';

export default function Sales() {
  const { currentUser, isManager } = useAuth();
  const { allSalesWithLocations, getSales, totalAllSales, deleteSale, getLocation, getStaffName, dailySalesSummary } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [expandedSalesDate, setExpandedSalesDate] = useState(null);

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
          <h3 className="section-title">🛒 {manager ? 'All Sales' : 'My Shop Sales'}</h3>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {manager ? 'All Locations' : myLocation?.name} · Total: <strong>{fmtS(total)}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {manager && (
            <button className="btn-ghost" onClick={() => setShowSummary(s => !s)}>
              {showSummary ? '🛒 Hide Daily Summary' : '📅 Daily Summary'}
            </button>
          )}
          {manager && <button className="btn-primary" onClick={() => setAddOpen(true)}>+ New Sale</button>}
        </div>
      </div>

      {manager && showSummary && (
        <div className="table-container" style={{ overflowX: 'auto', marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>📅 Muhtasari wa Mauzo kwa Siku</h3>
          {dailySalesSummary.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <div className="empty-title">No Data Yet</div>
              <div>Fanya mauzo ili muhtasari uonekane hapa</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8 }}>Store</th>
                  <th style={{ padding: 8 }}>Sales</th>
                  <th style={{ padding: 8 }}>Paid</th>
                  <th style={{ padding: 8 }}>Debt</th>
                  <th style={{ padding: 8 }}>Total Revenue</th>
                  <th style={{ padding: 8 }}>Profit</th>
                  <th style={{ padding: 8 }}>Amount Collected</th>
                  <th style={{ padding: 8 }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {dailySalesSummary.map(d => {
                  const rowKey = `${d.date}|${d.locationId}`;
                  const isOpen = expandedSalesDate === rowKey;
                  const daySales = isOpen ? allSalesWithLocations.filter(s => s.date === d.date && String(s.locationId) === String(d.locationId)) : [];
                  return (
                    <Fragment key={rowKey}>
                      <tr
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setExpandedSalesDate(isOpen ? null : rowKey)}
                      >
                        <td style={{ padding: 8 }}>{isOpen ? '▾' : '▸'} {d.date}</td>
                        <td style={{ padding: 8 }}>{d.locationIcon} {d.locationName}</td>
                        <td style={{ padding: 8, fontWeight: 700 }}>{d.count}</td>
                        <td style={{ padding: 8, color: '#16a34a' }}>{d.paidCount}</td>
                        <td style={{ padding: 8, color: '#dc2626' }}>{d.debtCount}</td>
                        <td style={{ padding: 8, fontWeight: 700, color: '#0d9488' }}>{fmtS(d.totalRevenue)}</td>
                        <td style={{ padding: 8, fontWeight: 700, color: d.totalProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(d.totalProfit)}</td>
                        <td style={{ padding: 8 }}>{fmtS(d.totalPaid)}</td>
                        <td style={{ padding: 8, color: d.totalDebt > 0 ? '#dc2626' : '#64748b' }}>{fmtS(d.totalDebt)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: '#f8fafc' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                                  <th style={{ padding: '6px 8px 6px 28px' }}>Customer</th>
                                  <th style={{ padding: 6 }}>Staff</th>
                                  <th style={{ padding: 6 }}>Location</th>
                                  <th style={{ padding: 6 }}>Items</th>
                                  <th style={{ padding: 6 }}>Total</th>
                                  <th style={{ padding: 6 }}>Profit</th>
                                  <th style={{ padding: 6 }}>Paid</th>
                                  <th style={{ padding: 6 }}>Status</th>
                                  <th style={{ padding: 6 }}>Method</th>
                                </tr>
                              </thead>
                              <tbody>
                                {daySales.length === 0 ? (
                                  <tr><td colSpan={9} style={{ padding: '8px 8px 8px 28px', color: '#94a3b8' }}>No entries</td></tr>
                                ) : daySales.map(s => {
                                  const profit = (s.total || 0) - ((s.unitCost || 0) * (s.quantity || 0));
                                  return (
                                  <tr
                                    key={s.id}
                                    style={{ borderTop: '1px solid #e2e8f0', cursor: 'pointer' }}
                                    onClick={() => setEditSale(s)}
                                    title="Bofya kuona details"
                                  >
                                    <td style={{ padding: '6px 8px 6px 28px', fontWeight: 600 }}>{s.customer}</td>
                                    <td style={{ padding: 6, fontSize: 12 }}>👤 {getStaffName(s.staffId)}</td>
                                    <td style={{ padding: 6 }}>{s.locationIcon} {s.locationName}</td>
                                    <td style={{ padding: 6 }}>{s.items}</td>
                                    <td style={{ padding: 6, fontWeight: 700 }}>{fmtS(s.total)}</td>
                                    <td style={{ padding: 6, fontWeight: 700, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(profit)}</td>
                                    <td style={{ padding: 6 }}>{fmtS(s.paid)}</td>
                                    <td style={{ padding: 6 }}>
                                      <span className="badge" style={s.status === 'Paid'
                                        ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a' }
                                        : { background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                                        {s.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: 6 }}>{s.method}</td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

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
                {manager && <th style={{ padding: 8 }}>Buying Price</th>}
                {manager && <th style={{ padding: 8 }}>Profit</th>}
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
                  {manager && <td style={{ padding: 8, fontWeight: 700, color: '#94a3b8' }}>{fmtS((s.unitCost || 0) * (s.quantity || 0))}</td>}
                  {manager && (
                    <td style={{ padding: 8, fontWeight: 700, color: ((s.total || 0) - (s.unitCost || 0) * (s.quantity || 0)) >= 0 ? '#16a34a' : '#dc2626' }}>
                      {fmtS((s.total || 0) - (s.unitCost || 0) * (s.quantity || 0))}
                    </td>
                  )}
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

      {manager && (
        <AddSaleModal
          open={addOpen}
          lockedLocationId={null}
          onClose={() => setAddOpen(false)}
        />
      )}
      <EditSaleModal
        open={!!editSale}
        sale={editSale}
        onClose={() => setEditSale(null)}
      />
    </div>
  );
}
