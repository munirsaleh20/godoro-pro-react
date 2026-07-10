import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { sb } from '../supabaseClient';
import { today } from '../utils/format.js';

const DataContext = createContext(null);

// TATIZO LILILOKUWEPO: kila operesheni ya kuongeza (mauzo, deni, matumizi,
// bidhaa, n.k.) ilikuwa ikifanya vitu VIWILI kwa wakati mmoja: (1) inaongeza
// kumbukumbu mpya moja kwa moja kwenye 'state' ya screen (optimistic update),
// NA (2) mfumo wa "Live Sync" (realtime) ulikuwa ukisikia mabadiliko yale
// yale kwenye database na kupakua upya orodha NZIMA (loadXxx()). Ikiwa hizo
// mbili zilifika kwa mpangilio fulani (mfano reload ikimaliza BAADA ya
// optimistic update), kumbukumbu ileile ya mauzo/deni iliishia kuongezwa
// MARA MBILI kwenye screen - ndiyo maana "debts 2 zilionekana kama 4".
// Fix: kabla ya kuongeza kwenye 'state', tunahakiki kwanza kama ID hiyo
// tayari ipo - kama ipo, hatuiongezi tena.
function addUnique(prev, item, prepend = true) {
  if (prev.some(x => String(x.id) === String(item.id))) return prev;
  return prepend ? [item, ...prev] : [...prev, item];
}

// Hatua hii: locations + products (inventory) + sales + debts.
// Staff, expenses zitaongezwa hatua zijazo.
export function DataProvider({ children }) {
  const [locations, setLocations] = useState([]); // { id, name, location, type, phone, email }
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [products, setProducts] = useState([]); // { id, locationId, name, size, brand, buy, sell, stock, cat }
  const [productsLoading, setProductsLoading] = useState(false);
  const [sales, setSales] = useState([]); // { id, locationId, staffId, customer, phone, date, items, unitPrice, quantity, total, paid, status, method }
  const [salesLoading, setSalesLoading] = useState(false);
  const [debts, setDebts] = useState([]); // { id, saleId, locationId, customer, phone, amount, date, due }
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [staff, setStaff] = useState([]); // { id, name, email, avatar, role, locationId }
  const [staffLoading, setStaffLoading] = useState(false);
  const [expenses, setExpenses] = useState([]); // { id, locationId, date, cat, desc, amount, to }
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [transfers, setTransfers] = useState([]); // { id, fromLocationId, toLocationId, note, items, date }
  const [transfersLoading, setTransfersLoading] = useState(false);

  // ---------------- Locations ----------------
  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const { data, error } = await sb.from('locations').select('*').order('created_at');
      if (error) throw error;
      setLocations((data || []).map(l => ({
        id: l.id,
        name: l.name,
        location: l.location,
        type: l.type,
        phone: l.phone,
        email: l.email,
      })));
    } catch (err) {
      console.error('loadLocations error:', err);
      throw err;
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const addLocation = useCallback(async ({ name, location, type, phone, email }) => {
    const { data, error } = await sb.from('locations')
      .insert({ name, location, type, phone, email })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setLocations(prev => addUnique(prev, {
      id: data.id, name: data.name, location: data.location,
      type: data.type, phone: data.phone, email: data.email,
    }, false));
    return data;
  }, []);

  const updateLocation = useCallback(async (id, updates) => {
    const { error } = await sb.from('locations').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    setLocations(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const deleteLocation = useCallback(async (id) => {
    const { error } = await sb.from('locations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setLocations(prev => prev.filter(l => l.id !== id));
  }, []);

  const getLocation = useCallback((id) => locations.find(l => String(l.id) === String(id)), [locations]);
  const stores = locations.filter(l => l.type === 'store');
  const shops = locations.filter(l => l.type === 'shop');

  // ---------------- Products ----------------
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await sb.from('products').select('*').order('created_at');
      if (error) throw error;
      setProducts((data || []).map(p => ({
        id: p.id,
        locationId: p.location_id,
        name: p.name,
        size: p.size || '',
        brand: p.brand || '',
        buy: p.buy_price || 0,
        sell: p.sell_price || 0,
        stock: p.stock || 0,
        cat: p.category || 'Spring',
      })));
    } catch (err) {
      console.error('loadProducts error:', err);
      throw err;
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const addProduct = useCallback(async ({ locationId, name, size, brand, buy, sell, stock, cat }) => {
    const { data, error } = await sb.from('products').insert({
      location_id: locationId, name, size, brand,
      buy_price: buy, sell_price: sell, stock, category: cat,
    }).select().single();
    if (error) throw new Error(error.message);
    const product = {
      id: data.id, locationId: data.location_id, name: data.name,
      size: data.size || '', brand: data.brand || '', buy: data.buy_price || 0,
      sell: data.sell_price || 0, stock: data.stock || 0, cat: data.category || 'Spring',
    };
    setProducts(prev => addUnique(prev, product, false));
    return product;
  }, []);

  const updateProduct = useCallback(async (id, { name, size, brand, buy, sell, stock, cat }) => {
    const { error } = await sb.from('products').update({
      name, size, brand, buy_price: buy, sell_price: sell, stock, category: cat,
    }).eq('id', id);
    if (error) throw new Error(error.message);
    setProducts(prev => prev.map(p => (String(p.id) === String(id)
      ? { ...p, name, size, brand, buy, sell, stock, cat } : p)));
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setProducts(prev => prev.filter(p => String(p.id) !== String(id)));
  }, []);

  const getProducts = useCallback((locationId) => (
    products.filter(p => String(p.locationId) === String(locationId))
  ), [products]);

  // Bidhaa zote zikiwa na taarifa za location (jina, aina, icon) - kama
  // getAllProductsWithLocations() kwenye HTML ya awali.
  const allProductsWithLocations = useMemo(() => {
    return products.map(p => {
      const loc = getLocation(p.locationId);
      return {
        ...p,
        locationName: loc ? loc.name : 'Unknown',
        locationType: loc ? loc.type : 'unknown',
        locationIcon: loc?.type === 'store' ? '🏪' : '🏬',
        locationLabel: loc?.type === 'store' ? 'Store' : 'Shop',
      };
    });
  }, [products, getLocation]);

  const knownBrands = useMemo(() => (
    Array.from(new Set(products.map(p => (p.brand || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [products]);

  // Inatafuta bidhaa kwenye stock ya location fulani inayolingana na jina+size.
  // Normalisation hii inaondoa nafasi (space), mistari (-), na dot ili
  // "Vita Raha", "Vita  Raha", na "vitaraha" zote zilingane bidhaa moja -
  // muhimu kwa wauzaji wasio wazoefu wanaoandika jina kwa mkono (chaguo "Other").
  const norm = (s) => (s || '').toString().toLowerCase().replace(/[\s\-_.]+/g, '');

  const findMatchingProduct = useCallback((locationId, name, size) => {
    const list = getProducts(locationId);
    const nName = norm(name);
    const nSize = norm(size);
    if (!nName) return null;

    // 1) Jina na size zinalingana kikamilifu (baada ya normalisation)
    let found = list.find(p => norm(p.name) === nName && (!nSize || !p.size || norm(p.size) === nSize));
    if (found) return found;

    // 2) Jina pekee linalingana kikamilifu
    found = list.find(p => norm(p.name) === nName);
    if (found) return found;

    // 3) Jina linakaribiana (mfano typo ndogo au sehemu ya jina) + size sahihi
    found = list.find(p => {
      const pn = norm(p.name);
      return pn && (pn.includes(nName) || nName.includes(pn)) && (!nSize || !p.size || norm(p.size) === nSize);
    });
    if (found) return found;

    // 4) Jina linakaribiana tu, bila kujali size
    return list.find(p => {
      const pn = norm(p.name);
      return pn && (pn.includes(nName) || nName.includes(pn));
    }) || null;
  }, [getProducts]);

  // ---------------- Debts ----------------
  // NOTE: Kwenye HTML ya awali, jedwali la 'debts' lilikuwa linasomwa tu
  // (loadDebts) lakini hakuna insert popote - kwa hiyo ukurasa wa Debts
  // haukuwa na taarifa yoyote kamwe. Hapa tunatengeneza debt automatically
  // kila mauzo ya deni (status='Debt') yanapotokea, na kuisawazisha
  // (sync) mauzo yanapohaririwa.
  const loadDebts = useCallback(async () => {
    setDebtsLoading(true);
    try {
      const { data, error } = await sb.from('debts')
        .select('*')
        .eq('is_paid', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDebts((data || []).map(d => ({
        id: d.id,
        saleId: d.sale_id,
        locationId: d.location_id,
        customer: d.customer_name,
        phone: d.customer_phone || '',
        amount: d.amount || 0,
        date: d.date,
        due: d.due_date,
      })));
    } catch (err) {
      console.error('loadDebts error:', err);
      throw err;
    } finally {
      setDebtsLoading(false);
    }
  }, []);

  const createDebtForSale = useCallback(async ({ saleId, locationId, customer, phone, amount, date }) => {
    const { data, error } = await sb.from('debts').insert({
      sale_id: saleId,
      location_id: locationId,
      customer_name: customer,
      customer_phone: phone || null,
      amount,
      date,
      is_paid: false,
    }).select().single();
    if (error) { console.error('createDebtForSale error:', error); return; }
    setDebts(prev => addUnique(prev, {
      id: data.id, saleId: data.sale_id, locationId: data.location_id,
      customer: data.customer_name, phone: data.customer_phone || '',
      amount: data.amount || 0, date: data.date, due: data.due_date,
    }));
  }, []);

  const markDebtPaid = useCallback(async (debtId) => {
    const debt = debts.find(d => String(d.id) === String(debtId));
    if (!debt) throw new Error('Debt not found');

    const { error } = await sb.from('debts').update({ is_paid: true }).eq('id', debtId);
    if (error) throw new Error(error.message);

    // Sasisha sale husika kuwa Paid kikamilifu
    if (debt.saleId) {
      const sale = sales.find(s => String(s.id) === String(debt.saleId));
      if (sale) {
        await sb.from('sales').update({ paid: sale.total, status: 'Paid' }).eq('id', sale.id);
        setSales(prev => prev.map(s => (String(s.id) === String(sale.id) ? { ...s, paid: s.total, status: 'Paid' } : s)));
      }
    }

    setDebts(prev => prev.filter(d => String(d.id) !== String(debtId)));
  }, [debts, sales]);

  // Inarekodi malipo ya SEHEMU (partial payment) kwa deni fulani - mfano
  // mteja mwenye deni la TZS 100,000 analipa TZS 40,000 leo, inabaki
  // TZS 60,000. Ikiwa malipo yanafunika deni lote (au zaidi kidogo kwa
  // makosa ya kuzungusha nambari), deni linafungwa kiotomatiki kama
  // markDebtPaid.
  const recordDebtPayment = useCallback(async (debtId, paymentAmount) => {
    const debt = debts.find(d => String(d.id) === String(debtId));
    if (!debt) throw new Error('Debt not found');
    const amount = Number(paymentAmount) || 0;
    if (amount <= 0) throw new Error('Enter an amount greater than zero');
    if (amount > debt.amount + 0.01) throw new Error(`Payment cannot exceed the remaining balance (${debt.amount})`);

    const sale = sales.find(s => String(s.id) === String(debt.saleId));
    const newBalance = Math.max(0, debt.amount - amount);
    const newPaid = (sale?.paid || 0) + amount;

    if (newBalance <= 0.01) {
      // Deni limefungwa kikamilifu
      const { error } = await sb.from('debts').update({ is_paid: true }).eq('id', debtId);
      if (error) throw new Error(error.message);
      if (sale) {
        await sb.from('sales').update({ paid: sale.total, status: 'Paid' }).eq('id', sale.id);
        setSales(prev => prev.map(s => (String(s.id) === String(sale.id) ? { ...s, paid: s.total, status: 'Paid' } : s)));
      }
      setDebts(prev => prev.filter(d => String(d.id) !== String(debtId)));
      return { fullyPaid: true, remaining: 0 };
    }

    const { error } = await sb.from('debts').update({ amount: newBalance }).eq('id', debtId);
    if (error) throw new Error(error.message);
    if (sale) {
      await sb.from('sales').update({ paid: newPaid }).eq('id', sale.id);
      setSales(prev => prev.map(s => (String(s.id) === String(sale.id) ? { ...s, paid: newPaid } : s)));
    }
    setDebts(prev => prev.map(d => (String(d.id) === String(debtId) ? { ...d, amount: newBalance } : d)));
    return { fullyPaid: false, remaining: newBalance };
  }, [debts, sales]);

  const deleteDebt = useCallback(async (id) => {
    const { error } = await sb.from('debts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setDebts(prev => prev.filter(d => String(d.id) !== String(id)));
  }, []);

  const getDebts = useCallback((locationId) => (
    debts.filter(d => String(d.locationId) === String(locationId))
  ), [debts]);

  const allDebtsWithLocations = useMemo(() => {
    const nameForStaffId = (id) => {
      const s = staff.find(x => String(x.id) === String(id));
      return s ? s.name : 'Unknown';
    };
    return debts.map(d => {
      const loc = getLocation(d.locationId);
      const relatedSale = d.saleId ? sales.find(s => String(s.id) === String(d.saleId)) : null;
      return {
        ...d,
        locationName: loc ? loc.name : 'Unknown',
        locationIcon: loc?.type === 'store' ? '🏪' : '🏬',
        recordedBy: relatedSale ? nameForStaffId(relatedSale.staffId) : '—',
      };
    });
  }, [debts, getLocation, sales, staff]);

  const totalAllDebts = useMemo(() => debts.reduce((sum, d) => sum + (d.amount || 0), 0), [debts]);

  // ---------------- Sales ----------------
  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const { data, error } = await sb.from('sales').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSales((data || []).map(s => ({
        id: s.id,
        locationId: s.location_id,
        staffId: s.staff_id,
        customer: s.customer_name,
        phone: s.customer_phone || '',
        date: s.sale_date,
        items: s.items,
        productId: s.product_id || null,
        unitPrice: s.unit_price || 0,
        unitCost: s.unit_cost || 0,
        quantity: s.quantity || 1,
        total: s.total || 0,
        paid: s.paid || 0,
        status: s.status,
        method: s.method || 'Cash',
      })));
    } catch (err) {
      console.error('loadSales error:', err);
      throw err;
    } finally {
      setSalesLoading(false);
    }
  }, []);

  // payload: { locationId, staffId, customer, phone, productId (nullable),
  //            displayName, manualPrice (nullable), quantity, method, paid }
  const addSale = useCallback(async (payload) => {
    const { locationId, staffId, customer, phone, productId, displayName, manualPrice, quantity, method, paid } = payload;

    let unitPrice, total, unitCost = 0, matchedProduct = null;

    if (productId) {
      matchedProduct = products.find(p => String(p.id) === String(productId));
      if (!matchedProduct) throw new Error('Product not found in stock.');
      if (matchedProduct.stock < quantity) {
        throw new Error(`Insufficient stock! Available: ${matchedProduct.stock}`);
      }
      unitPrice = matchedProduct.sell;
      unitCost = matchedProduct.buy || 0;
      total = unitPrice * quantity;
    } else {
      if (!manualPrice || manualPrice <= 0) throw new Error('Please enter the selling price.');
      unitPrice = manualPrice;
      total = unitPrice * quantity;
    }

    const status = paid >= total ? 'Paid' : 'Debt';
    const items = `${displayName} x${quantity}`;
    const saleDate = today();

    const { data: newSale, error: saleError } = await sb.from('sales').insert({
      location_id: locationId,
      staff_id: staffId,
      customer_name: customer,
      customer_phone: phone || null,
      items,
      product_id: matchedProduct ? matchedProduct.id : null,
      unit_price: unitPrice,
      unit_cost: unitCost,
      quantity,
      total,
      paid,
      status,
      method,
      sale_date: saleDate,
    }).select().single();

    if (saleError) throw new Error(saleError.message);

    if (matchedProduct) {
      const newStock = matchedProduct.stock - quantity;
      const { error: stockError } = await sb.from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', matchedProduct.id);
      if (stockError) console.error('Failed to update stock:', stockError);
      setProducts(prev => prev.map(p => (String(p.id) === String(matchedProduct.id) ? { ...p, stock: newStock } : p)));
    }

    const saleRecord = {
      id: newSale.id, locationId, staffId, customer, phone: phone || '',
      date: saleDate, items, productId: matchedProduct ? matchedProduct.id : null,
      unitPrice, unitCost, quantity, total, paid, status, method,
    };
    setSales(prev => addUnique(prev, saleRecord));

    // Kama kuna deni, tengeneza rekodi kwenye debts kiotomatiki
    if (status === 'Debt') {
      await createDebtForSale({
        saleId: newSale.id, locationId, customer, phone,
        amount: total - paid, date: saleDate,
      });
    }

    return saleRecord;
  }, [products, createDebtForSale]);

  // Edit ya haraka - inabadilisha taarifa za muhtasari (customer, items, total,
  // paid, status, method, date) - sawa na openEditSale/saveEditSale kwenye HTML,
  // na kusawazisha (sync) debts inayohusiana.
  const updateSale = useCallback(async (id, { customer, items, total, paid, status, method, date }) => {
    const { error } = await sb.from('sales').update({
      customer_name: customer, items, total, paid, status, method, sale_date: date,
    }).eq('id', id);
    if (error) throw new Error(error.message);
    setSales(prev => prev.map(s => (String(s.id) === String(id)
      ? { ...s, customer, items, total, paid, status, method, date } : s)));

    const existingDebt = debts.find(d => String(d.saleId) === String(id));
    if (status === 'Paid') {
      if (existingDebt) {
        await sb.from('debts').update({ is_paid: true }).eq('id', existingDebt.id);
        setDebts(prev => prev.filter(d => String(d.id) !== String(existingDebt.id)));
      }
    } else if (status === 'Debt') {
      const balance = Math.max(0, total - paid);
      if (existingDebt) {
        await sb.from('debts').update({ amount: balance, customer_name: customer, date }).eq('id', existingDebt.id);
        setDebts(prev => prev.map(d => (String(d.id) === String(existingDebt.id) ? { ...d, amount: balance, customer, date } : d)));
      } else {
        const sale = sales.find(s => String(s.id) === String(id));
        await createDebtForSale({ saleId: id, locationId: sale?.locationId, customer, phone: sale?.phone, amount: balance, date });
      }
    }
  }, [debts, sales, createDebtForSale]);

  const deleteSale = useCallback(async (id) => {
    const saleToDelete = sales.find(s => String(s.id) === String(id));

    // MUHIMU: tunaongeza .select() baada ya delete ili tujue ni rekodi
    // ngapi HALISI zilizofutwa kwenye database. Bila hii, kama RLS
    // (ruhusa za database) hazimruhusu huyu mtumiaji kufuta, Supabase
    // hairudishi error - inarudisha tu orodha tupu (rows 0), na screen
    // ingeonekana "imefutwa" ilhali kwenye database bado ipo (ndiyo maana
    // ilikuwa inaonekana tena kwa salesperson au baada ya kulogout/login).
    const { data: deletedRows, error } = await sb.from('sales').delete().eq('id', id).select();
    if (error) throw new Error(error.message);
    if (!deletedRows || deletedRows.length === 0) {
      throw new Error('Huna ruhusa ya kufuta mauzo haya (au tayari yamefutwa). Owner na Manager tu ndio wanaruhusiwa.');
    }

    setSales(prev => prev.filter(s => String(s.id) !== String(id)));

    const existingDebt = debts.find(d => String(d.saleId) === String(id));
    if (existingDebt) {
      await sb.from('debts').delete().eq('id', existingDebt.id);
      setDebts(prev => prev.filter(d => String(d.id) !== String(existingDebt.id)));
    }

    // Rudisha stock ya bidhaa iliyouzwa (ikiwa sale hii ilitoka kwenye
    // bidhaa iliyopo stock - si "manual price" sale isiyo na bidhaa maalum).
    //
    // Kumbuka: tunatumia `products` (state iliyopo tayari kwenye kumbukumbu)
    // badala ya kufanya request nyingine ya "select" kwenye database kabla
    // ya "update" - hii inapunguza uwezekano wa RLS (ruhusa) kuzuia hatua
    // ya kati kimya kimya. Pia tunaongeza .select() baada ya UPDATE ili
    // tujue kama update HALISI imefanyika kwenye database (siyo tu
    // kwenye screen).
    if (saleToDelete?.productId) {
      const currentProduct = products.find(p => String(p.id) === String(saleToDelete.productId));
      if (currentProduct) {
        const newStock = (Number(currentProduct.stock) || 0) + (Number(saleToDelete.quantity) || 0);
        const { data: updatedRows, error: stockErr } = await sb.from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', saleToDelete.productId)
          .select();

        if (stockErr) {
          console.error('Failed to restore stock after sale delete:', stockErr);
          throw new Error(`Sale imefutwa, LAKINI stock haikurudi: ${stockErr.message}`);
        }
        if (!updatedRows || updatedRows.length === 0) {
          // Update haikuathiri rekodi yoyote - kwa kawaida hii ni RLS
          // (ruhusa ya UPDATE kwenye jedwali la products) inayozuia
          // huyu mtumiaji kubadilisha bidhaa hii.
          throw new Error('Sale imefutwa, LAKINI stock haikurudi kwa sababu huna ruhusa ya kubadilisha bidhaa hii (RLS kwenye jedwali la products). Muulize msimamizi wa mfumo aangalie UPDATE policy ya products.');
        }

        setProducts(prev => prev.map(p => (
          String(p.id) === String(saleToDelete.productId) ? { ...p, stock: newStock } : p
        )));
      } else {
        console.error('Stock restore skipped: bidhaa haikuonekana kwenye orodha ya sasa ya products (productId:', saleToDelete.productId, ')');
      }
    }
  }, [sales, debts, products]);

  const getSales = useCallback((locationId) => (
    sales.filter(s => String(s.locationId) === String(locationId))
  ), [sales]);

  const allSalesWithLocations = useMemo(() => {
    return sales.map(s => {
      const loc = getLocation(s.locationId);
      return {
        ...s,
        locationName: loc ? loc.name : 'Unknown',
        locationIcon: loc?.type === 'store' ? '🏪' : '🏬',
      };
    });
  }, [sales, getLocation]);

  const totalAllSales = useMemo(() => sales.reduce((sum, s) => sum + (s.total || 0), 0), [sales]);

  // ---------------- Staff ----------------
  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const { data, error } = await sb.from('staff').select('*').order('created_at');
      if (error) throw error;
      setStaff((data || []).map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: s.avatar || (s.name || '').slice(0, 2).toUpperCase(),
        role: s.role,
        locationId: s.location_id,
      })));
    } catch (err) {
      console.error('loadStaff error:', err);
      throw err;
    } finally {
      setStaffLoading(false);
    }
  }, []);

  // supabase-js hutupa ujumbe wa jumla tu ("non-2xx status code") wakati
  // Edge Function inarudisha error - hii inasoma ujumbe halisi kutoka
  // kwenye response body (JSON au text) ili tuweze kuuonyesha kwa mtumiaji.
  // TATIZO LILILOKUWEPO: sb.auth.getSession() inarudisha session iliyopo
  // KWENYE KUMBUKUMBU (local) bila kuhakiki kama access_token yake bado ni
  // halali - kwenye simu (mobile), tab ikiwa "background" kwa muda (mfano
  // umehama app nyingine), utaratibu wa auto-refresh wa Supabase husimama,
  // na token inaweza kuisha muda (expire) bila kujazwa upya. Ukija kutumia
  // token hiyo iliyokwisha muda kuita Edge Function, unapata
  // "Not authenticated" - hata ingawa umeshalogin sawasawa.
  //
  // FIX: kabla ya kutuma ombi kwenye Edge Function, tunahakiki muda wa
  // access_token uliopo; kama umeisha (au unakaribia kuisha), tunalazimisha
  // refresh kwanza ili tupate token mpya, halali.
  const getFreshAccessToken = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Session expired. Please login again.');

    const expiresAt = session.expires_at; // seconds tangu epoch
    const nowSec = Math.floor(Date.now() / 1000);
    const isExpiringSoon = !expiresAt || (expiresAt - nowSec) < 60;

    if (!isExpiringSoon) return session.access_token;

    const { data: refreshed, error: refreshErr } = await sb.auth.refreshSession();
    if (refreshErr || !refreshed?.session) {
      throw new Error('Session expired. Please login again.');
    }
    return refreshed.session.access_token;
  };

  const extractFnError = async (error, fallback) => {
    console.error('Edge Function raw error object:', error);
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.clone === 'function') {
        const cloned = ctx.clone();
        try {
          const body = await cloned.json();
          console.error('Edge Function error body (json):', body);
          if (body?.error) return body.error;
        } catch (_) {
          const text = await ctx.text();
          console.error('Edge Function error body (text):', text);
          if (text) return text;
        }
      }
    } catch (parseErr) {
      console.error('Could not parse Edge Function error body:', parseErr);
    }
    return error?.message || fallback;
  };

  // Inatumia Edge Function 'create-staff' (service role inabaki server-side,
  // si kwenye browser - tofauti na faili la HTML la awali).
  const createStaff = useCallback(async ({ name, email, password, role, locationId }) => {
    const accessToken = await getFreshAccessToken();
    let { data, error } = await sb.functions.invoke('create-staff', {
      body: { action: 'create', name, email, password, role, locationId },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) {
      const msg = await extractFnError(error, 'Failed to create staff');
      if (msg === 'Not authenticated') {
        // Token ilikuwa bado imeisha muda kwa sababu fulani - jaribu tena
        // baada ya kulazimisha refresh nyingine.
        const { data: retried, error: retryErr } = await sb.auth.refreshSession();
        if (retryErr || !retried?.session) throw new Error('Session expired. Please login again.');
        ({ data, error } = await sb.functions.invoke('create-staff', {
          body: { action: 'create', name, email, password, role, locationId },
          headers: { Authorization: `Bearer ${retried.session.access_token}` },
        }));
        if (error) throw new Error(await extractFnError(error, 'Failed to create staff'));
      } else {
        throw new Error(msg);
      }
    }
    if (data?.error) throw new Error(data.error);
    const s = data.staff;
    const newStaff = {
      id: s.id, name: s.name, email: s.email,
      avatar: s.avatar, role: s.role, locationId: s.location_id,
    };
    setStaff(prev => addUnique(prev, newStaff, false));
    return newStaff;
  }, []);

  // Kubadilisha role/location ya staff aliyepo si operesheni ya admin,
  // hivyo inaweza kufanyika moja kwa moja kupitia jedwali la staff.
  const updateStaff = useCallback(async (id, { role, locationId }) => {
    const { error } = await sb.from('staff').update({
      role, location_id: role === 'salesperson' ? locationId : null,
    }).eq('id', id);
    if (error) throw new Error(error.message);
    setStaff(prev => prev.map(s => (String(s.id) === String(id)
      ? { ...s, role, locationId: role === 'salesperson' ? locationId : null } : s)));
  }, []);

  const deleteStaff = useCallback(async (id) => {
    const accessToken = await getFreshAccessToken();
    let { data, error } = await sb.functions.invoke('create-staff', {
      body: { action: 'delete', staffId: id },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) {
      const msg = await extractFnError(error, 'Failed to delete staff');
      if (msg === 'Not authenticated') {
        const { data: retried, error: retryErr } = await sb.auth.refreshSession();
        if (retryErr || !retried?.session) throw new Error('Session expired. Please login again.');
        ({ data, error } = await sb.functions.invoke('create-staff', {
          body: { action: 'delete', staffId: id },
          headers: { Authorization: `Bearer ${retried.session.access_token}` },
        }));
        if (error) throw new Error(await extractFnError(error, 'Failed to delete staff'));
      } else {
        throw new Error(msg);
      }
    }
    if (data?.error) throw new Error(data.error);
    setStaff(prev => prev.filter(s => String(s.id) !== String(id)));
  }, []);

  // Owner pekee anaweza kuweka password mpya kwa Manager/Salesperson.
  // (Haiwezekani "kuona" password ya sasa kwa sababu za kiusalama - hii
  // ndiyo sababu Staff.jsx/StaffFormModal huonyesha "Set New Password"
  // badala ya "View Password".)
  const resetStaffPassword = useCallback(async (staffId, newPassword) => {
    const accessToken = await getFreshAccessToken();
    let { data, error } = await sb.functions.invoke('create-staff', {
      body: { action: 'reset-password', staffId, newPassword },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) {
      const msg = await extractFnError(error, 'Failed to change password');
      if (msg === 'Not authenticated') {
        const { data: retried, error: retryErr } = await sb.auth.refreshSession();
        if (retryErr || !retried?.session) throw new Error('Session expired. Please login again.');
        ({ data, error } = await sb.functions.invoke('create-staff', {
          body: { action: 'reset-password', staffId, newPassword },
          headers: { Authorization: `Bearer ${retried.session.access_token}` },
        }));
        if (error) throw new Error(await extractFnError(error, 'Failed to change password'));
      } else {
        throw new Error(msg);
      }
    }
    if (data?.error) throw new Error(data.error);
    return true;
  }, []);


  const staffWithLocations = useMemo(() => {
    return staff.map(s => {
      const loc = s.locationId ? getLocation(s.locationId) : null;
      return { ...s, locationName: loc ? loc.name : null };
    });
  }, [staff, getLocation]);

  const getStaffName = useCallback((id) => {
    const s = staff.find(x => String(x.id) === String(id));
    return s ? s.name : 'Unknown';
  }, [staff]);

  // ---------------- Expenses ----------------
  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const { data, error } = await sb.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      setExpenses((data || []).map(e => ({
        id: e.id,
        locationId: e.location_id,
        staffId: e.staff_id || null,
        date: e.expense_date,
        cat: e.category,
        desc: e.description || '',
        amount: e.amount || 0,
        to: e.paid_to || '',
      })));
    } catch (err) {
      console.error('loadExpenses error:', err);
      throw err;
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const addExpense = useCallback(async ({ locationId, date, cat, desc, amount, to, staffId }) => {
    const { data, error } = await sb.from('expenses').insert({
      location_id: locationId, expense_date: date, category: cat,
      description: desc, amount, paid_to: to, staff_id: staffId || null,
    }).select().single();
    if (error) throw new Error(error.message);
    const expense = {
      id: data.id, locationId: data.location_id, staffId: data.staff_id || null,
      date: data.expense_date, cat: data.category, desc: data.description || '',
      amount: data.amount || 0, to: data.paid_to || '',
    };
    setExpenses(prev => addUnique(prev, expense));
    return expense;
  }, []);

  const updateExpense = useCallback(async (id, { date, cat, desc, amount, to }) => {
    const { error } = await sb.from('expenses').update({
      expense_date: date, category: cat, description: desc, amount, paid_to: to,
    }).eq('id', id);
    if (error) throw new Error(error.message);
    setExpenses(prev => prev.map(e => (String(e.id) === String(id)
      ? { ...e, date, cat, desc, amount, to } : e)));
  }, []);

  const deleteExpense = useCallback(async (id) => {
    const { error } = await sb.from('expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setExpenses(prev => prev.filter(e => String(e.id) !== String(id)));
  }, []);

  const getExpenses = useCallback((locationId) => (
    expenses.filter(e => String(e.locationId) === String(locationId))
  ), [expenses]);

  const allExpensesWithLocations = useMemo(() => {
    return expenses.map(e => {
      const loc = getLocation(e.locationId);
      return {
        ...e,
        locationName: loc ? loc.name : 'Unknown',
        locationIcon: loc?.type === 'store' ? '🏪' : '🏬',
        recordedBy: e.staffId ? getStaffName(e.staffId) : '—',
      };
    });
  }, [expenses, getLocation, getStaffName]);

  const totalAllExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (e.amount || 0), 0), [expenses]);

  // ---------------- Transfers ----------------
  const loadTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const { data, error } = await sb.from('transfers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTransfers((data || []).map(t => ({
        id: t.id,
        fromLocationId: t.from_location_id,
        toLocationId: t.to_location_id,
        note: t.note || '',
        items: t.items || [],
        date: (t.created_at || '').split('T')[0],
      })));
    } catch (err) {
      console.error('loadTransfers error:', err);
      throw err;
    } finally {
      setTransfersLoading(false);
    }
  }, []);

  // items: [{ productId, name, size, brand, buy, sell, cat, quantity }]
  // Kwa kila item: hupunguza stock kwenye Store (chanzo), na huongeza stock
  // kwenye Shop (marudio) - ikiwa bidhaa yenye jina+size sawa tayari ipo
  // huongeza stock yake, la sivyo huunda bidhaa mpya kwenye Shop hiyo.
  const executeTransfer = useCallback(async ({ fromLocationId, toLocationId, note, items }) => {
    const validItems = items.filter(it => it.quantity > 0);
    if (!validItems.length) throw new Error('Please enter at least one quantity to transfer');

    for (const it of validItems) {
      if (it.quantity > it.stock) {
        throw new Error(`Not enough stock for "${it.name}" (available: ${it.stock})`);
      }
    }

    // 1) Punguza stock chanzo (Store)
    for (const it of validItems) {
      await updateProduct(it.productId, {
        name: it.name, size: it.size, brand: it.brand,
        buy: it.buy, sell: it.sell, stock: it.stock - it.quantity, cat: it.cat,
      });
    }

    // 2) Ongeza stock marudio (Shop) - tafuta bidhaa inayolingana au unda mpya
    for (const it of validItems) {
      const match = products.find(p => (
        String(p.locationId) === String(toLocationId) &&
        p.name.trim().toLowerCase() === it.name.trim().toLowerCase() &&
        (p.size || '').trim().toLowerCase() === (it.size || '').trim().toLowerCase()
      ));
      if (match) {
        await updateProduct(match.id, {
          name: match.name, size: match.size, brand: match.brand,
          buy: match.buy, sell: match.sell, stock: match.stock + it.quantity, cat: match.cat,
        });
      } else {
        await addProduct({
          locationId: toLocationId, name: it.name, size: it.size, brand: it.brand,
          buy: it.buy, sell: it.sell, stock: it.quantity, cat: it.cat,
        });
      }
    }

    // 3) Rekodi ya historia ya uhamisho
    const { data, error } = await sb.from('transfers').insert({
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      note,
      items: validItems.map(it => ({ name: it.name, size: it.size, quantity: it.quantity })),
    }).select().single();
    if (error) throw new Error(error.message);

    const transfer = {
      id: data.id, fromLocationId: data.from_location_id, toLocationId: data.to_location_id,
      note: data.note || '', items: data.items || [], date: (data.created_at || '').split('T')[0],
    };
    setTransfers(prev => addUnique(prev, transfer));
    return transfer;
  }, [products, updateProduct, addProduct]);

  const allTransfersWithLocations = useMemo(() => {
    return transfers.map(t => ({
      ...t,
      fromName: getLocation(t.fromLocationId)?.name || 'Unknown',
      toName: getLocation(t.toLocationId)?.name || 'Unknown',
    }));
  }, [transfers, getLocation]);

  // ---------------- Live Sync (Realtime) ----------------
  // Owner na Manager (na Salesperson) wote hutumia database moja - bila hii,
  // akibadilisha mmoja (mfano Owner akiongeza mauzo), mwingine (Manager)
  // hataoni mpaka a-refresh page kwa mkono. Hii inasikiliza mabadiliko
  // kwenye Supabase moja kwa moja na kusasisha screen papo hapo, kwa
  // watumiaji wote waliopo online kwa wakati mmoja.
  const loadersRef = useRef({});
  loadersRef.current = {
    loadLocations, loadProducts, loadSales, loadStaff, loadDebts, loadExpenses, loadTransfers,
  };

  useEffect(() => {
    const channel = sb.channel('godoro-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => loadersRef.current.loadLocations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadersRef.current.loadProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => loadersRef.current.loadSales())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => loadersRef.current.loadStaff())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => loadersRef.current.loadDebts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => loadersRef.current.loadExpenses())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => loadersRef.current.loadTransfers())
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, []);

  const value = {
    locations, stores, shops, locationsLoading,
    loadLocations, addLocation, updateLocation, deleteLocation, getLocation,
    products, productsLoading, allProductsWithLocations, getProducts, knownBrands,
    loadProducts, addProduct, updateProduct, deleteProduct, findMatchingProduct,
    sales, salesLoading, allSalesWithLocations, getSales, totalAllSales,
    loadSales, addSale, updateSale, deleteSale,
    debts, debtsLoading, allDebtsWithLocations, getDebts, totalAllDebts,
    loadDebts, markDebtPaid, recordDebtPayment, deleteDebt,
    staff, staffLoading, staffWithLocations, getStaffName,
    loadStaff, createStaff, updateStaff, deleteStaff, resetStaffPassword,
    expenses, expensesLoading, allExpensesWithLocations, getExpenses, totalAllExpenses,
    loadExpenses, addExpense, updateExpense, deleteExpense,
    transfers, transfersLoading, allTransfersWithLocations,
    loadTransfers, executeTransfer,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
