import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { today } from '../utils/format.js';

const CATEGORIES = ['Rent', 'Salary', 'Utilities', 'Supplies', 'Maintenance'];
const OTHER_VALUE = '__other__';

const emptyForm = (locationId = '') => ({
  locationId, date: today(), cat: 'Rent', catOther: '', desc: '', amount: '', to: '',
});

// mode: 'add' | 'edit'
export default function ExpenseFormModal({ open, mode, initial, locationOptions, lockedLocationId, onClose, onSubmit }) {
  const { isManager } = useAuth();
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (mode === 'edit' && initial) {
      const knownCat = CATEGORIES.includes(initial.cat);
      setForm({
        locationId: initial.locationId, date: initial.date || today(),
        cat: knownCat ? (initial.cat || 'Rent') : OTHER_VALUE,
        catOther: knownCat ? '' : (initial.cat || ''),
        desc: initial.desc || '',
        amount: initial.amount || '', to: initial.to || '',
      });
    } else {
      setForm(emptyForm(lockedLocationId || locationOptions?.[0]?.id || ''));
    }
  }, [open, mode, initial, locationOptions, lockedLocationId]);

  const resolvedCat = form.cat === OTHER_VALUE ? form.catOther.trim() : form.cat;

  const handleSave = async () => {
    setErr('');
    if (!form.locationId) { setErr('Please select a location'); return; }
    if (!form.date) { setErr('Please select a date'); return; }
    if (form.cat === OTHER_VALUE && !resolvedCat) { setErr('Please type the category'); return; }
    if (!form.desc.trim()) { setErr('Please enter a description'); return; }
    const amountNum = parseFloat(form.amount) || 0;
    if (!amountNum || amountNum <= 0) { setErr('Please enter a valid amount'); return; }

    setSaving(true);
    try {
      await onSubmit({ ...form, cat: resolvedCat, amount: amountNum, desc: form.desc.trim(), to: form.to.trim() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={mode === 'add' ? '💸 Add Expense' : '✏️ Edit Expense'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      {isManager() && !lockedLocationId && (
        <div className="form-group">
          <label className="form-label">Location <span className="required">*</span></label>
          <select className="form-select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locationOptions.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.type === 'store' ? '🏪' : '🏬'} {loc.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Date <span className="required">*</span></label>
        <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>

      <div className="form-group">
        <label className="form-label">Category <span className="required">*</span></label>
        <select className="form-select" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          <option value={OTHER_VALUE}>Other (type your own)</option>
        </select>
        {form.cat === OTHER_VALUE && (
          <input className="form-input" style={{ marginTop: 8 }} placeholder="Type category..."
            value={form.catOther} onChange={(e) => setForm({ ...form, catOther: e.target.value })} />
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Description <span className="required">*</span></label>
        <input className="form-input" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Expense description" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Amount (TZS) <span className="required">*</span></label>
          <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Paid To</label>
          <input className="form-input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="Recipient name" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : mode === 'add' ? '+ Add Expense' : '💾 Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
