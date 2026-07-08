import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { PRODUCT_NAMES, PRODUCT_SIZES, OTHER_VALUE } from '../utils/productConstants.js';
import { fmtS } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const emptyForm = (lockedLocationId) => ({
  locationId: lockedLocationId || '',
  customer: '', phone: '',
  nameSel: '', nameOther: '',
  sizeSel: '', sizeOther: '',
  quantity: 1,
  manualPrice: '',
  method: 'Cash',
  paid: '',
});

// lockedLocationId: kama salesperson - dukani lake pekee, hawezi kubadilisha
export default function AddSaleModal({ open, lockedLocationId, onClose }) {
  const { currentUser } = useAuth();
  const { locations, findMatchingProduct, addSale } = useData();
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm(lockedLocationId));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(lockedLocationId));
      setErr('');
    }
  }, [open, lockedLocationId]);

  const resolvedName = form.nameSel === OTHER_VALUE ? form.nameOther.trim() : form.nameSel;
  const resolvedSize = form.sizeSel === OTHER_VALUE ? form.sizeOther.trim() : form.sizeSel;
  const displayName = resolvedName + (resolvedSize ? ` (${resolvedSize})` : '');

  const match = useMemo(() => {
    if (!resolvedName || !form.locationId) return null;
    return findMatchingProduct(form.locationId, resolvedName, resolvedSize);
  }, [resolvedName, resolvedSize, form.locationId, findMatchingProduct]);

  const unitPrice = match ? match.sell : (parseFloat(form.manualPrice) || 0);
  const quantity = parseInt(form.quantity, 10) || 1;
  const total = unitPrice * quantity;
  const paid = parseFloat(form.paid) || 0;
  const balance = Math.max(0, total - paid);

  const handleSave = async () => {
    setErr('');
    if (!form.locationId) { setErr('Please select a location'); return; }
    if (!form.customer.trim()) { setErr('Please enter customer name'); return; }
    if (!resolvedName) { setErr('Please select or type a product'); return; }
    if (!match && (!form.manualPrice || parseFloat(form.manualPrice) <= 0)) {
      setErr('Product not found in stock — please enter a selling price');
      return;
    }

    setSaving(true);
    try {
      const sale = await addSale({
        locationId: form.locationId,
        staffId: currentUser.id,
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        productId: match ? match.id : null,
        displayName,
        manualPrice: parseFloat(form.manualPrice) || 0,
        quantity,
        method: form.method,
        paid,
      });
      showToast(`✅ Sale for ${sale.customer} saved! Total: ${fmtS(sale.total)}`);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const lockedLocation = lockedLocationId ? locations.find(l => String(l.id) === String(lockedLocationId)) : null;

  return (
    <Modal open={open} title="🛒 New Sale" onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Location <span className="required">*</span></label>
        {lockedLocation ? (
          <input className="form-input" value={`${lockedLocation.type === 'store' ? '🏪' : '🏬'} ${lockedLocation.name}`} disabled />
        ) : (
          <select className="form-select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.type === 'store' ? '🏪' : '🏬'} {l.name} ({l.type === 'store' ? 'Store' : 'Shop'})</option>
            ))}
          </select>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Customer Name <span className="required">*</span></label>
          <input className="form-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxx" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Product <span className="required">*</span></label>
        <select className="form-select" value={form.nameSel} onChange={(e) => setForm({ ...form, nameSel: e.target.value })}>
          <option value="">-- Select Product --</option>
          {PRODUCT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          <option value={OTHER_VALUE}>Other (Type manually)</option>
        </select>
        {form.nameSel === OTHER_VALUE && (
          <input className="form-input" style={{ marginTop: 8 }} placeholder="Type product name..."
            value={form.nameOther} onChange={(e) => setForm({ ...form, nameOther: e.target.value })} />
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Size</label>
        <select className="form-select" value={form.sizeSel} onChange={(e) => setForm({ ...form, sizeSel: e.target.value })}>
          <option value="">-- Select Size --</option>
          {PRODUCT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          <option value={OTHER_VALUE}>Other (Type manually)</option>
        </select>
        {form.sizeSel === OTHER_VALUE && (
          <input className="form-input" style={{ marginTop: 8 }} placeholder="Type size..."
            value={form.sizeOther} onChange={(e) => setForm({ ...form, sizeOther: e.target.value })} />
        )}
      </div>

      {resolvedName && form.locationId && (
        match ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13 }}>
            <strong style={{ color: '#16a34a' }}>📦 Found in Stock:</strong> {match.name} {match.size || ''} — Price: {fmtS(match.sell)} | Stock: {match.stock}
          </div>
        ) : (
          <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13, color: '#854d0e' }}>
            ⚠️ Product not found in this location's stock — price will be entered manually.
          </div>
        )
      )}

      {resolvedName && form.locationId && !match && (
        <div className="form-group">
          <label className="form-label">Selling Price (TZS) <span className="required">*</span></label>
          <input className="form-input" type="number" placeholder="Selling price..."
            value={form.manualPrice} onChange={(e) => setForm({ ...form, manualPrice: e.target.value })} />
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Quantity <span className="required">*</span></label>
          <input className="form-input" type="number" min="1" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select className="form-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="Cash">Cash</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Tigo Pesa">Tigo Pesa</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Unit Price</div>
          <div style={{ fontWeight: 700 }}>{fmtS(unitPrice)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Total Amount</div>
          <div style={{ fontWeight: 700, color: '#e07b2a' }}>{fmtS(total)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Balance</div>
          <div style={{ fontWeight: 700, color: balance <= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(balance)}</div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Amount Paid (TZS)</label>
        <input className="form-input" type="number" placeholder="0" value={form.paid}
          onChange={(e) => setForm({ ...form, paid: e.target.value })} />
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '✓ Complete Sale'}
        </button>
      </div>
    </Modal>
  );
}
