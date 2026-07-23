import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import SearchableSelect from './SearchableSelect.jsx';
import { PRODUCT_NAMES, PRODUCT_SIZES, PRODUCT_CATEGORIES, OTHER_VALUE } from '../utils/productConstants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';

const emptyForm = () => ({
  nameSel: '', nameOther: '',
  sizeSel: '', sizeOther: '',
  brandSel: '', brandOther: '',
  buy: '', sell: '', stock: '', cat: 'Spring', locationId: '',
  applyPriceToAll: true,
});

// mode: 'add' | 'edit'
export default function ProductFormModal({ open, mode, initial, locationOptions, onClose, onSubmit }) {
  const { isManager } = useAuth();
  const { knownBrands, getProducts, products } = useData();
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  // Kama mtumiaji AMEBADILI Buy/Sell kwa mkono, hatutaigusa tena kwa auto-fill.
  const [priceTouched, setPriceTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr('');
    setPriceTouched(mode === 'edit');
    if (mode === 'edit' && initial) {
      const nameIsKnown = PRODUCT_NAMES.includes(initial.name);
      const sizeIsKnown = PRODUCT_SIZES.includes(initial.size);
      const brandIsKnown = knownBrands.includes(initial.brand);
      setForm({
        nameSel: nameIsKnown ? initial.name : OTHER_VALUE,
        nameOther: nameIsKnown ? '' : (initial.name || ''),
        sizeSel: sizeIsKnown ? initial.size : (initial.size ? OTHER_VALUE : ''),
        sizeOther: sizeIsKnown ? '' : (initial.size || ''),
        brandSel: brandIsKnown ? initial.brand : (initial.brand ? OTHER_VALUE : ''),
        brandOther: brandIsKnown ? '' : (initial.brand || ''),
        buy: initial.buy || '',
        sell: initial.sell || '',
        stock: initial.stock ?? '',
        cat: initial.cat || 'Spring',
        locationId: initial.locationId || '',
        applyPriceToAll: true,
      });
    } else {
      setForm({ ...emptyForm(), locationId: locationOptions?.[0]?.id || '' });
    }
  }, [open, mode, initial, knownBrands, locationOptions]);

  const resolvedName = form.nameSel === OTHER_VALUE ? form.nameOther.trim() : form.nameSel;
  const resolvedSize = form.sizeSel === OTHER_VALUE ? form.sizeOther.trim() : form.sizeSel;
  const resolvedBrand = form.brandSel === OTHER_VALUE ? form.brandOther.trim() : form.brandSel;

  // KIPENGELE: "Auto-fill Price" - sawa na Bulk Add: kama bidhaa hii
  // (jina+size+brand) tayari ipo DUKA LOLOTE (kwanza duka lililochaguliwa
  // hapa, kisha duka lingine lolote kama haipo hapa), Buy/Sell Price
  // zake za sasa zinajazwa moja kwa moja - bado zinabaki EDITABLE.
  const norm = (s) => (s || '').toString().trim().toLowerCase();
  useEffect(() => {
    if (!open || mode !== 'add' || priceTouched || !resolvedName) return;
    const isMatch = (p) => norm(p.name) === norm(resolvedName) && norm(p.size) === norm(resolvedSize) && norm(p.brand) === norm(resolvedBrand);
    const match = (form.locationId ? getProducts(form.locationId).find(isMatch) : null) || products.find(isMatch);
    if (match) {
      setForm(f => ({
        ...f,
        buy: match.buy ? String(match.buy) : f.buy,
        sell: match.sell ? String(match.sell) : f.sell,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, resolvedName, resolvedSize, resolvedBrand, form.locationId, priceTouched]);

  const handleSave = async () => {
    setErr('');
    if (!resolvedName) { setErr('Please select or type a product name'); return; }
    const sellNum = parseFloat(form.sell) || 0;
    if (!sellNum || sellNum <= 0) { setErr('Please enter a valid sell price'); return; }
    const stockNum = parseInt(form.stock, 10);
    if (Number.isNaN(stockNum) || stockNum < 0) { setErr('Please enter stock quantity'); return; }
    if (mode === 'add' && !form.locationId) { setErr('Please select a location'); return; }

    setSaving(true);
    try {
      await onSubmit({
        name: resolvedName,
        size: resolvedSize,
        brand: resolvedBrand,
        buy: parseFloat(form.buy) || 0,
        sell: sellNum,
        stock: stockNum,
        cat: form.cat,
        locationId: form.locationId,
        applyPriceToAll: mode === 'edit' ? form.applyPriceToAll : false,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={mode === 'add' ? '📦 Add New Product' : '✏️ Edit Product'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Product Name <span className="required">*</span></label>
        <SearchableSelect
          options={PRODUCT_NAMES}
          value={form.nameSel}
          onChange={(v) => setForm({ ...form, nameSel: v })}
          placeholder="-- Select Product --"
          otherLabel="Other (Type manually)"
          otherValue={OTHER_VALUE}
        />
        {form.nameSel === OTHER_VALUE && (
          <input className="form-input" style={{ marginTop: 8 }} placeholder="Type product name..."
            value={form.nameOther} onChange={(e) => setForm({ ...form, nameOther: e.target.value })} />
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Size</label>
          <SearchableSelect
            options={PRODUCT_SIZES}
            value={form.sizeSel}
            onChange={(v) => setForm({ ...form, sizeSel: v })}
            placeholder="-- Select Size --"
            otherLabel="Other (Type manually)"
            otherValue={OTHER_VALUE}
          />
          {form.sizeSel === OTHER_VALUE && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Type size..."
              value={form.sizeOther} onChange={(e) => setForm({ ...form, sizeOther: e.target.value })} />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Brand</label>
          <SearchableSelect
            options={knownBrands}
            value={form.brandSel}
            onChange={(v) => setForm({ ...form, brandSel: v })}
            placeholder="-- Select Brand --"
            otherLabel="Other (Type manually)"
            otherValue={OTHER_VALUE}
          />
          {form.brandSel === OTHER_VALUE && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Type brand..."
              value={form.brandOther} onChange={(e) => setForm({ ...form, brandOther: e.target.value })} />
          )}
        </div>
      </div>

      <div className="form-row">
        {isManager() && (
          <div className="form-group">
            <label className="form-label">Buy Price (TZS)</label>
            <input className="form-input" type="number" placeholder="65000"
              value={form.buy} onChange={(e) => { setPriceTouched(true); setForm({ ...form, buy: e.target.value }); }} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Sell Price (TZS) <span className="required">*</span></label>
          <input className="form-input" type="number" placeholder="110000"
            value={form.sell} onChange={(e) => { setPriceTouched(true); setForm({ ...form, sell: e.target.value }); }} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Stock <span className="required">*</span></label>
          <input className="form-input" type="number" placeholder="10"
            value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {mode === 'add' && (
        <div className="form-group">
          <label className="form-label">Location <span className="required">*</span></label>
          <select className="form-select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locationOptions.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.type === 'store' ? '🏪' : '🏬'} {loc.name} ({loc.location})
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'edit' && (
        <div className="form-group" style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: 10 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ marginTop: 2 }}
              checked={form.applyPriceToAll}
              onChange={(e) => setForm({ ...form, applyPriceToAll: e.target.checked })}
            />
            <span>
              🔁 Sasisha Buy/Sell Price hii kwenye <strong>maduka/store MENGINE yote</strong> yenye bidhaa hii hii (jina + size + brand sawa). Stock haitaguswa kule.
            </span>
          </label>
        </div>
      )}

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : mode === 'add' ? '+ Add Product' : '💾 Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
