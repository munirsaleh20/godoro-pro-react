import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';
import SupplierModal from '../components/SupplierModal.jsx';
import SupplierGoodsModal from '../components/SupplierGoodsModal.jsx';
import SupplierPaymentModal from '../components/SupplierPaymentModal.jsx';
import EditSupplierGoodsModal from '../components/EditSupplierGoodsModal.jsx';
import WholesaleCustomerModal from '../components/WholesaleCustomerModal.jsx';
import WholesalePaymentModal from '../components/WholesalePaymentModal.jsx';

// Suppliers sasa ina VICHUPO viwili:
//   1) "Wasambazaji" (kiwanda) - watu tunaowadai (wanatupatia mzigo kwa mkopo)
//   2) "Wateja wa Jumla" (wholesale) - watu wanaotudai (tunawapatia mzigo kwa mkopo)
// Wholesale.jsx (ukurasa tofauti wa awali) imefutwa - features zake zote
// zimehamishiwa hapa kama kichupo cha pili, bila kubadilisha muundo wa
// database (bado zinatumia wholesale_customers / wholesale_transactions).
export default function Suppliers() {
  const { currentUser, isManager } = useAuth();
  const {
    getLocation, suppliersWithSummary, totalSupplierDebt,
    addSupplier, updateSupplier, deleteSupplier,
    addSupplierGoods, addSupplierGoodsDropship, addSupplierPayment, addSupplierOpeningBalance, deleteSupplierTransaction, getSupplierTransactions,
    wholesaleCustomersWithSummary, totalWholesaleDebt, wholesaleTransactions,
    addWholesaleCustomer, updateWholesaleCustomer, deleteWholesaleCustomer,
    addWholesaleGoods, addWholesalePayment, addWholesaleOpeningBalance, deleteWholesaleTransaction, getWholesaleTransactions,
  } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [tab, setTab] = useState('factories'); // 'factories' | 'wholesale'
  // Wateja wa jumla HAWAWEZI tena kuchukua mzigo kutoka kwenye stock ya
  // duka letu - mzigo wao lazima utoke moja kwa moja kiwandani (dropship).
  // Hii inashikilia customerId aliyechaguliwa wakati wa "Toa Mzigo Kupitia
  // Kiwanda" kwenye "sheet" ya mteja, ili SupplierGoodsModal imchague
  // moja kwa moja mara mtumiaji atakapofungua kiwanda husika.
  const [dropshipTargetCustomerId, setDropshipTargetCustomerId] = useState(null);

  // ============== Kichupo 1: Wasambazaji (Factories/Kiwanda) - state ==============
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalMode, setSupplierModalMode] = useState('add');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [goodsModalOpen, setGoodsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingGoodsTxn, setEditingGoodsTxn] = useState(null);

  // ============== Kichupo 2: Wateja wa Jumla (Wholesale) - state ==============
  const [wSearch, setWSearch] = useState('');
  const [wSelectedId, setWSelectedId] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState('add');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [wPaymentModalOpen, setWPaymentModalOpen] = useState(false);

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Suppliers ni kwa ajili ya Owner/Manager pekee.</div>
      </div>
    );
  }

  // ================= Kichupo 1: Wasambazaji - logic =================
  let list = suppliersWithSummary;
  if (search.trim()) list = list.filter(s => matchesSearch([s.name, s.phone, s.address], search));

  const selected = list.find(s => String(s.id) === String(selectedId))
    || suppliersWithSummary.find(s => String(s.id) === String(selectedId));

  const ledger = useMemo(() => {
    if (!selected) return [];
    let running = 0;
    return getSupplierTransactions(selected.id).map(t => {
      running += t.type === 'stock_in' ? t.amount : -t.amount;
      return { ...t, runningBalance: running };
    });
  }, [selected, getSupplierTransactions]);

  const totalReceived = ledger.filter(t => t.type === 'stock_in').reduce((s, t) => s + t.amount, 0);
  const totalPaidToSupplier = ledger.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

  // FAIDA YA JUMLA (dropship) - kadi ya jumla kwenye ukurasa mkuu wa
  // Wasambazaji. Kwa kila mteja wa jumla, tunahesabu faida (unitPrice -
  // buyPrice) x quantity, kisha tunaionyesha kwa UWIANO wa kile
  // ambacho mteja huyo AMESHALIPA - ili tusihesabu faida ya deni ambalo
  // bado halijalipwa. Matokeo yanajumlishwa kwa wateja WOTE.
  const totalWholesaleProfit = useMemo(() => {
    return wholesaleCustomersWithSummary.reduce((sum, c) => {
      const txns = wholesaleTransactions.filter(t => String(t.customerId) === String(c.id));
      const totalGoods = txns.filter(t => t.type === 'goods').reduce((s, t) => s + t.amount, 0);
      const totalPaid = txns.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
      const paidFraction = totalGoods > 0 ? Math.min(1, totalPaid / totalGoods) : 0;
      const margin = txns
        .filter(t => t.type === 'goods')
        .reduce((s, t) => s + (t.items || []).reduce((s2, it) => s2 + (it.quantity || 0) * ((it.unitPrice || 0) - (it.buyPrice || 0)), 0), 0);
      return sum + margin * paidFraction;
    }, 0);
  }, [wholesaleCustomersWithSummary, wholesaleTransactions]);

  const openAddSupplier = () => { setSupplierModalMode('add'); setEditingSupplier(null); setSupplierModalOpen(true); };
  const openEditSupplier = (s) => { setSupplierModalMode('edit'); setEditingSupplier(s); setSupplierModalOpen(true); };

  const handleSupplierSubmit = async (payload) => {
    let targetSupplierId;
    if (supplierModalMode === 'add') {
      const created = await addSupplier({ ...payload, createdBy: currentUser.id });
      targetSupplierId = created.id;
      showToast(`✅ Kiwanda "${created.name}" limeongezwa!`);
      setSelectedId(created.id);
    } else {
      await updateSupplier(editingSupplier.id, payload);
      targetSupplierId = editingSupplier.id;
      showToast('✅ Taarifa za kiwanda zimesasishwa!');
    }
    if (payload.openingBalance > 0) {
      await addSupplierOpeningBalance({
        supplierId: targetSupplierId, amount: payload.openingBalance,
        description: 'Deni la Awali (kabla ya Godoro Pro)', recordedBy: currentUser.id,
      });
    }
    setSupplierModalOpen(false);
  };

  const handleDeleteSupplier = async (s) => {
    const ok = await confirmAction(`Futa kiwanda "${s.name}" pamoja na historia yake YOTE ya mizigo na malipo?\n\nHatua hii haiwezi kutenguliwa.`);
    if (!ok) return;
    try {
      await deleteSupplier(s.id);
      showToast('🗑️ Kiwanda limefutwa');
      if (String(selectedId) === String(s.id)) setSelectedId(null);
    } catch (err) {
      showToast('Imeshindikana: ' + err.message, 'error');
    }
  };

  const handleGoodsSubmit = async ({ dropship, wholesaleCustomerId, newCustomer, deliveryLocation, locationId, items, advance, description, date }) => {
    if (dropship) {
      let customerId = wholesaleCustomerId;
      if (!customerId && newCustomer) {
        const created = await addWholesaleCustomer({ ...newCustomer, createdBy: currentUser.id });
        customerId = created.id;
      }

      const deliveryNote = deliveryLocation ? ` · Kupelekwa: ${deliveryLocation}` : '';

      const supplierTxn = await addSupplierGoodsDropship({
        supplierId: selected.id,
        items,
        description: `${description || 'Dropship kwa mteja wa jumla'}${deliveryNote}`.trim(),
        date, recordedBy: currentUser.id,
      });
      const dropshipGroupId = supplierTxn.dropshipGroupId;

      const wholesaleItems = items.map(({ name, size, quantity, sellPrice, buyPrice }) => ({ name, size, quantity, unitPrice: sellPrice, buyPrice: buyPrice || 0, source: 'dropship' }));
      const wholesaleAmount = items.reduce((sum, it) => sum + it.quantity * (it.sellPrice || 0), 0);
      await addWholesaleGoods({
        customerId, locationId: null, items: wholesaleItems, amount: wholesaleAmount,
        description: `Dropship kutoka kiwanda "${selected.name}"${deliveryNote}`.trim(),
        date, recordedBy: currentUser.id, dropshipGroupId,
      });

      if (advance > 0) {
        await addWholesalePayment({
          customerId, locationId: null, amount: advance,
          description: 'Malipo ya awali (advance) wakati wa kupokea mzigo wa dropship', date, recordedBy: currentUser.id,
          dropshipGroupId,
        });
      }

      showToast(`✅ Mzigo wa dropship umerekodiwa: deni kwa "${selected.name}" na deni la mteja wa jumla vimeongezwa`);
      setGoodsModalOpen(false);
      // Kama tulikuja kutoka kwenye "sheet" ya mteja fulani (dropshipTargetCustomerId),
      // turudi huko moja kwa moja tuonyeshe deni jipya kwenye ledger yake.
      if (dropshipTargetCustomerId) {
        setDropshipTargetCustomerId(null);
        setSelectedId(null);
        setTab('wholesale');
        setWSelectedId(customerId);
      }
      return;
    }

    await addSupplierGoods({
      supplierId: selected.id, locationId, items, description, date, recordedBy: currentUser.id,
    });
    showToast(`✅ Mzigo umerekodiwa kutoka "${selected.name}"`);
    setGoodsModalOpen(false);
  };

  const handlePaymentSubmit = async ({ amount, description, date }) => {
    await addSupplierPayment({
      supplierId: selected.id, amount, description, date, recordedBy: currentUser.id,
    });
    showToast(`✅ Malipo ya ${fmtS(amount)} yamerekodiwa`);
    setPaymentModalOpen(false);
  };

  const handleDeleteTxn = async (t) => {
    const ok = await confirmAction(`Futa mstari huu (${t.type === 'stock_in' ? 'Mzigo Ulipokelewa' : 'Malipo'} — ${fmtS(t.amount)})?`);
    if (!ok) return;
    try {
      await deleteSupplierTransaction(t.id);
      showToast('🗑️ Mstari umefutwa');
    } catch (err) {
      showToast('Imeshindikana: ' + err.message, 'error');
    }
  };

  const handleEditGoodsSaved = () => {
    showToast('✅ Mzigo umesasishwa');
    setEditingGoodsTxn(null);
  };

  // ================= Kichupo 2: Wateja wa Jumla - logic =================
  let wList = wholesaleCustomersWithSummary;
  if (wSearch.trim()) wList = wList.filter(c => matchesSearch([c.name, c.phone, c.address], wSearch));

  const wSelected = wList.find(c => String(c.id) === String(wSelectedId))
    || wholesaleCustomersWithSummary.find(c => String(c.id) === String(wSelectedId));

  const wLedger = useMemo(() => {
    if (!wSelected) return [];
    let running = 0;
    return getWholesaleTransactions(wSelected.id).map(t => {
      running += t.type === 'goods' ? t.amount : -t.amount;
      return { ...t, runningBalance: running };
    });
  }, [wSelected, getWholesaleTransactions]);

  const wTotalGoods = wLedger.filter(t => t.type === 'goods').reduce((s, t) => s + t.amount, 0);
  const wTotalPaid = wLedger.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

  // FAIDA ILIYOPATIKANA kwa mteja huyu: kila mzigo (goods) una faida ya
  // (unitPrice - buyPrice) x quantity kwa kila bidhaa. Faida hii TU
  // inaonekana kwa UWIANO wa kile ambacho mteja AMESHALIPA (paidFraction) -
  // "ikiwa mtu amelipa ndipo ionyeshe profit" - ili tusihesabu faida ya deni
  // ambalo bado halijalipwa. Mizigo ya zamani isiyo na buyPrice/unitPrice
  // (kabla ya kipengele hiki) inahesabiwa kama faida ya TZS 0 kwa usalama.
  const wPaidFraction = wTotalGoods > 0 ? Math.min(1, wTotalPaid / wTotalGoods) : 0;
  const wTotalMargin = wLedger
    .filter(t => t.type === 'goods')
    .reduce((sum, t) => sum + (t.items || []).reduce((s, it) => s + (it.quantity || 0) * ((it.unitPrice || 0) - (it.buyPrice || 0)), 0), 0);
  const wProfitRealized = wTotalMargin * wPaidFraction;

  const openAddCustomer = () => { setCustomerModalMode('add'); setEditingCustomer(null); setCustomerModalOpen(true); };
  const openEditCustomer = (c) => { setCustomerModalMode('edit'); setEditingCustomer(c); setCustomerModalOpen(true); };

  const handleCustomerSubmit = async (payload) => {
    let targetCustomerId;
    if (customerModalMode === 'add') {
      const created = await addWholesaleCustomer({ ...payload, createdBy: currentUser.id });
      targetCustomerId = created.id;
      showToast(`✅ Duka "${created.name}" limeongezwa!`);
      setWSelectedId(created.id);
    } else {
      await updateWholesaleCustomer(editingCustomer.id, payload);
      targetCustomerId = editingCustomer.id;
      showToast('✅ Taarifa za duka zimesasishwa!');
    }
    if (payload.openingBalance > 0) {
      await addWholesaleOpeningBalance({
        customerId: targetCustomerId, amount: payload.openingBalance,
        description: 'Deni la Awali (kabla ya Godoro Pro)', recordedBy: currentUser.id,
      });
    }
    setCustomerModalOpen(false);
  };

  const handleDeleteCustomer = async (c) => {
    const ok = await confirmAction(`Futa duka "${c.name}" pamoja na historia yake YOTE ya mizigo na malipo?\n\nHatua hii haiwezi kutenguliwa.`);
    if (!ok) return;
    try {
      await deleteWholesaleCustomer(c.id);
      showToast('🗑️ Duka limefutwa');
      if (String(wSelectedId) === String(c.id)) setWSelectedId(null);
    } catch (err) {
      showToast('Imeshindikana: ' + err.message, 'error');
    }
  };

  const handleWPaymentSubmit = async ({ amount, description, date }) => {
    await addWholesalePayment({
      customerId: wSelected.id, locationId: null, amount, description, date, recordedBy: currentUser.id,
    });
    showToast(`✅ Malipo ya ${fmtS(amount)} yamerekodiwa`);
    setWPaymentModalOpen(false);
  };

  const handleDeleteWTxn = async (t) => {
    const ok = await confirmAction(`Futa mstari huu (${t.type === 'goods' ? 'Mzigo' : 'Malipo'} — ${fmtS(t.amount)})?`);
    if (!ok) return;
    try {
      await deleteWholesaleTransaction(t.id);
      showToast('🗑️ Mstari umefutwa');
    } catch (err) {
      showToast('Imeshindikana: ' + err.message, 'error');
    }
  };

  // ================= Sehemu ya juu: Vichupo (Tabs) =================
  const TabBar = () => (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        <button
          onClick={() => setTab('factories')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            color: tab === 'factories' ? '#e07b2a' : '#64748b',
            borderBottom: tab === 'factories' ? '3px solid #e07b2a' : '3px solid transparent', marginBottom: -2,
          }}
        >
          🏭 Wasambazaji ({suppliersWithSummary.length})
        </button>
        <button
          onClick={() => setTab('wholesale')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            color: tab === 'wholesale' ? '#e07b2a' : '#64748b',
            borderBottom: tab === 'wholesale' ? '3px solid #e07b2a' : '3px solid transparent', marginBottom: -2,
          }}
        >
          📊 Wateja wa Jumla ({wholesaleCustomersWithSummary.length})
        </button>
      </div>

      {/* Muhtasari wa DENI - unaonekana kwenye vichupo VYOTE viwili, kila
          wakati, ili kuonyesha pande zote mbili za deni kwa pamoja:
          (1) deni TUNALOLIDAIWA na wasambazaji (kiwanda kinatudai sisi)
          (2) deni TUNALODAI wateja wa jumla (sisi tunawadai wao) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{
          flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 10,
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px',
        }}>
          <span style={{ fontSize: 20 }}>🏭</span>
          <div>
            <div style={{ fontSize: 11, color: '#7f1d1d', fontWeight: 600 }}>Kiwanda Kinatudai (Tunadaiwa)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{fmtS(totalSupplierDebt)}</div>
          </div>
        </div>
        <div style={{
          flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 10,
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px',
        }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ fontSize: 11, color: '#1e3a8a', fontWeight: 600 }}>Wateja wa Jumla Wanadaiwa (Tunawadai)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>{fmtS(totalWholesaleDebt)}</div>
          </div>
        </div>
      </div>
    </>
  );

  // ================= Muonekano: Kichupo 1, "sheet" ya kiwanda moja =================
  if (tab === 'factories' && selected) {
    return (
      <div>
        <TabBar />
        <button className="btn-ghost small" style={{ marginBottom: 14 }} onClick={() => setSelectedId(null)}>
          ◀ Rudi kwenye Majedwali
        </button>

        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 2 }}>🏭 {selected.name}</h3>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {selected.phone ? `📞 ${selected.phone}` : ''} {selected.address ? `· 📍 ${selected.address}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost small" onClick={() => openEditSupplier(selected)}>✏️ Hariri</button>
            <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDeleteSupplier(selected)}>🗑️ Futa Kiwanda</button>
          </div>
        </div>

        <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#2563eb' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)' }}>📦</div>
            <div className="stat-label">Jumla ya Mizigo Iliyopokelewa</div>
            <div className="stat-value">{fmtS(totalReceived)}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#16a34a' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)' }}>💰</div>
            <div className="stat-label">Jumla Tuliyorejesha</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{fmtS(totalPaidToSupplier)}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#dc2626' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.1)' }}>💳</div>
            <div className="stat-label">Deni Tunalodaiwa</div>
            <div className="stat-value" style={{ color: selected.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtS(Math.max(0, selected.balance))}</div>
          </div>
        </div>

        {dropshipTargetCustomerId && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12.5, color: '#0369a1' }}>
            🎯 Bofya "Pokea Mzigo Mpya (Mkopo)" hapa chini — mzigo utapelekwa moja kwa moja kwa mteja wa jumla uliyemchagua, bila kuingia stock ya duka.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setGoodsModalOpen(true)}>📦 Pokea Mzigo Mpya (Mkopo)</button>
          <button className="btn-ghost" onClick={() => setPaymentModalOpen(true)}>💰 Rekodi Malipo</button>
        </div>

        <div className="table-container excel-sheet" style={{ overflowX: 'auto' }}>
          {ledger.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <div className="empty-title">Bado Hakuna Miamala</div>
              <div>Anza kwa kupokea mzigo wa kwanza kutoka kiwanda hiki.</div>
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Tarehe</th>
                  <th>Maelezo</th>
                  <th>Duka</th>
                  <th style={{ textAlign: 'right' }}>Mzigo (Debit)</th>
                  <th style={{ textAlign: 'right' }}>Malipo (Credit)</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'center' }}>—</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(t => {
                  const loc = t.locationId ? getLocation(t.locationId) : null;
                  return (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>
                        {t.type === 'stock_in' && t.items ? t.items.map(it => `${it.name} (${it.quantity})`).join(', ') : (t.description || (t.type === 'stock_in' ? 'Mzigo' : 'Malipo'))}
                      </td>
                      <td>{loc ? `${loc.type === 'store' ? '🏪' : '🏬'} ${loc.name}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: t.type === 'stock_in' ? 700 : 400 }}>
                        {t.type === 'stock_in' ? fmtS(t.amount) : ''}
                      </td>
                      <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: t.type === 'payment' ? 700 : 400 }}>
                        {t.type === 'payment' ? fmtS(t.amount) : ''}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtS(t.runningBalance)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {t.type === 'stock_in' && (
                          <button className="btn-ghost small" onClick={() => setEditingGoodsTxn(t)}>✏️</button>
                        )}
                        <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDeleteTxn(t)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <SupplierGoodsModal open={goodsModalOpen} supplier={selected} onClose={() => setGoodsModalOpen(false)} onSubmit={handleGoodsSubmit} presetCustomerId={dropshipTargetCustomerId} />
        <SupplierPaymentModal open={paymentModalOpen} supplier={selected} onClose={() => setPaymentModalOpen(false)} onSubmit={handlePaymentSubmit} />
        <EditSupplierGoodsModal
          open={!!editingGoodsTxn} txn={editingGoodsTxn} supplier={selected} getLocation={getLocation}
          onClose={() => setEditingGoodsTxn(null)} onSubmit={handleEditGoodsSaved}
        />
        <SupplierModal
          open={supplierModalOpen} mode={supplierModalMode} initial={editingSupplier}
          onClose={() => setSupplierModalOpen(false)} onSubmit={handleSupplierSubmit}
        />
      </div>
    );
  }

  // ================= Muonekano: Kichupo 2, "sheet" ya mteja wa jumla mmoja =================
  if (tab === 'wholesale' && wSelected) {
    return (
      <div>
        <TabBar />
        <button className="btn-ghost small" style={{ marginBottom: 14 }} onClick={() => setWSelectedId(null)}>
          ◀ Rudi kwenye Majedwali
        </button>

        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 2 }}>📊 {wSelected.name}</h3>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {wSelected.phone ? `📞 ${wSelected.phone}` : ''} {wSelected.address ? `· 📍 ${wSelected.address}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost small" onClick={() => openEditCustomer(wSelected)}>✏️ Hariri</button>
            <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDeleteCustomer(wSelected)}>🗑️ Futa Duka</button>
          </div>
        </div>

        <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#e07b2a' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(224,123,42,0.1)' }}>📦</div>
            <div className="stat-label">Jumla ya Mizigo</div>
            <div className="stat-value">{fmtS(wTotalGoods)}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#16a34a' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)' }}>💰</div>
            <div className="stat-label">Jumla Iliyolipwa</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{fmtS(wTotalPaid)}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#dc2626' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.1)' }}>💳</div>
            <div className="stat-label">Deni Linalobaki</div>
            <div className="stat-value" style={{ color: wSelected.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtS(Math.max(0, wSelected.balance))}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#9333ea' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(147,51,234,0.1)' }}>🏆</div>
            <div className="stat-label">Faida Iliyopatikana</div>
            <div className="stat-value" style={{ color: '#9333ea' }}>{fmtS(wProfitRealized)}</div>
            <div className="stat-sub">Inaongezeka mteja anapolipa deni ({Math.round(wPaidFraction * 100)}% imelipwa)</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={() => { setDropshipTargetCustomerId(wSelected.id); setWSelectedId(null); setTab('factories'); }}
          >
            📦 Toa Mzigo Kupitia Kiwanda (Supplier)
          </button>
          <button className="btn-ghost" onClick={() => setWPaymentModalOpen(true)}>💰 Rekodi Malipo</button>
        </div>

        <div className="table-container excel-sheet" style={{ overflowX: 'auto' }}>
          {wLedger.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <div className="empty-title">Bado Hakuna Miamala</div>
              <div>Anza kwa kutoa mzigo wa kwanza kwa duka hili.</div>
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Tarehe</th>
                  <th>Maelezo</th>
                  <th style={{ textAlign: 'right' }}>Mzigo (Debit)</th>
                  <th style={{ textAlign: 'right' }}>Malipo (Credit)</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'center' }}>—</th>
                </tr>
              </thead>
              <tbody>
                {wLedger.map(t => {
                  const loc = t.locationId ? getLocation(t.locationId) : null;
                  return (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>
                        {t.type === 'goods' && t.items ? t.items.map(it => `${it.name} (${it.quantity})`).join(', ') : (t.description || (t.type === 'goods' ? 'Mzigo' : 'Malipo'))}
                        {t.type === 'goods' && loc && (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}> · {loc.type === 'store' ? '🏪' : '🏬'} {loc.name}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: t.type === 'goods' ? 700 : 400 }}>
                        {t.type === 'goods' ? fmtS(t.amount) : ''}
                      </td>
                      <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: t.type === 'payment' ? 700 : 400 }}>
                        {t.type === 'payment' ? fmtS(t.amount) : ''}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtS(t.runningBalance)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDeleteWTxn(t)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <WholesalePaymentModal open={wPaymentModalOpen} customer={wSelected} onClose={() => setWPaymentModalOpen(false)} onSubmit={handleWPaymentSubmit} />
        <WholesaleCustomerModal
          open={customerModalOpen} mode={customerModalMode} initial={editingCustomer}
          onClose={() => setCustomerModalOpen(false)} onSubmit={handleCustomerSubmit}
        />
      </div>
    );
  }

  // ================= Muonekano: Kichupo 1, Majedwali ya Wasambazaji =================
  if (tab === 'factories') {
    const targetCustomer = dropshipTargetCustomerId
      ? wholesaleCustomersWithSummary.find(c => String(c.id) === String(dropshipTargetCustomerId))
      : null;
    return (
      <div>
        <TabBar />
        {targetCustomer && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: '#0369a1' }}>
              🎯 Unatoa mzigo kwa mteja wa jumla <strong>"{targetCustomer.name}"</strong> — chagua kiwanda husika hapa chini kisha bofya "Pokea Mzigo Mpya (Mkopo)".
            </div>
            <button className="btn-ghost small" onClick={() => setDropshipTargetCustomerId(null)}>✖ Ghairi</button>
          </div>
        )}
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <h3 className="section-title">🏭 Wasambazaji ({list.length})</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="form-input" style={{ maxWidth: 220 }}
              placeholder="Tafuta kiwanda..." value={search} onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-primary" onClick={openAddSupplier}>+ Ongeza Kiwanda</button>
          </div>
        </div>

        <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#dc2626' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💳</div>
            <div className="stat-label">Jumla ya Madeni Tunayodaiwa</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{fmtS(totalSupplierDebt)}</div>
            <div className="stat-sub">{list.filter(s => s.balance > 0).length} viwanda tunavyodaiwa nao</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#9333ea' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(147,51,234,0.1)' }}>🏆</div>
            <div className="stat-label">Faida ya Jumla (Dropship)</div>
            <div className="stat-value" style={{ color: '#9333ea' }}>{fmtS(totalWholesaleProfit)}</div>
            <div className="stat-sub">Faida iliyopatikana kutoka mizigo ya "🚚 Peleka Moja kwa Moja kwa Mteja wa Jumla"</div>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏭</div>
            <div className="empty-title">Bado Hakuna Kiwanda/Msambazaji</div>
            <div>Bofya "+ Ongeza Kiwanda" kuanza kufuatilia mzigo/deni la kiwanda cha kwanza.</div>
          </div>
        ) : (
          <div className="wholesale-sheets-grid">
            {list.map(s => (
              <div key={s.id} className="wholesale-sheet-card" onClick={() => setSelectedId(s.id)}>
                <div className="wholesale-sheet-tab supplier-tab">📄 {s.name}</div>
                <div className="wholesale-sheet-body">
                  {s.phone && <div className="wholesale-sheet-phone">📞 {s.phone}</div>}
                  <div className="wholesale-sheet-balance" style={{ color: s.balance > 0 ? '#dc2626' : '#16a34a' }}>
                    {s.balance > 0 ? `Tunadaiwa: ${fmtS(s.balance)}` : '✅ Hakuna Deni'}
                  </div>
                  <div className="wholesale-sheet-meta">{s.transactionCount} miamala {s.lastActivity ? `· mwisho ${s.lastActivity}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <SupplierModal
          open={supplierModalOpen} mode={supplierModalMode} initial={editingSupplier}
          onClose={() => setSupplierModalOpen(false)} onSubmit={handleSupplierSubmit}
        />
      </div>
    );
  }

  // ================= Muonekano: Kichupo 2, Majedwali ya Wateja wa Jumla =================
  return (
    <div>
      <TabBar />
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">📊 Wateja wa Jumla ({wList.length})</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="form-input" style={{ maxWidth: 220 }}
            placeholder="Tafuta duka..." value={wSearch} onChange={(e) => setWSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={openAddCustomer}>+ Ongeza Duka la Jumla</button>
        </div>
      </div>

      <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💳</div>
          <div className="stat-label">Jumla ya Madeni ya Jumla</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{fmtS(totalWholesaleDebt)}</div>
          <div className="stat-sub">{wList.filter(c => c.balance > 0).length} maduka yenye deni</div>
        </div>
      </div>

      {wList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">Bado Hakuna Duka la Jumla</div>
          <div>Bofya "+ Ongeza Duka la Jumla" kuanza kufuatilia mzigo/deni la duka la kwanza.</div>
        </div>
      ) : (
        <div className="wholesale-sheets-grid">
          {wList.map(c => (
            <div key={c.id} className="wholesale-sheet-card" onClick={() => setWSelectedId(c.id)}>
              <div className="wholesale-sheet-tab">📄 {c.name}</div>
              <div className="wholesale-sheet-body">
                {c.phone && <div className="wholesale-sheet-phone">📞 {c.phone}</div>}
                <div className="wholesale-sheet-balance" style={{ color: c.balance > 0 ? '#dc2626' : '#16a34a' }}>
                  {c.balance > 0 ? `Deni: ${fmtS(c.balance)}` : '✅ Hakuna Deni'}
                </div>
                <div className="wholesale-sheet-meta">{c.transactionCount} miamala {c.lastActivity ? `· mwisho ${c.lastActivity}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WholesaleCustomerModal
        open={customerModalOpen} mode={customerModalMode} initial={editingCustomer}
        onClose={() => setCustomerModalOpen(false)} onSubmit={handleCustomerSubmit}
      />
    </div>
  );
}
