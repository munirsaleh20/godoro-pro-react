import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmtS, today } from '../utils/format.js';

// Inaruhusu kuhariri mzigo (stock_in) uliokwisha rekodiwa - mfano kama
// idadi au bei iliandikwa vibaya wakati wa kuongeza. Duka/Store (au
// "dropship" kwa mteja wa jumla) HAIBADILIKI hapa - hiyo imefungwa kwenye
// mstari huo tangu ulipoongezwa. Unachoweza kuhariri: idadi, bei ya
// ununuzi, jina/size/brand/category ya kila bidhaa, pamoja na tarehe na
// maelezo.
export default function EditSupplierGoodsModal({ open, txn, supplier, getLocation, onClose, onSubmit }) {
  const { updateSupplierGoods } = useData();
  const [items, setItems] = useState([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !txn) return;
    setErr('');
    setItems((txn.items || []).map((it, idx) => ({
      key: `${idx}-${it.productId || it.name}`,
      name: it.name || '', size: it.size || '', brand: it.brand || '', cat: it.cat || 'Spring',
      quantity: String(it.quantity ?? ''), buyPrice: String(it.buyPrice ?? ''),
    })));
    setDescription(txn.description || '');
    setDate(txn.date || today());
  }, [open, txn]);

  const updateItem = (key, patch) => setItems(prev => prev.map(it => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key) => setItems(prev => prev.filter(it => it.key !== key));

  const parsedItems = items.map(it => ({
    ...it,
    qtyNum: parseInt(it.quantity, 10) || 0,
    buyNum: parseFloat(it.buyPrice) || 0,
  }));
  const totalAmount = parsedItems.reduce((sum, it) => sum + it.qtyNum * it.buyNum, 0);

  const handleSubmit = async () => {
    setErr('');
    if (!parsedItems.length) { setErr('Mzigo lazima uwe na angalau bidhaa moja'); return; }
    for (const it of parsedItems) {
      if (!it.name.trim()) { setErr('Jina la bidhaa haliwezi kuwa tupu'); return; }
      if (!it.qtyNum || it.qtyNum <= 0) { setErr(`Weka idadi sahihi kwa "${it.name}"`); return; }
      if (!it.buyNum || it.buyNum <= 0) { setErr(`Weka bei ya ununuzi sahihi kwa "${it.name}"`); return; }
    }

    setSaving(true);
    try {
      await updateSupplierGoods({
        id: txn.id,
        items: parsedItems.map(({ name, size, brand, cat, qtyNum, buyNum }) => ({
          name: name.trim(), size: size.trim(), brand: brand.trim(), cat, quantity: qtyNum, buyPrice: buyNum,
        })),
        description, date,
      });
      onSubmit?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!txn || !supplier) return null;
  const loc = txn.locationId ? getLocation?.(txn.locationId) : null;

  return (
    <Modal open={open} title={`✏️ Hariri Mzigo — ${supplier.name}`} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#64748b' }}>
        {loc ? `🏬 Mzigo huu uliwekwa duka la ${loc.name} (haiwezi kubadilishwa hapa)` : '🚚 Mzigo huu ni wa Dropship (moja kwa moja kwa mteja wa jumla) — hii inaonyesha upande wa deni la kiwanda pekee. Ukibadilisha idadi/bei hapa, nenda pia kwenye Wholesale kurekebisha deni la mteja husika kama inahitajika.'}
      </div>

      <div style={{ background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700 }}>
        📋 Bidhaa kwenye Mzigo Huu
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 12 }}>
        {items.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>Hakuna bidhaa - futa mzigo huu badala yake.</div>}
        {items.map(it => (
          <div key={it.key} style={{ border: '1px solid #f1f5f9', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Jina la Bidhaa</label>
                <input className="form-input" value={it.name} onChange={(e) => updateItem(it.key, { name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Size</label>
                <input className="form-input" value={it.size} onChange={(e) => updateItem(it.key, { size: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Idadi</label>
                <input className="form-input" type="number" min="1" value={it.quantity} onChange={(e) => updateItem(it.key, { quantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Bei ya Ununuzi (Buy)</label>
                <input className="form-input" type="number" min="0" value={it.buyPrice} onChange={(e) => updateItem(it.key, { buyPrice: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand (hiari)</label>
                <input className="form-input" value={it.brand} onChange={(e) => updateItem(it.key, { brand: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => removeItem(it.key)}>✕ Ondoa Bidhaa Hii</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {parsedItems.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13 }}>
          <strong style={{ color: '#dc2626' }}>💳 Jumla Mpya ya Deni kwa "{supplier.name}": {fmtS(totalAmount)}</strong>
        </div>
      )}

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">Tarehe</label>
          <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Maelezo (hiari)</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving || !parsedItems.length}>
          {saving ? 'Inahifadhi...' : '💾 Hifadhi Marekebisho'}
        </button>
      </div>
    </Modal>
  );
}
