import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { PRODUCT_NAMES, PRODUCT_SIZES, PRODUCT_CATEGORIES, OTHER_VALUE } from '../utils/productConstants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmt } from '../utils/format.js';

// Kila row (mstari) ni bidhaa moja ya kuongeza. `sell`, `buy`, `stock` ni
// text-state (kama ilivyo kwenye ProductFormModal) ili input ibaki huru
// wakati mtumiaji anaandika, kisha tunaresolve namba wakati wa kuonyesha
// jumla (total) na wakati wa kutuma (submit).
const emptyRow = () => ({
  nameSel: '', nameOther: '',
  sizeSel: '', sizeOther: '',
  brandSel: '', brandOther: '',
  buy: '', sell: '', stock: '', cat: 'Spring',
});

// KIPENGELE: "Listing more than one product at a time at the same store" -
// badala ya kuadd bidhaa moja moja, hapa unachagua duka MOJA, kisha
// unaongeza mistari (rows) mingi ya bidhaa tofauti kwa wakati mmoja.
// Kila mstari unaonyesha Thamani (Total Value) = Sell Price x Qty
// AUTOMATIC - hata ukiwa na bidhaa hiyo hiyo zaidi ya mara moja (mfano
// umeandika "Vita Raha" mara mbili kwa makosa, au unaongeza kundi kubwa),
// backend (bulkAddProducts/addProduct) itaunganisha (merge) stock ya
// bidhaa iliyokuwepo tayari badala ya kuunda duplicate.
export default function BulkAddProductsModal({ open, locationOptions, onClose, onSubmit }) {
  const { isManager } = useAuth();
  const { knownBrands } = useData();
  const [locationId, setLocationId] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    setLocationId(locationOptions?.[0]?.id || '');
    setRows([emptyRow()]);
  }, [open, locationOptions]);

  const updateRow = (idx, patch) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const resolved = rows.map(r => {
    const name = r.nameSel === OTHER_VALUE ? r.nameOther.trim() : r.nameSel;
    const size = r.sizeSel === OTHER_VALUE ? r.sizeOther.trim() : r.sizeSel;
    const brand = r.brandSel === OTHER_VALUE ? r.brandOther.trim() : r.brandSel;
    const sell = parseFloat(r.sell) || 0;
    const buy = parseFloat(r.buy) || 0;
    const stock = parseInt(r.stock, 10) || 0;
    return { name, size, brand, sell, buy, stock, cat: r.cat, totalValue: sell * stock };
  });

  const grandTotal = resolved.reduce((sum, r) => sum + r.totalValue, 0);
  const grandUnits = resolved.reduce((sum, r) => sum + r.stock, 0);

  const handleSave = async () => {
    setErr('');
    if (!locationId) { setErr('Please select a location'); return; }
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      if (!r.name) { setErr(`Row ${i + 1}: please select or type a product name`); return; }
      if (!r.sell || r.sell <= 0) { setErr(`Row ${i + 1}: please enter a valid sell price`); return; }
      if (!r.stock || r.stock <= 0) { setErr(`Row ${i + 1}: please enter a valid quantity`); return; }
    }
    setSaving(true);
    try {
      await onSubmit(locationId, resolved.map(r => ({
        name: r.name, size: r.size, brand: r.brand, buy: r.buy, sell: r.sell, stock: r.stock, cat: r.cat,
      })));
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="📦 Bulk Add Products (List Multiple at Once)" onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Store / Location <span className="required">*</span></label>
        <select className="form-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">-- Select Location --</option>
          {locationOptions.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.type === 'store' ? '🏪' : '🏬'} {loc.name} ({loc.location})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', margin: '12px 0' }}>
        {rows.map((r, idx) => {
          const rv = resolved[idx];
          return (
            <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, position: 'relative' }}>
              {rows.length > 1 && (
                <button className="btn-ghost small" style={{ position: 'absolute', top: 8, right: 8, color: '#dc2626' }}
                  onClick={() => removeRow(idx)}>🗑️</button>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Product {idx + 1}</div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Product Name <span className="required">*</span></label>
                  <select className="form-select" value={r.nameSel} onChange={(e) => updateRow(idx, { nameSel: e.target.value })}>
                    <option value="">-- Select --</option>
                    {PRODUCT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    <option value={OTHER_VALUE}>Other (Type manually)</option>
                  </select>
                  {r.nameSel === OTHER_VALUE && (
                    <input className="form-input" style={{ marginTop: 8 }} placeholder="Type product name..."
                      value={r.nameOther} onChange={(e) => updateRow(idx, { nameOther: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Size</label>
                  <select className="form-select" value={r.sizeSel} onChange={(e) => updateRow(idx, { sizeSel: e.target.value })}>
                    <option value="">-- Select --</option>
                    {PRODUCT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value={OTHER_VALUE}>Other (Type manually)</option>
                  </select>
                  {r.sizeSel === OTHER_VALUE && (
                    <input className="form-input" style={{ marginTop: 8 }} placeholder="Type size..."
                      value={r.sizeOther} onChange={(e) => updateRow(idx, { sizeOther: e.target.value })} />
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <select className="form-select" value={r.brandSel} onChange={(e) => updateRow(idx, { brandSel: e.target.value })}>
                    <option value="">-- Select --</option>
                    {knownBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value={OTHER_VALUE}>Other (Type manually)</option>
                  </select>
                  {r.brandSel === OTHER_VALUE && (
                    <input className="form-input" style={{ marginTop: 8 }} placeholder="Type brand..."
                      value={r.brandOther} onChange={(e) => updateRow(idx, { brandOther: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={r.cat} onChange={(e) => updateRow(idx, { cat: e.target.value })}>
                    {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                {isManager() && (
                  <div className="form-group">
                    <label className="form-label">Buy Price (TZS)</label>
                    <input className="form-input" type="number" placeholder="65000"
                      value={r.buy} onChange={(e) => updateRow(idx, { buy: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Sell Price (TZS) <span className="required">*</span></label>
                  <input className="form-input" type="number" placeholder="110000"
                    value={r.sell} onChange={(e) => updateRow(idx, { sell: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qty <span className="required">*</span></label>
                  <input className="form-input" type="number" min="1" placeholder="10"
                    value={r.stock} onChange={(e) => updateRow(idx, { stock: e.target.value })} />
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: 13, color: '#0d9488', fontWeight: 700 }}>
                Value: {fmt(rv.sell)} × {rv.stock || 0} = {fmt(rv.totalValue)}
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-ghost" onClick={addRow} style={{ marginBottom: 14 }}>+ Add Another Product</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Total Units</div>
          <div style={{ fontWeight: 700 }}>{grandUnits}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Total Value (Auto)</div>
          <div style={{ fontWeight: 700, color: '#e07b2a' }}>{fmt(grandTotal)}</div>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : `+ Add ${rows.length} Product${rows.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </Modal>
  );
}
