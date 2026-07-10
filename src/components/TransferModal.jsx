import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';

export default function TransferModal({ open, onClose, onSubmit, mode = 'add', initial = null }) {
  const { stores, shops, getProducts } = useData();
  const isEdit = mode === 'edit';

  const [fromStore, setFromStore] = useState('');
  const [toShop, setToShop] = useState('');
  const [note, setNote] = useState('');
  const [quantities, setQuantities] = useState({}); // productId (or "name|size" in edit mode) -> qty string
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (isEdit && initial) {
      setFromStore(initial.fromLocationId || '');
      setToShop(initial.toLocationId || '');
      setNote(initial.note || '');
      const q = {};
      (initial.items || []).forEach(it => {
        q[`${it.name}|${it.size || ''}`] = String(it.quantity);
      });
      setQuantities(q);
    } else {
      setFromStore(stores[0]?.id || '');
      setToShop('');
      setNote('');
      setQuantities({});
    }
  }, [open, stores, isEdit, initial]);

  const storeProducts = useMemo(() => (fromStore ? getProducts(fromStore) : []), [fromStore, getProducts]);

  // Katika hali ya "add", tunaonyesha bidhaa zote za store husika.
  // Katika hali ya "edit", tunaonyesha bidhaa zilizokuwa kwenye uhamisho
  // huo awali (hata kama jina/ukubwa halifanani kabisa na bidhaa iliyopo
  // sasa) - ili mtumiaji aweze kurekebisha idadi bila kupoteza rekodi.
  const editRows = useMemo(() => {
    if (!isEdit || !initial) return [];
    return (initial.items || []).map(it => {
      const key = `${it.name}|${it.size || ''}`;
      const live = storeProducts.find(p => (
        p.name.trim().toLowerCase() === (it.name || '').trim().toLowerCase() &&
        (p.size || '').trim().toLowerCase() === (it.size || '').trim().toLowerCase()
      ));
      // Idadi ya juu inayoruhusiwa = stock ya sasa + idadi iliyokuwa tayari
      // imehamishwa (kwa sababu idadi hiyo tayari ilitolewa kwenye stock).
      const maxQty = live ? live.stock + it.quantity : null;
      return { key, name: it.name, size: it.size, buy: live?.buy, sell: live?.sell, cat: live?.cat, brand: live?.brand,
        stock: live ? live.stock : null, maxQty };
    });
  }, [isEdit, initial, storeProducts]);

  const rows = isEdit ? editRows : storeProducts.map(p => ({ key: p.id, name: p.name, size: p.size, buy: p.buy, sell: p.sell, cat: p.cat, brand: p.brand, stock: p.stock, maxQty: p.stock }));

  const summaryItems = rows
    .map(r => ({ ...r, qty: parseInt(quantities[r.key], 10) || 0 }))
    .filter(r => r.qty > 0);
  const totalUnits = summaryItems.reduce((sum, r) => sum + r.qty, 0);

  const handleSubmit = async () => {
    setErr('');
    if (!fromStore) { setErr('Please select a source Store'); return; }
    if (!toShop) { setErr('Please select a destination Shop'); return; }
    if (fromStore === toShop) { setErr('Source and destination cannot be the same'); return; }
    if (!summaryItems.length) { setErr('Please enter at least one quantity to transfer'); return; }

    const items = summaryItems.map(r => ({
      productId: isEdit ? undefined : r.key, name: r.name, size: r.size, brand: r.brand,
      buy: r.buy, sell: r.sell, cat: r.cat, stock: r.stock, quantity: r.qty,
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
    <Modal open={open} title={isEdit ? '✏️ Edit Transfer — Store → Shop' : '📦 Transfer Products — Store → Shop'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">📦 From Store (Warehouse) <span className="required">*</span></label>
          <select
            className="form-select" value={fromStore} disabled={isEdit}
            onChange={(e) => { setFromStore(e.target.value); if (!isEdit) setQuantities({}); }}
          >
            <option value="">-- Select Store --</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">🏬 To Shop (Outlet) <span className="required">*</span></label>
          <select className="form-select" value={toShop} disabled={isEdit} onChange={(e) => setToShop(e.target.value)}>
            <option value="">-- Select Shop --</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {isEdit && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: -6, marginBottom: 10 }}>
          Source and destination can't be changed when editing — only quantities and note.
        </div>
      )}

      {fromStore && (
        rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No Products</div>
            <div>This store has no products. Add products first.</div>
          </div>
        ) : (
          <div>
            <div style={{ background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700 }}>
              📋 {isEdit ? 'Adjust Quantities Transferred' : 'Select Products and Quantities to Transfer'}
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
                  {rows.map(r => (
                    <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px' }}>{r.name} {r.size ? `(${r.size})` : ''}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.stock ?? '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input
                          type="number" min="0" max={r.maxQty ?? undefined}
                          className="form-input" style={{ width: 80, textAlign: 'center', padding: '4px 6px' }}
                          value={quantities[r.key] || ''}
                          onChange={(e) => setQuantities({ ...quantities, [r.key]: e.target.value })}
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
                {summaryItems.map(r => `${r.name} (${r.qty})`).join(', ')} — {totalUnits} units total
              </div>
            )}
          </div>
        )
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        {summaryItems.length > 0 && (
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? '💾 Save Changes' : '📦 Transfer Products →'}
          </button>
        )}
      </div>
    </Modal>
  );
}
