import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { sb } from '../supabaseClient';
import { today } from '../utils/format.js';

const DataContext = createContext(null);

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
    setLocations(prev => [...prev, {
      id: data.id, name: data.name, location: data.location,
      type: data.type, phone: data.phone, email: data.email,
    }]);
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
    setProducts(prev => [...prev, product]);
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

  // Inatafuta bidhaa kwenye stock ya location fulani inayolingana na jina+size
  // (sawa na onSaleProductNameChange() kwenye HTML ya awali).
  const findMatchingProduct = useCallback((locationId, name, size) => {
    const list = getProducts(locationId);
    const byNameAndSize = list.find(p =>
      p.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      (!size || !p.size || p.size.trim() === size.trim())
    );
    if (byNameAndSize) return byNameAndSize;
    return list.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim()) || null;
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
    setDebts(prev => [{
      id: data.id, saleId: data.sale_id, locationId: data.location_id,
      customer: data.customer_name, phone: data.customer_phone || '',
      amount: data.amount || 0, date: data.date, due: data.due_date,
    }, ...prev]);
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

  const deleteDebt = useCallback(async (id) => {
    const { error } = await sb.from('debts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setDebts(prev => prev.filter(d => String(d.id) !== String(id)));
  }, []);

  const getDebts = useCallback((locationId) => (
    debts.filter(d => String(d.locationId) === String(locationId))
  ), [debts]);

  const allDebtsWithLocations = useMemo(() => {
    return debts.map(d => {
      const loc = getLocation(d.locationId);
      return { ...d, locationName: loc ? loc.name : 'Unknown', locationIcon: loc?.type === 'store' ? '🏪' : '🏬' };
    });
  }, [debts, getLocation]);

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
        unitPrice: s.unit_price || 0,
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

    let unitPrice, total, matchedProduct = null;

    if (productId) {
      matchedProduct = products.find(p => String(p.id) === String(productId));
      if (!matchedProduct) throw new Error('Product not found in stock.');
      if (matchedProduct.stock < quantity) {
        throw new Error(`Insufficient stock! Available: ${matchedProduct.stock}`);
      }
      unitPrice = matchedProduct.sell;
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
      unit_price: unitPrice,
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
      date: saleDate, items, unitPrice, quantity, total, paid, status, method,
    };
    setSales(prev => [saleRecord, ...prev]);

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
    const { error } = await sb.from('sales').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setSales(prev => prev.filter(s => String(s.id) !== String(id)));
    const existingDebt = debts.find(d => String(d.saleId) === String(id));
    if (existingDebt) {
      await sb.from('debts').delete().eq('id', existingDebt.id);
      setDebts(prev => prev.filter(d => String(d.id) !== String(existingDebt.id)));
    }
  }, [debts]);

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
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Session expired. Please login again.');
    const { data, error } = await sb.functions.invoke('create-staff', {
      body: { action: 'create', name, email, password, role, locationId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(await extractFnError(error, 'Failed to create staff'));
    if (data?.error) throw new Error(data.error);
    const s = data.staff;
    const newStaff = {
      id: s.id, name: s.name, email: s.email,
      avatar: s.avatar, role: s.role, locationId: s.location_id,
    };
    setStaff(prev => [...prev, newStaff]);
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
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Session expired. Please login again.');
    const { data, error } = await sb.functions.invoke('create-staff', {
      body: { action: 'delete', staffId: id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(await extractFnError(error, 'Failed to delete staff'));
    if (data?.error) throw new Error(data.error);
    setStaff(prev => prev.filter(s => String(s.id) !== String(id)));
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

  const addExpense = useCallback(async ({ locationId, date, cat, desc, amount, to }) => {
    const { data, error } = await sb.from('expenses').insert({
      location_id: locationId, expense_date: date, category: cat,
      description: desc, amount, paid_to: to,
    }).select().single();
    if (error) throw new Error(error.message);
    const expense = {
      id: data.id, locationId: data.location_id, date: data.expense_date,
      cat: data.category, desc: data.description || '', amount: data.amount || 0,
      to: data.paid_to || '',
    };
    setExpenses(prev => [expense, ...prev]);
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
      };
    });
  }, [expenses, getLocation]);

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
    setTransfers(prev => [transfer, ...prev]);
    return transfer;
  }, [products, updateProduct, addProduct]);

  const allTransfersWithLocations = useMemo(() => {
    return transfers.map(t => ({
      ...t,
      fromName: getLocation(t.fromLocationId)?.name || 'Unknown',
      toName: getLocation(t.toLocationId)?.name || 'Unknown',
    }));
  }, [transfers, getLocation]);

  const value = {
    locations, stores, shops, locationsLoading,
    loadLocations, addLocation, updateLocation, deleteLocation, getLocation,
    products, productsLoading, allProductsWithLocations, getProducts, knownBrands,
    loadProducts, addProduct, updateProduct, deleteProduct, findMatchingProduct,
    sales, salesLoading, allSalesWithLocations, getSales, totalAllSales,
    loadSales, addSale, updateSale, deleteSale,
    debts, debtsLoading, allDebtsWithLocations, getDebts, totalAllDebts,
    loadDebts, markDebtPaid, deleteDebt,
    staff, staffLoading, staffWithLocations, getStaffName,
    loadStaff, createStaff, updateStaff, deleteStaff,
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
