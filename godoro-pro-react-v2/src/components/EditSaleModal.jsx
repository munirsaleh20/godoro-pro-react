import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function EditSaleModal({ open, sale, onClose }) {
  const { updateSale } = useData();
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && sale) {
      setForm({
        customer: sale.customer,
        items: sale.items,
        total: sale.total,
        paid: sale.paid,
        status: sale.status,
        method: sale.method,
        date: sale.date,
      });
      setErr('');
    }
  }, [open, sale]);

  if (!form) return null;

  const handleSave = async () => {
    setErr('');
    const total = parseFloat(form.total) || 0;
    const paid = parseFloat(form.paid) || 0;
    if (!total || total <= 0) { setErr('Please enter a valid total'); return; }

    setSaving(true);
    try {
      await updateSale(sale.id, { ...form, customer: form.customer.trim() || 'Walk-in Customer', total, paid });
      showToast('✅ Sale updated!');
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="✏️ Edit Sale" onClose={onClose}>
      {err && <div className="form-error">{err}</div>}
      <div className="form-group">
        <label className="form-label">Customer Name</label>
        <input className="form-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Items</label>
        <input className="form-input" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Total (TZS)</label>
          <input className="form-input" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Paid (TZS)</label>
          <input className="form-input" type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Paid">Paid</option>
            <option value="Debt">Debt</option>
          </select>
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
      <div className="form-group">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>
      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
