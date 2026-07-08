import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import TransferModal from '../components/TransferModal.jsx';

export default function Transfers() {
  const { isManager } = useAuth();
  const { allTransfersWithLocations, executeTransfer } = useData();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Transfers are for Owner/Manager only.</div>
      </div>
    );
  }

  const handleSubmit = async (payload) => {
    const t = await executeTransfer(payload);
    showToast(`✅ Transferred ${t.items.reduce((s, i) => s + i.quantity, 0)} units successfully!`);
    setModalOpen(false);
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="section-title">📦 Stock Transfers</h3>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>📦 New Transfer</button>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {allTransfersWithLocations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No Transfers Yet</div>
            <div>Transfer stock from a Store to a Shop to get started</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>From</th>
                <th style={{ padding: 8 }}>To</th>
                <th style={{ padding: 8 }}>Items</th>
                <th style={{ padding: 8 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {allTransfersWithLocations.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{t.date}</td>
                  <td style={{ padding: 8 }}>🏪 {t.fromName}</td>
                  <td style={{ padding: 8 }}>🏬 {t.toName}</td>
                  <td style={{ padding: 8, fontSize: 12 }}>
                    {(t.items || []).map(i => `${i.name} (${i.quantity})`).join(', ')}
                  </td>
                  <td style={{ padding: 8, fontSize: 12, color: '#64748b' }}>{t.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TransferModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
    </div>
  );
}
