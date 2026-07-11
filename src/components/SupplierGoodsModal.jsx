import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { PRODUCT_NAMES, PRODUCT_SIZES, PRODUCT_CATEGORIES, OTHER_VALUE } from '../utils/productConstants.js';
import { fmtS, today } from '../utils/format.js';

const DROPSHIP_VALUE = '__dropship__';
const NEW_CUSTOMER_VALUE = '__new_customer__';

const emptyRow = () => ({
  nameSel: '', nameOther: '', sizeSel: '', sizeOther: '', brand: '', cat: 'Spring', qty: '', buyPrice: '', sellPrice: '',
});

// Inarekodi mzigo mpya uliopokelewa kutoka kiwandani KWA MKOPO. Kuna njia
// MBILI za kupeleka mzigo huu:
//   1) Kwenye Duka/Store letu (kama kawaida) - unatakiwa kugawiwa kwenye
//      duka/store fulani. Kila bidhaa iliyoongezwa hapa itaongeza stock ya
//      duka hilo moja kwa moja - ikiwa bidhaa hiyo (jina+size) tayari ipo,
//      stock yake tu inaongezeka; kama ni mpya kabisa, itaundwa moja kwa
//      moja kwenye Inventory.
//   2) MOJA KWA MOJA kwa Mteja wa Jumla/Wholesale (Dropship) - mzigo
//      HAUINGII kwenye duka letu, unaenda moja kwa moja kwa mteja wa
//      wholesale (duka lake mwenyewe). Hii inaongeza DENI MBILI kwa wakati
//      mmoja: (a) deni tunalodaiwa na kiwanda (kwa bei ya ununuzi), na
//      (b) deni la mteja wa jumla kwetu (kwa bei ya kuuza) - linaonekana
//      moja kwa moja kwenye "sheet" ya Wholesale ya mteja huyo.
export default function SupplierGoodsModal({ open, supplier, onClose, onSubmit }) {
  const { locations, getProducts, knownBrands, wholesaleCustomersWithSummary } = useData();
  const [locationId, setLocationId] = useState('');
  const [items, setItems] = useState([]);
  const [row, setRow] = useState(emptyRow());
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // -- Sehemu za ziada kwa Dropship (mteja wa jumla) --
  const [wholesaleCustomerId, setWholesaleCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [advance, setAdvance] = useState('');

  const isDropship = locationId === DROPSHIP_VALUE;

  useEffect(() => {
    if (!open) return;
    setErr('');
    setLocationId(locations[0]?.id || '');
    setItems([]);
    setRow(emptyRow());
    setDescription('');
    setDate(today());
    setWholesaleCustomerId('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setDeliveryLocation('');
    setAdvance('');
  }, [open, locations]);

  const destProducts = useMemo(() => (locationId && !isDropship ? getProducts(locationId) : []), [locationId, isDropship, getProducts]);

  const resolvedName = row.nameSel === OTHER_VALUE ? row.nameOther.trim() : row.nameSel;
  const resolvedSize = row.sizeSel === OTHER_VALUE ? row.sizeOther.trim() : row.sizeSel;

  // Kama jina+size vinalingana na bidhaa iliyopo tayari kwenye duka hili,
  // tunaonyesha hilo - itaongeza stock badala ya kuunda bidhaa mpya.
  const matchingExisting = useMemo(() => {
    if (!resolvedName) return null;
    return destProducts.find(p => (
      p.name.trim().toLowerCase() === resolvedName.toLowerCase() &&
      (p.size || '').trim().toLowerCase() === (resolvedSize || '').trim().toLowerCase()
    )) || null;
  }, [destProducts, resolvedName, resolvedSize]);

  const addRowToItems = () => {
    setErr('');
    if (!resolvedName) { setErr('Chagua au andika jina la bidhaa'); return; }
    const qty = parseInt(row.qty, 10);
    if (!qty || qty <= 0) { setErr('Weka idadi sahihi iliyopokelewa'); return; }
    const buyPrice = parseFloat(row.buyPrice) || 0;
    if (!buyPrice || buyPrice <= 0) { setErr('Weka bei ya ununuzi (buy price) ya bidhaa hii'); return; }
    const sellPrice = parseFloat(row.sellPrice) || 0;
    if (!matchingExisting && (!sellPrice || sellPrice <= 0)) {
      setErr(`Weka bei ya kuuza kwa bidhaa mpya "${resolvedName}"`);
      return;
    }

    setItems(prev => [...prev, {
      key: `${Date.now()}-${prev.length}`,
      name: resolvedName, size: resolvedSize, brand: row.brand.trim(), cat: row.cat,
      quantity: qty, buyPrice, sellPrice: sellPrice || undefined,
      isNew: !matchingExisting,
    }]);
    setRow(emptyRow());
  };

  const removeItem = (key) => setItems(prev => prev.filter(it => it.key !== key));

  const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.buyPrice, 0);
  const wholesaleTotalAmount = items.reduce((sum, it) => sum + it.quantity * (it.sellPrice || 0), 0);
  const advanceAmt = Math.min(parseFloat(advance) || 0, wholesaleTotalAmount);

  const handleSubmit = async () => {
    setErr('');
    if (!locationId) { setErr('Chagua duka/store litakalopokea mzigo huu'); return; }
    if (!items.length) { setErr('Ongeza angalau bidhaa moja kwenye mzigo'); return; }

    if (isDropship) {
      if (wholesaleCustomerId === NEW_CUSTOMER_VALUE && !newCustomerName.trim()) {
        setErr('Andika jina la duka/mteja wa jumla anayepokea mzigo huu');
        return;
      }
      if (!wholesaleCustomerId) {
        setErr('Chagua mteja wa jumla anayepokea mzigo huu, au ongeza mteja mpya');
        return;
      }
      if (items.some(it => !it.sellPrice)) {
        setErr('Weka bei ya kuuza (sell) kwa kila bidhaa - hii ndiyo itakayotumika kuhesabu deni la mteja wa jumla');
        return;
      }
    }

    setSaving(true);
    try {
      if (isDropship) {
        await onSubmit({
          dropship: true,
          wholesaleCustomerId: wholesaleCustomerId === NEW_CUSTOMER_VALUE ? null : wholesaleCustomerId,
          newCustomer: wholesaleCustomerId === NEW_CUSTOMER_VALUE
            ? { name: newCustomerName.trim(), phone: newCustomerPhone.trim(), address: newCustomerAddress.trim() }
            : null,
          deliveryLocation: deliveryLocation.trim(),
          items: items.map(({ key, isNew, ...it }) => it),
          advance: advanceAmt,
          description: description.trim(),
          date,
        });
      } else {
        await onSubmit({
          locationId,
          items: items.map(({ key, isNew, ...it }) => it),
          description: description.trim(),
          date,
        });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!supplier) return null;

  return (
    <Modal open={open} title={`📦 Pokea Mzigo Mpya (Mkopo) — ${supplier.name}`} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">🏬 Peleka Mzigo Duka/Store Gani <span className="required">*</span></label>
        <select className="form-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">-- Chagua Duka/Store --</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.type === 'store' ? '🏪' : '🏬'} {loc.name}</option>
          ))}
          <option value={DROPSHIP_VALUE}>🚚 Nyingine — Peleka Moja kwa Moja kwa Mteja wa Jumla</option>
        </select>
      </div>

      {isDropship && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#9a3412', marginBottom: 10 }}>
            🚚 Mzigo huu unatoka kiwandani moja kwa moja kwenda kwa mteja wa jumla (hauingii kwenye stock ya duka letu). Deni litaonekana pande zote mbili: tunalodaiwa na kiwanda, na deni la mteja wa jumla kwetu.
          </div>

          <div className="form-group">
            <label className="form-label">🏪 Mteja wa Jumla Anayepokea Mzigo <span className="required">*</span></label>
            <select className="form-select" value={wholesaleCustomerId} onChange={(e) => setWholesaleCustomerId(e.target.value)}>
              <option value="">-- Chagua Mteja wa Jumla --</option>
              {wholesaleCustomersWithSummary.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.balance > 0 ? ` (Deni: ${fmtS(c.balance)})` : ''}</option>
              ))}
              <option value={NEW_CUSTOMER_VALUE}>+ Mteja Mpya wa Jumla</option>
            </select>
          </div>

          {wholesaleCustomerId === NEW_CUSTOMER_VALUE && (
            <div>
              <div className="form-group">
                <label className="form-label">Jina la Duka/Mteja Mpya <span className="required">*</span></label>
                <input className="form-input" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="mfano: Duka la Juma - Mwanza" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Simu (hiari)</label>
                  <input className="form-input" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="07XX XXX XXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Anwani (hiari)</label>
                  <input className="form-input" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} placeholder="mfano: Mwanza" />
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">📍 Eneo/Mahali Mzigo Unapelekwa (hiari)</label>
            <input className="form-input" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="mfano: Mwanza Mjini, karibu na stendi" />
          </div>
        </div>
      )}

      <div style={{ background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700, marginTop: 12 }}>
        📋 Ongeza Bidhaa kwenye Mzigo
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 12 }}>
        <div className="form-group">
          <label className="form-label">Jina la Bidhaa</label>
          <select className="form-select" value={row.nameSel} onChange={(e) => setRow({ ...row, nameSel: e.target.value })}>
            <option value="">-- Chagua Bidhaa --</option>
            {PRODUCT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            <option value={OTHER_VALUE}>Nyingine (Andika mwenyewe)</option>
          </select>
          {row.nameSel === OTHER_VALUE && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Andika jina la bidhaa..."
              value={row.nameOther} onChange={(e) => setRow({ ...row, nameOther: e.target.value })} />
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Size</label>
            <select className="form-select" value={row.sizeSel} onChange={(e) => setRow({ ...row, sizeSel: e.target.value })}>
              <option value="">-- Chagua Size --</option>
              {PRODUCT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              <option value={OTHER_VALUE}>Nyingine (Andika mwenyewe)</option>
            </select>
            {row.sizeSel === OTHER_VALUE && (
              <input className="form-input" style={{ marginTop: 8 }} placeholder="Andika size..."
                value={row.sizeOther} onChange={(e) => setRow({ ...row, sizeOther: e.target.value })} />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Brand (hiari)</label>
            <input className="form-input" list="known-brands" value={row.brand} onChange={(e) => setRow({ ...row, brand: e.target.value })} placeholder="mfano: Vitafoam" />
            <datalist id="known-brands">{knownBrands.map(b => <option key={b} value={b} />)}</datalist>
          </div>
        </div>

        {resolvedName && (
          <div style={{ fontSize: 12, marginBottom: 10, color: matchingExisting ? '#16a34a' : '#e07b2a' }}>
            {isDropship
              ? '🚚 Bidhaa hii itaenda moja kwa moja kwa mteja wa jumla - haitaingia kwenye Inventory ya duka letu.'
              : (matchingExisting
                ? `✅ Tayari ipo kwenye stock (${matchingExisting.stock}) - idadi itaongezwa hapo.`
                : '🆕 Bidhaa mpya - itaundwa kwenye Inventory ya duka hili.')}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Idadi Iliyopokelewa</label>
            <input className="form-input" type="number" min="1" value={row.qty} onChange={(e) => setRow({ ...row, qty: e.target.value })} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={row.cat} onChange={(e) => setRow({ ...row, cat: e.target.value })}>
              {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bei ya Ununuzi (Buy) <span className="required">*</span></label>
            <input className="form-input" type="number" min="0" value={row.buyPrice} onChange={(e) => setRow({ ...row, buyPrice: e.target.value })} placeholder="65000" />
          </div>
          <div className="form-group">
            <label className="form-label">Bei ya Kuuza (Sell) {(isDropship || !matchingExisting) && <span className="required">*</span>}</label>
            <input className="form-input" type="number" min="0" value={row.sellPrice} onChange={(e) => setRow({ ...row, sellPrice: e.target.value })}
              placeholder={matchingExisting ? `Iliyopo: ${matchingExisting.sell}` : '110000'} />
          </div>
        </div>

        <button className="btn-ghost small" onClick={addRowToItems} style={{ width: '100%' }}>+ Ongeza kwenye Mzigo</button>
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 6 }}>Bidhaa</th>
                <th style={{ padding: 6, textAlign: 'center' }}>Idadi</th>
                <th style={{ padding: 6, textAlign: 'right' }}>Jumla</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}>{it.name} {it.size ? `(${it.size})` : ''} {it.isNew ? '🆕' : ''}</td>
                  <td style={{ padding: 6, textAlign: 'center' }}>{it.quantity}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{fmtS(it.quantity * it.buyPrice)}</td>
                  <td style={{ padding: 6, textAlign: 'center' }}>
                    <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => removeItem(it.key)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13 }}>
            <strong style={{ color: '#dc2626' }}>💳 Deni jipya kwa "{supplier.name}": {fmtS(totalAmount)}</strong>
            {isDropship && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #fecaca' }}>
                <strong style={{ color: '#dc2626' }}>💳 Deni jipya la Mteja wa Jumla: {fmtS(wholesaleTotalAmount)}</strong>
                {advanceAmt > 0 && (
                  <>
                    <div style={{ marginTop: 4, color: '#16a34a' }}>✅ Malipo ya Awali: {fmtS(advanceAmt)}</div>
                    <div style={{ fontWeight: 800, color: '#dc2626' }}>Deni la Mteja Litakalobaki: {fmtS(Math.max(0, wholesaleTotalAmount - advanceAmt))}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isDropship && items.length > 0 && (
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">💰 Malipo ya Awali ya Mteja (Advance) — hiari</label>
          <input
            className="form-input" type="number" min="0" step="any"
            value={advance} onChange={(e) => setAdvance(e.target.value)}
            placeholder="mfano: mteja akilipa kiasi fulani sasa hivi"
          />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Kama mteja wa jumla analipa sehemu ya pesa mara moja anapopokea mzigo huu, weka kiasi hicho hapa.
          </div>
        </div>
      )}

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">Tarehe</label>
          <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Maelezo (hiari)</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="mfano: mzigo wa gari la kwanza" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Ghairi</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving || !items.length}>
          {saving ? 'Inahifadhi...' : (isDropship ? '🚚 Peleka Mzigo Moja kwa Moja →' : '📦 Pokea Mzigo Kwa Mkopo →')}
        </button>
      </div>
    </Modal>
  );
}
