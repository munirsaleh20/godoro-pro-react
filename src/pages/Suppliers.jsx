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

// Suppliers sasa ina "Wasambazaji" (kiwanda) pekee - watu tunaowadai
// (wanatupatia mzigo kwa mkopo). Kichupo cha zamani cha "Wateja wa Jumla"
// (wholesale) kimeondolewa kabisa kwenye UI hii - hakiko tena kama sehemu
// inayosimama peke yake yenye orodha/"sheet" zake. Chaguo PEKEE lililobaki
// la wholesale ni "🚚 Nyingine — Peleka Moja kwa Moja kwa Mteja wa Jumla"
// (dropship) linalopatikana ndani ya modal ya "Pokea Mzigo Mpya" - hapo
// mtumiaji anaweza kuchagua mteja wa jumla aliyepo au kuongeza mpya papo
// hapo, bila kuhitaji ukurasa/kichupo tofauti. Database bado inatumia
// wholesale_customers / wholesale_transactions nyuma ya pazia (kwa ajili
// ya dropship na kadi ya Faida ya Jumla hapa chini), bila kubadilishwa.
export default function Suppliers() {
  const { currentUser, isManager } = useAuth();
  const {
    getLocation, suppliersWithSummary, totalSupplierDebt,
    addSupplier, updateSupplier, deleteSupplier,
    addSupplierGoods, addSupplierGoodsDropship, addSupplierPayment, deleteSupplierTransaction, getSupplierTransactions,
    wholesaleCustomersWithSummary, wholesaleTransactions,
    addWholesaleCustomer, addWholesaleGoods, addWholesalePayment,
  } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  // ============== Wasambazaji (Factories/Kiwanda) - state ==============
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierModalMode, setSupplierModalMode] = useState('add');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [goodsModalOpen, setGoodsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingGoodsTxn, setEditingGoodsTxn] = useState(null);

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Suppliers ni kwa ajili ya Owner/Manager pekee.</div>
      </div>
    );
  }

  // ================= Wasambazaji - logic =================
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
  // Wasambazaji. Kwa kila mteja wa jumla aliyewahi kupokea mzigo kwa
  // dropship, tunahesabu faida (unitPrice - buyPrice) x quantity, kisha
  // tunaionyesha kwa UWIANO wa kile ambacho mteja huyo AMESHALIPA - ili
  // tusihesabu faida ya deni ambalo bado halijalipwa. Matokeo yanajumlishwa
  // kwa wateja WOTE wa jumla kupata faida MOJA ya jumla.
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
    if (supplierModalMode === 'add') {
      const created = await addSupplier({ ...payload, createdBy: currentUser.id });
      showToast(`✅ Kiwanda "${created.name}" limeongezwa!`);
      setSelectedId(created.id);
    } else {
      await updateSupplier(editingSupplier.id, payload);
      showToast('✅ Taarifa za kiwanda zimesasishwa!');
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

      await addSupplierGoodsDropship({
        supplierId: selected.id,
        items,
        description: `${description || 'Dropship kwa mteja wa jumla'}${deliveryNote}`.trim(),
        date, recordedBy: currentUser.id,
      });

      const wholesaleItems = items.map(({ name, size, quantity, sellPrice, buyPrice }) => ({ name, size, quantity, unitPrice: sellPrice, buyPrice: buyPrice || 0, source: 'dropship' }));
      const wholesaleAmount = items.reduce((sum, it) => sum + it.quantity * (it.sellPrice || 0), 0);
      await addWholesaleGoods({
        customerId, locationId: null, items: wholesaleItems, amount: wholesaleAmount,
        description: `Dropship kutoka kiwanda "${selected.name}"${deliveryNote}`.trim(),
        date, recordedBy: currentUser.id,
      });

      if (advance > 0) {
        await addWholesalePayment({
          customerId, locationId: null, amount: advance,
          description: 'Malipo ya awali (advance) wakati wa kupokea mzigo wa dropship', date, recordedBy: currentUser.id,
        });
      }

      showToast(`✅ Mzigo wa dropship umerekodiwa: deni kwa "${selected.name}" na deni la mteja wa jumla vimeongezwa`);
      setGoodsModalOpen(false);
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

  // ================= Muonekano: "sheet" ya kiwanda moja =================
  if (selected) {
    return (
      <div>
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

        <SupplierGoodsModal open={goodsModalOpen} supplier={selected} onClose={() => setGoodsModalOpen(false)} onSubmit={handleGoodsSubmit} />
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

  // ================= Muonekano: Majedwali ya Wasambazaji =================
  return (
    <div>
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
