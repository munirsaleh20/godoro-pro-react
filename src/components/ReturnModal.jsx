import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS } from '../utils/format.js';

// sale: rekodi ya mauzo (kutoka Sales page) ambayo mteja anataka kurudisha
// au kubadilisha bidhaa yake.
export default function ReturnModal({ open, sale, onClose, onDone }) {
  const { currentUser } = useAuth();
  const { getProducts, recordReturn } = useData();

  const [action, setAction] = useState('return'); // 'return' | 'exchange'
  const [returnQty, setReturnQty] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [exchangeQty, setExchangeQty] = useState(1);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAction('return');
    setReturnQty(sale ? Math.min(1, sale.quantity) : 1);
    setSearch('');
    setSelectedProductId('');
    setExchangeQty(1);
    setNote('');
    setErr('');
  }, [open, sale]);

  const storeProducts = useMemo(() => (sale ? getProducts(sale.locationId) : []), [sale, getProducts]);

  // KIPENGELE: "Search products" - tafuta bidhaa ya kubadilishana kwa jina,
  // ukubwa, au brand, badala ya kuvinjari orodha ndefu ya bidhaa zote.
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return storeProducts;
    return storeProducts.filter(p => (
      p.name.toLowerCase().includes(q) ||
      (p.size || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q)
    ));
  }, [storeProducts, search]);

  const selectedProduct = storeProducts.find(p => String(p.id) === String(selectedProductId));

  if (!sale) return null;

  const refundAmount = Math.round((sale.unitPrice || 0) * (parseInt(returnQty, 10) || 0));
  const exchangeTotal = selectedProduct ? selectedProduct.sell * (parseInt(exchangeQty, 10) || 0) : 0;
  const differenceAmount = exchangeTotal - refundAmount;

  const handleSubmit = async () => {
    setErr('');
    const qty = parseInt(returnQty, 10) || 0;
    if (qty <= 0) { setErr('Weka idadi sahihi ya kurudisha.'); return; }
    if (qty > sale.quantity) { setErr(`Idadi haiwezi kuzidi ${sale.quantity} (idadi iliyouzwa).`); return; }

    let exchange = null;
    if (action === 'exchange') {
      if (!selectedProduct) { setErr('Chagua bidhaa mpya atakayochukua mteja.'); return; }
      const eQty = parseInt(exchangeQty, 10) || 0;
      if (eQty <= 0) { setErr('Weka idadi sahihi ya bidhaa mpya.'); return; }
      if (eQty > selectedProduct.stock) { setErr(`Stock haitoshi kwa "${selectedProduct.name}" (ipo: ${selectedProduct.stock}).`); return; }
      exchange = {
        productId: selectedProduct.id,
        quantity: eQty,
        unitPrice: selectedProduct.sell,
        displayName: selectedProduct.name + (selectedProduct.size ? ` (${selectedProduct.size})` : ''),
      };
    }

    setSaving(true);
    try {
      const result = await recordReturn({
        saleId: sale.id, returnQuantity: qty, exchange, note: note.trim(),
        currentUserId: currentUser.id, method: sale.method,
      });
      onDone(result, action);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="↩️ Return / Exchange" onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
        <strong>{sale.customer}</strong> — {sale.items}<br />
        Sold {sale.quantity} × {fmtS(sale.unitPrice)} = {fmtS(sale.total)} ({sale.date})
      </div>

      <div className="form-group">
        <label className="form-label">What happened? <span className="required">*</span></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={action === 'return' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1 }}
            onClick={() => setAction('return')}
          >
            ↩️ Return only (Rudisha)
          </button>
          <button
            type="button"
            className={action === 'exchange' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1 }}
            onClick={() => setAction('exchange')}
          >
            🔁 Exchange (Badilisha)
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Quantity being returned <span className="required">*</span></label>
        <input
          type="number" min="1" max={sale.quantity} className="form-input" style={{ maxWidth: 140 }}
          value={returnQty} onChange={(e) => setReturnQty(e.target.value)}
        />
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Refund value: <strong>{fmtS(refundAmount)}</strong>
        </div>
      </div>

      {action === 'exchange' && (
        <div>
          <div className="form-group">
            <label className="form-label">Search product to give instead <span className="required">*</span></label>
            <input
              className="form-input" placeholder="Search by name, size, or brand..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No Products Found</div>
              <div>Try a different search term.</div>
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Product</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Price</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>Stock</th>
                    <th style={{ padding: '8px 12px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr
                      key={p.id}
                      style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer', background: String(selectedProductId) === String(p.id) ? '#f0fdf4' : undefined }}
                      onClick={() => setSelectedProductId(p.id)}
                    >
                      <td style={{ padding: '8px 12px' }}>{p.name} {p.size ? `(${p.size})` : ''}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{fmtS(p.sell)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{p.stock}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input type="radio" checked={String(selectedProductId) === String(p.id)} onChange={() => setSelectedProductId(p.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedProduct && (
            <div className="form-group">
              <label className="form-label">Quantity to give <span className="required">*</span></label>
              <input
                type="number" min="1" max={selectedProduct.stock} className="form-input" style={{ maxWidth: 140 }}
                value={exchangeQty} onChange={(e) => setExchangeQty(e.target.value)}
              />
            </div>
          )}

          {selectedProduct && (
            <div style={{
              background: differenceAmount > 0 ? '#fefce8' : differenceAmount < 0 ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${differenceAmount > 0 ? '#fde047' : differenceAmount < 0 ? '#fca5a5' : '#86efac'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13,
            }}>
              New item value: <strong>{fmtS(exchangeTotal)}</strong><br />
              {differenceAmount > 0 && <>⚠️ Customer must pay <strong>{fmtS(differenceAmount)}</strong> more.</>}
              {differenceAmount < 0 && <>💵 Refund <strong>{fmtS(Math.abs(differenceAmount))}</strong> to customer.</>}
              {differenceAmount === 0 && <>✅ Even exchange — no extra payment.</>}
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Note (optional)</label>
        <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Reason for return" />
      </div>

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : action === 'exchange' ? '🔁 Confirm Exchange' : '↩️ Confirm Return'}
        </button>
      </div>
    </Modal>
  );
}
