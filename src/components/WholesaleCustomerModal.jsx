import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';

const emptyForm = () => ({ name: '', phone: '', address: '', notes: '', openingBalance: '' });

// mode: 'add' | 'edit'
// Mteja wa Wholesale HAJAFUNGWA na duka/store maalum - anaweza kuhudumiwa
// kutoka Store yoyote (hiyo inachaguliwa kila anapopewa mzigo, si hapa).
export default function WholesaleCustomerModal({ open, mode, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (mode === 'edit' && initial) {
      setForm({
        name: initial.name || '', phone: initial.phone || '',
        address: initial.address || '', notes: initial.notes || '', openingBalance: '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, initial]);

  const handleSave = async () => {
    setErr('');
    if (!form.name.trim()) { setErr('Weka jina la duka la jumla (mteja)'); return; }

    setSaving(true);
    try {
      await onSubmit({
        ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim(),
        openingBalance: Number(form.openingBalance) || 0,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={mode === 'add' ? '📊 Ongeza Duka la Jumla' : '✏️ Hariri Duka la Jumla'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

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

      {mode === 'edit' && (
        <div className="form-group">
          <label className="form-label">💳 Ongeza Deni la Awali (kabla ya Godoro Pro) — hiari</label>
          <input
            className="form-input" type="number" min="0" value={form.openingBalance}
            onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            placeholder="mfano: 300000"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Kama mteja huyu ana deni la nyuma ambalo halijawahi kuwekwa kwenye mfumo, weka kiasi hapa - kitaongezwa kama mstari MPYA kwenye ledger yake (haitabadilisha/kufuta chochote kilichopo).
          </div>
        </div>
      )}

      {mode === 'add' && (
        <div className="form-group">
          <label className="form-label">💳 Deni la Awali (kabla ya Godoro Pro) — hiari</label>
          <input
            className="form-input" type="number" min="0" value={form.openingBalance}
            onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            placeholder="mfano: 300000 (ikiwa tayari mteja huyu anadaiwa kiasi fulani)"
          />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Kama mteja huyu tayari alikuwa na deni kwako kabla ya kuanza kutumia mfumo huu, weka kiasi hicho hapa - kitaongezwa moja kwa moja kama deni la mwanzo.
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Inahifadhi...' : mode === 'add' ? '+ Ongeza Duka' : '💾 Hifadhi Mabadiliko'}
        </button>
      </div>
    </Modal>
  );
}
