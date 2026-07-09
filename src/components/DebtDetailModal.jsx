import { useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';

// Inaonyesha: jumla ya mauzo (total), kiasi kilicholipwa mpaka sasa, na
// kiasi kinachobaki (balance). Owner/Manager pekee wanaweza ku-rekodi
// malipo mapya - Salesperson anaweza kuona taarifa tu (read-only).
export default function DebtDetailModal({ open, debt, onClose }) {
  const { sales, recordDebtPayment } = useData();
  const { isManager } = useAuth();
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (!open || !debt) return null;

  const sale = sales.find(s => String(s.id) === String(debt.saleId));
  const total = sale?.total ?? debt.amount;
  const paidSoFar = sale?.paid ?? 0;
  const remaining = debt.amount;

  const handlePay = async (payFull) => {
    setErr('');
    const amt = payFull ? remaining : (parseFloat(amount) || 0);
    if (amt <= 0) { setErr('Enter an amount greater than zero'); return; }
    if (amt > remaining + 0.01) { setErr(`Amount cannot exceed the remaining balance (${fmtS(remaining)})`); return; }

    if (!payFull) {
      const ok = await confirmAction(`Record a payment of ${fmtS(amt)} from "${debt.customer}"? Remaining balance will be ${fmtS(remaining - amt)}.`);
      if (!ok) return;
    } else {
      const ok = await confirmAction(`Mark the full remaining balance of ${fmtS(remaining)} from "${debt.customer}" as paid?`);
      if (!ok) return;
    }

    setSaving(true);
    try {
      const result = await recordDebtPayment(debt.id, amt);
      if (result.fullyPaid) {
        showToast(`✅ Debt fully cleared for ${debt.customer}!`);
        onClose();
      } else {
        showToast(`✅ Payment of ${fmtS(amt)} recorded. Remaining: ${fmtS(result.remaining)}`);
        setAmount('');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={`💳 Debt Details — ${debt.customer}`} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="manager-stat-card" style={{ padding: 12 }}>
          <div className="stat-label">Total Sale</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{fmtS(total)}</div>
        </div>
        <div className="manager-stat-card" style={{ padding: 12 }}>
          <div className="stat-label">Paid So Far</div>
          <div className="stat-value" style={{ fontSize: 18, color: '#16a34a' }}>{fmtS(paidSoFar)}</div>
        </div>
        <div className="manager-stat-card" style={{ padding: 12, gridColumn: '1 / -1' }}>
          <div className="stat-label">Remaining Balance</div>
          <div className="stat-value" style={{ fontSize: 22, color: '#dc2626' }}>{fmtS(remaining)}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        📅 Sale date: {debt.date} {debt.phone ? `· 📞 ${debt.phone}` : ''}
      </div>

      {err && <div className="form-error">{err}</div>}

      {isManager() ? (
        <>
          <div className="form-group">
            <label className="form-label">Record a New Payment</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Amount paid now (max ${fmtS(remaining)})`}
                style={{ flex: 1 }}
              />
              <button className="btn-primary small" disabled={saving} onClick={() => handlePay(false)}>
                💾 Record Payment
              </button>
            </div>
          </div>

          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn-ghost" style={{ color: '#16a34a' }} disabled={saving} onClick={() => handlePay(true)}>
              ✅ Mark Fully Paid
            </button>
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        </>
      ) : (
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      )}
    </Modal>
  );
}
