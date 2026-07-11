import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS, today } from '../utils/format.js';

// Inatoa mzigo mpya (bidhaa + idadi) kwa duka la jumla KWA MKOPO - stock
// inapunguzwa moja kwa moja kutoka duka/store linalohudumia. Bei ya kila
// bidhaa (unitPrice) inaanza kama bei ya kawaida ya kuuza (sell), lakini
// inaweza kubadilishwa kwa mkono - kwa sababu bei ya jumla (wholesale)
// mara nyingi ni tofauti (chini) na bei ya rejareja.
export default function WholesaleGoodsModal({ open, customer, onClose, onSubmit }) {
  const { getProducts } = useData();
  const [quantities, setQuantities] = useState({}); // productId -> qty string
  const [prices, setPrices] = useState({}); // productId -> unit price string
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [advance, setAdvance] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    setQuantities({});
    setPrices({});
    setDescription('');
    setDate(today());
    setAdvance('');
  }, [open, customer]);

  const products = useMemo(() => (customer ? getProducts(customer.locationId) : []), [customer, getProducts]);

  const rows = products.map(p => ({
    key: p.id, name: p.name, size: p.size, stock: p.stock, defaultPrice: p.sell,
  }));

  const summaryItems = rows
    .map(r => ({
      ...r,
      qty: parseInt(quantities[r.key], 10) || 0,
      unitPrice: prices[r.key] !== undefined && prices[r.key] !== '' ? (parseFloat(prices[r.key]) || 0) : r.defaultPrice,
    }))
    .filter(r => r.qty > 0);

  const totalAmount = summaryItems.reduce((sum, r) => sum + r.qty * r.unitPrice, 0);
  const advanceAmt = Math.min(parseFloat(advance) || 0, totalAmount);
  const remainingAfterAdvance = Math.max(0, totalAmount - advanceAmt);

  const handleSubmit = async () => {
    setErr('');
    if (!summaryItems.length) { setErr('Weka angalau idadi moja ya bidhaa itakayotolewa'); return; }
    for (const r of summaryItems) {
      if (r.qty > r.stock) { setErr(`Stock haitoshi kwa "${r.name}" (iliyopo: ${r.stock})`); return; }
    }

    const items = summaryItems.map(r => ({
      productId: r.key, name: r.name, size: r.size, quantity: r.qty, unitPrice: r.unitPrice,
    }));

    setSaving(true);
    try {
      await onSubmit({ items, amount: totalAmount, description: description.trim(), date, advance: advanceAmt });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <Modal open={open} title={`📦 Toa Mzigo Mpya (Mkopo) — ${customer.name}`} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
        Mzigo utatolewa kutoka <strong>{customer.locationIcon} {customer.locationName}</strong>. Unaweza kubadilisha bei ya kila bidhaa (bei ya jumla mara nyingi ni tofauti na bei ya rejareja).
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">Hakuna Bidhaa</div>
          <div>Duka hili halina bidhaa kwenye stock. Ongeza bidhaa kwanza kwenye Inventory.</div>
        </div>
      ) : (
        <div>
          <div style={{ background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700 }}>
            📋 Chagua Bidhaa, Idadi na Bei ya Jumla
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 280, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Bidhaa</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Stock</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Idadi</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Bei/kipande</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px' }}>{r.name} {r.size ? `(${r.size})` : ''}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.stock}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number" min="0" max={r.stock}
                        className="form-input" style={{ width: 70, textAlign: 'center', padding: '4px 6px' }}
                        value={quantities[r.key] || ''}
                        onChange={(e) => setQuantities({ ...quantities, [r.key]: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number" min="0"
                        className="form-input" style={{ width: 90, textAlign: 'center', padding: '4px 6px' }}
                        placeholder={String(r.defaultPrice)}
                        value={prices[r.key] || ''}
                        onChange={(e) => setPrices({ ...prices, [r.key]: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Tarehe</label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Maelezo (hiari)</label>
              <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="mfano: mzigo wa wiki hii" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">💰 Malipo ya Awali (Advance) — hiari</label>
            <input
              className="form-input" type="number" min="0" step="any"
              value={advance} onChange={(e) => setAdvance(e.target.value)}
              placeholder="mfano: mteja akilipa kiasi fulani sasa hivi"
            />
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Kama mteja analipa sehemu ya pesa mara moja anapopokea mzigo, weka kiasi hicho hapa - kitarekodiwa moja kwa moja kama malipo, na deni litakalobaki litapungua ipasavyo.
            </div>
          </div>

          {summaryItems.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13 }}>
              <strong style={{ color: '#dc2626' }}>💳 Thamani ya Mzigo: {fmtS(totalAmount)}</strong>
              <div style={{ marginTop: 4, color: '#64748b' }}>{summaryItems.map(r => `${r.name} (${r.qty})`).join(', ')}</div>
              {advanceAmt > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #fecaca' }}>
                  <div style={{ color: '#16a34a' }}>✅ Malipo ya Awali: {fmtS(advanceAmt)}</div>
                  <div style={{ fontWeight: 800, color: '#dc2626' }}>Deni Litakalobaki: {fmtS(remainingAfterAdvance)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        {summaryItems.length > 0 && (
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Inahifadhi...' : '📦 Toa Mzigo Kwa Mkopo →'}
          </button>
        )}
      </div>
    </Modal>
  );
}
