import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

const emptyForm = () => ({ name: '', phone: '', address: '', notes: '' });

// mode: 'add' | 'edit'
export default function SupplierModal({ open, mode, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (mode === 'edit' && initial) {
      setForm({ name: initial.name || '', phone: initial.phone || '', address: initial.address || '', notes: initial.notes || '' });
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, initial]);

  const handleSave = async () => {
    setErr('');
    if (!form.name.trim()) { setErr('Weka jina la kiwanda/msambazaji'); return; }

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
    <Modal open={open} title={mode === 'add' ? '🏭 Ongeza Kiwanda/Msambazaji' : '✏️ Hariri Kiwanda'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Jina la Kiwanda/Msambazaji <span className="required">*</span></label>
        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mfano: Vitafoam Tanzania" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Namba ya Simu</label>
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxx" />
        </div>
        <div className="form-group">
          <label className="form-label">Mahali</label>
          <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="mfano: Dar es Salaam" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Maelezo (hiari)</label>
        <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="mfano: mawasiliano ya moja kwa moja na meneja mauzo" />
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Inahifadhi...' : mode === 'add' ? '+ Ongeza Kiwanda' : '💾 Hifadhi Mabadiliko'}
        </button>
      </div>
    </Modal>
  );
}
