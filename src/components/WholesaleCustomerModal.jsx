import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = (locationId = '') => ({ locationId, name: '', phone: '', address: '', notes: '' });

// mode: 'add' | 'edit'
export default function WholesaleCustomerModal({ open, mode, initial, locationOptions, lockedLocationId, onClose, onSubmit }) {
  const { isManager } = useAuth();
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (mode === 'edit' && initial) {
      setForm({
        locationId: initial.locationId, name: initial.name || '',
        phone: initial.phone || '', address: initial.address || '', notes: initial.notes || '',
      });
    } else {
      setForm(emptyForm(lockedLocationId || locationOptions?.[0]?.id || ''));
    }
  }, [open, mode, initial, locationOptions, lockedLocationId]);

  const handleSave = async () => {
    setErr('');
    if (!form.locationId) { setErr('Chagua duka/store linalohusika'); return; }
    if (!form.name.trim()) { setErr('Weka jina la duka la jumla (mteja)'); return; }

    setSaving(true);
    try {
      await onSubmit({ ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={mode === 'add' ? '📊 Ongeza Duka la Jumla' : '✏️ Hariri Duka la Jumla'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      {isManager() && !lockedLocationId && (
        <div className="form-group">
          <label className="form-label">Linahudumiwa na Duka/Store <span className="required">*</span></label>
          <select
            className="form-select" value={form.locationId} disabled={mode === 'edit'}
            onChange={(e) => setForm({ ...form, locationId: e.target.value })}
          >
            <option value="">-- Chagua Duka/Store --</option>
            {locationOptions.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.type === 'store' ? '🏪' : '🏬'} {loc.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Jina la Duka la Jumla (Mteja) <span className="required">*</span></label>
        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mfano: Duka la Juma - Kondoa" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Namba ya Simu</label>
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxx" />
        </div>
        <div className="form-group">
          <label className="form-label">Mahali</label>
          <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="mfano: Kondoa Mjini" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Maelezo (hiari)</label>
        <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="mfano: analipa kila mwisho wa mwezi" />
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Inahifadhi...' : mode === 'add' ? '+ Ongeza Duka' : '💾 Hifadhi Mabadiliko'}
        </button>
      </div>
    </Modal>
  );
}
