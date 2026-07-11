import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { fmtS, today } from '../utils/format.js';

// Inarekodi malipo ya AWAMU (installment) kutoka kwa duka la jumla. Malipo
// hayahitaji kufunika deni lote - mteja anaweza kulipa kidogo kidogo, na
// balance mpya inaonekana moja kwa moja kwenye "sheet" yake baada ya hapa.
export default function WholesalePaymentModal({ open, customer, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    setAmount('');
    setDate(today());
    setDescription('');
  }, [open, customer]);

  if (!customer) return null;

  const handleSubmit = async () => {
    setErr('');
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setErr('Weka kiasi kikubwa kuliko sifuri'); return; }

    setSaving(true);
    try {
      await onSubmit({ amount: amt, date, description: description.trim() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={`💰 Rekodi Malipo — ${customer.name}`} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
        Deni la sasa: <strong style={{ color: customer.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtS(Math.max(0, customer.balance))}</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Kiasi Kilicholipwa (TZS) <span className="required">*</span></label>
        <input
          className="form-input" type="number" min="0" step="any"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tarehe</label>
          <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Maelezo (hiari)</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="mfano: awamu ya kwanza" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Inahifadhi...' : '💾 Rekodi Malipo'}
        </button>
      </div>
    </Modal>
  );
}
