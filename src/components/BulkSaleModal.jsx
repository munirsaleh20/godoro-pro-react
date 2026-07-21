import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import SearchableSelect from './SearchableSelect.jsx';
import { PRODUCT_NAMES, PRODUCT_SIZES, OTHER_VALUE } from '../utils/productConstants.js';
import { fmtS } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const emptyHeader = (lockedLocationId) => ({
  locationId: lockedLocationId || '',
  customer: '', phone: '',
  method: 'Cash',
  paid: '',
});

const emptyLine = () => ({
  nameSel: '', nameOther: '',
  sizeSel: '', sizeOther: '',
  quantity: 1,
  manualPrice: '',
});

// KIPENGELE: "Bulk Sale" - inaruhusu kuongeza bidhaa NYINGI kwa mteja
// mmoja kwa mauzo moja (cart), badala ya kurudia "New Sale" mara kwa
// mara kwa kila bidhaa. Malipo (Amount Paid) yanagawanywa (proportional)
// kwa kila bidhaa kulingana na thamani yake, kisha kila bidhaa
// inahifadhiwa kama sale ya kawaida (addSale) ili deni/stock zisawazike
// sawa na mfumo uliopo.
export default function BulkSaleModal({ open, lockedLocationId, onClose }) {
  const { currentUser } = useAuth();
  const { locations, findMatchingProduct, addSale } = useData();
  const { showToast } = useToast();

  const [header, setHeader] = useState(emptyHeader(lockedLocationId));
  const [line, setLine] = useState(emptyLine());
  const [cart, setCart] = useState([]);
  const [err, setErr] = useState('');
  const [lineErr, setLineErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [paidTouched, setPaidTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setHeader(emptyHeader(lockedLocationId));
      setLine(emptyLine());
      setCart([]);
      setErr('');
      setLineErr('');
      setPaidTouched(false);
    }
  }, [open, lockedLocationId]);

  const lineResolvedName = line.nameSel === OTHER_VALUE ? line.nameOther.trim() : line.nameSel;
  const lineResolvedSize = line.sizeSel === OTHER_VALUE ? line.sizeOther.trim() : line.sizeSel;

  const lineMatch = useMemo(() => {
    if (!lineResolvedName || !header.locationId) return null;
    return findMatchingProduct(header.locationId, lineResolvedName, lineResolvedSize);
  }, [lineResolvedName, lineResolvedSize, header.locationId, findMatchingProduct]);

  const lineUnitPrice = lineMatch ? lineMatch.sell : (parseFloat(line.manualPrice) || 0);
  const lineQty = parseInt(line.quantity, 10) || 1;
  const lineSubtotal = lineUnitPrice * lineQty;

  const grandTotal = useMemo(() => cart.reduce((sum, it) => sum + it.subtotal, 0), [cart]);
  const paid = parseFloat(header.paid) || 0;
  const balance = Math.max(0, grandTotal - paid);

  // Amount Paid ijijaze automatic sawa na Grand Total, mradi mtumiaji
  // hajaigusa kwa mkono (sawa na tabia ya New Sale ya kawaida).
  useEffect(() => {
    if (!open || paidTouched) return;
    setHeader(h => ({ ...h, paid: grandTotal > 0 ? String(grandTotal) : '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal, open, paidTouched]);

  const addLineToCart = () => {
    setLineErr('');
    if (!header.locationId) { setLineErr('Chagua eneo/duka kwanza'); return; }
    if (!lineResolvedName) { setLineErr('Chagua au andika jina la bidhaa'); return; }
    if (!lineMatch && (!line.manualPrice || parseFloat(line.manualPrice) <= 0)) {
      setLineErr('Bidhaa haipo stock — weka bei ya kuuzia');
      return;
    }
    if (lineMatch && lineMatch.stock < lineQty) {
      setLineErr(`Stock haitoshi kwa "${lineMatch.name}" — Iliyopo: ${lineMatch.stock}`);
      return;
    }

    const displayName = lineResolvedName + (lineResolvedSize ? ` (${lineResolvedSize})` : '');
    setCart(prev => [...prev, {
      tempId: `${Date.now()}-${Math.random()}`,
      productId: lineMatch ? lineMatch.id : null,
      displayName,
      manualPrice: parseFloat(line.manualPrice) || 0,
      quantity: lineQty,
      unitPrice: lineUnitPrice,
      subtotal: lineSubtotal,
    }]);
    setLine(emptyLine());
  };

  const removeLine = (tempId) => setCart(prev => prev.filter(it => it.tempId !== tempId));

  const handleSave = async () => {
    setErr('');
    if (!header.locationId) { setErr('Chagua eneo/duka'); return; }
    if (cart.length === 0) { setErr('Ongeza angalau bidhaa moja kwenye cart'); return; }

    setSaving(true);
    try {
      // Gawanya malipo (Amount Paid) kati ya bidhaa kulingana na thamani
      // yake (proportional), ili kila mauzo (row) iwe na paid/status na
      // deni sahihi - mabaki (rounding) yanawekwa kwenye bidhaa ya mwisho.
      let allocated = 0;
      const results = [];
      for (let i = 0; i < cart.length; i++) {
        const it = cart[i];
        const isLast = i === cart.length - 1;
        const linePaid = isLast
          ? Math.max(0, paid - allocated)
          : Math.round(grandTotal > 0 ? (paid * (it.subtotal / grandTotal)) : 0);
        allocated += linePaid;

        const sale = await addSale({
          locationId: header.locationId,
          staffId: currentUser.id,
          customer: header.customer.trim() || 'Walk-in Customer',
          phone: header.phone.trim(),
          productId: it.productId,
          displayName: it.displayName,
          manualPrice: it.manualPrice,
          quantity: it.quantity,
          method: header.method,
          paid: linePaid,
        });
        results.push(sale);
      }

      showToast(`✅ Mauzo ${results.length} yamehifadhiwa! Jumla: ${fmtS(grandTotal)}`);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const lockedLocation = lockedLocationId ? locations.find(l => String(l.id) === String(lockedLocationId)) : null;

  return (
    <Modal open={open} title="🛒📦 Mauzo kwa Bulk (Bidhaa Nyingi)" onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Location <span className="required">*</span></label>
        {lockedLocation ? (
          <input className="form-input" value={`${lockedLocation.type === 'store' ? '🏪' : '🏬'} ${lockedLocation.name}`} disabled />
        ) : (
          <select className="form-select" value={header.locationId} onChange={(e) => setHeader({ ...header, locationId: e.target.value })}>
            <option value="">-- Chagua Eneo --</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.type === 'store' ? '🏪' : '🏬'} {l.name} ({l.type === 'store' ? 'Store' : 'Shop'})</option>
            ))}
          </select>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Jina la Mteja</label>
          <input className="form-input" value={header.customer} onChange={(e) => setHeader({ ...header, customer: e.target.value })} placeholder="Hiari — acha wazi kama ni Walk-in" />
        </div>
        <div className="form-group">
          <label className="form-label">Simu</label>
          <input className="form-input" value={header.phone} onChange={(e) => setHeader({ ...header, phone: e.target.value })} placeholder="07xx xxx xxx" />
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>➕ Ongeza Bidhaa kwenye Cart</div>
        {lineErr && <div className="form-error">{lineErr}</div>}

        <div className="form-group">
          <label className="form-label">Bidhaa</label>
          <SearchableSelect
            options={PRODUCT_NAMES}
            value={line.nameSel}
            onChange={(v) => setLine({ ...line, nameSel: v })}
            placeholder="-- Chagua Bidhaa --"
            otherLabel="Nyingine (Andika)"
            otherValue={OTHER_VALUE}
          />
          {line.nameSel === OTHER_VALUE && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Andika jina la bidhaa..."
              value={line.nameOther} onChange={(e) => setLine({ ...line, nameOther: e.target.value })} />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Size</label>
          <SearchableSelect
            options={PRODUCT_SIZES}
            value={line.sizeSel}
            onChange={(v) => setLine({ ...line, sizeSel: v })}
            placeholder="-- Chagua Size --"
            otherLabel="Nyingine (Andika)"
            otherValue={OTHER_VALUE}
          />
          {line.sizeSel === OTHER_VALUE && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Andika size..."
              value={line.sizeOther} onChange={(e) => setLine({ ...line, sizeOther: e.target.value })} />
          )}
        </div>

        {lineResolvedName && header.locationId && (
          lineMatch ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12 }}>
              <strong style={{ color: '#16a34a' }}>📦 Ipo Stock:</strong> {lineMatch.name} {lineMatch.size || ''} — Bei: {fmtS(lineMatch.sell)} | Stock: {lineMatch.stock}
            </div>
          ) : (
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#854d0e' }}>
              ⚠️ Haipo kwenye stock ya eneo hili — weka bei kwa mkono.
            </div>
          )
        )}

        {lineResolvedName && header.locationId && !lineMatch && (
          <div className="form-group">
            <label className="form-label">Bei ya Kuuzia (TZS) <span className="required">*</span></label>
            <input className="form-input" type="number" placeholder="Bei ya kuuzia..."
              value={line.manualPrice} onChange={(e) => setLine({ ...line, manualPrice: e.target.value })} />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Idadi (Qty)</label>
            <input className="form-input" type="number" min="1" value={line.quantity}
              onChange={(e) => setLine({ ...line, quantity: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Kiasi Kidogo</label>
            <input className="form-input" value={fmtS(lineSubtotal)} disabled />
          </div>
        </div>

        <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={addLineToCart}>
          + Ongeza kwenye Cart
        </button>
      </div>

      {cart.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🛒 Cart ({cart.length} bidhaa)</div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {cart.map(it => (
              <div key={it.tempId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{it.displayName}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{it.quantity} x {fmtS(it.unitPrice)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 700, color: '#e07b2a' }}>{fmtS(it.subtotal)}</div>
                  <button type="button" className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => removeLine(it.tempId)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Njia ya Malipo</label>
        <select className="form-select" value={header.method} onChange={(e) => setHeader({ ...header, method: e.target.value })}>
          <option value="Cash">Cash</option>
          <option value="M-Pesa">M-Pesa</option>
          <option value="Tigo Pesa">Tigo Pesa</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Idadi ya Bidhaa</div>
          <div style={{ fontWeight: 700 }}>{cart.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Jumla (Grand Total)</div>
          <div style={{ fontWeight: 700, color: '#e07b2a' }}>{fmtS(grandTotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Balance</div>
          <div style={{ fontWeight: 700, color: balance <= 0 ? '#16a34a' : '#dc2626' }}>{fmtS(balance)}</div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Kiasi Kilicholipwa (TZS)</label>
        <input className="form-input" type="number" placeholder="0" value={header.paid}
          onChange={(e) => { setPaidTouched(true); setHeader({ ...header, paid: e.target.value }); }} />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Inajaza automatic sawa na Jumla. Badilisha tu kama mteja amelipa pungufu (itakuwa deni), litagawanywa kwa kila bidhaa.
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving || cart.length === 0}>
          {saving ? 'Inahifadhi...' : `✓ Kamilisha Mauzo (${cart.length})`}
        </button>
      </div>
    </Modal>
  );
}
