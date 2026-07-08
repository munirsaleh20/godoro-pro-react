import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';

export default function TransferModal({ open, onClose, onSubmit }) {
  const { stores, shops, getProducts } = useData();
  const [fromStore, setFromStore] = useState('');
  const [toShop, setToShop] = useState('');
  const [note, setNote] = useState('');
  const [quantities, setQuantities] = useState({}); // productId -> qty string
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromStore(stores[0]?.id || '');
    setToShop('');
    setNote('');
    setQuantities({});
    setErr('');
  }, [open, stores]);

  const storeProducts = useMemo(() => (fromStore ? getProducts(fromStore) : []), [fromStore, getProducts]);

  const summaryItems = storeProducts
    .map(p => ({ ...p, qty: parseInt(quantities[p.id], 10) || 0 }))
    .filter(p => p.qty > 0);
  const totalUnits = summaryItems.reduce((sum, p) => sum + p.qty, 0);

  const handleSubmit = async () => {
    setErr('');
    if (!fromStore) { setErr('Please select a source Store'); return; }
    if (!toShop) { setErr('Please select a destination Shop'); return; }
    if (fromStore === toShop) { setErr('Source and destination cannot be the same'); return; }
    if (!summaryItems.length) { setErr('Please enter at least one quantity to transfer'); return; }

    const items = summaryItems.map(p => ({
      productId: p.id, name: p.name, size: p.size, brand: p.brand,
      buy: p.buy, sell: p.sell, cat: p.cat, stock: p.stock, quantity: p.qty,
    }));

    setSaving(true);
    try {
      await onSubmit({ fromLocationId: fromStore, toLocationId: toShop, note: note.trim(), items });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="📦 Transfer Products — Store → Shop" onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">📦 From Store (Warehouse) <span className="required">*</span></label>
          <select className="form-select" value={fromStore} onChange={(e) => { setFromStore(e.target.value); setQuantities({}); }}>
            <option value="">-- Select Store --</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">🏬 To Shop (Outlet) <span className="required">*</span></label>
          <select className="form-select" value={toShop} onChange={(e) => setToShop(e.target.value)}>
            <option value="">-- Select Shop --</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {fromStore && (
        storeProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No Products</div>
            <div>This store has no products. Add products first.</div>
          </div>
        ) : (
          <div>
            <div style={{ background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700 }}>
              📋 Select Products and Quantities to Transfer
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Product</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Stock</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Qty to Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {storeProducts.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px' }}>{p.name} {p.size ? `(${p.size})` : ''}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.stock}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input
                          type="number" min="0" max={p.stock}
                          className="form-input" style={{ width: 80, textAlign: 'center', padding: '4px 6px' }}
                          value={quantities[p.id] || ''}
                          onChange={(e) => setQuantities({ ...quantities, [p.id]: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Note (optional)</label>
              <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., First week of month supply" />
            </div>

            {summaryItems.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13 }}>
                <strong style={{ color: '#16a34a' }}>✅ You will transfer:</strong>{' '}
                {summaryItems.map(p => `${p.name} (${p.qty})`).join(', ')} — {totalUnits} units total
              </div>
            )}
          </div>
        )
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        {summaryItems.length > 0 && (
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Transferring...' : '📦 Transfer Products →'}
          </button>
        )}
      </div>
    </Modal>
  );
}
