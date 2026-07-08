import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';

// mode: 'add' | 'edit' (edit inaruhusu kubadilisha role/location tu, si password)
export default function StaffFormModal({ open, mode, initial, onClose, onSubmit }) {
  const { locations } = useData();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'salesperson', locationId: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (mode === 'edit' && initial) {
      setForm({ name: initial.name, email: initial.email, password: '', role: initial.role, locationId: initial.locationId || '' });
    } else {
      setForm({ name: '', email: '', password: '', role: 'salesperson', locationId: locations.find(l => l.type === 'shop')?.id || '' });
    }
  }, [open, mode, initial, locations]);

  const handleSave = async () => {
    setErr('');
    if (mode === 'add') {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        setErr('Please fill in name, email and password');
        return;
      }
      if (form.password.length < 6) {
        setErr('Password must be at least 6 characters');
        return;
      }
    }
    if (form.role === 'salesperson' && !form.locationId) {
      setErr('Please select a location for the salesperson');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={mode === 'add' ? '👥 Add Staff' : '✏️ Edit Staff'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Full Name <span className="required">*</span></label>
        <input className="form-input" value={form.name} disabled={mode === 'edit'}
          onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Staff name" />
      </div>

      <div className="form-group">
        <label className="form-label">Email <span className="required">*</span></label>
        <input className="form-input" type="email" value={form.email} disabled={mode === 'edit'}
          onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@example.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Role <span className="required">*</span></label>
        <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="salesperson">🛒 Salesperson</option>
          <option value="manager">🏢 Manager</option>
        </select>
      </div>

      {form.role === 'salesperson' && (
        <div className="form-group">
          <label className="form-label">Location (Shop) <span className="required">*</span></label>
          <select className="form-select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.type === 'store' ? '🏪' : '🏬'} {l.name}</option>
            ))}
          </select>
        </div>
      )}

      {mode === 'add' && (
        <div className="form-group">
          <label className="form-label">Password <span className="required">*</span></label>
          <input className="form-input" type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </div>
      )}

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : mode === 'add' ? '+ Add Staff' : '💾 Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
