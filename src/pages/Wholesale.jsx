import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';
import WholesaleCustomerModal from '../components/WholesaleCustomerModal.jsx';
import WholesaleGoodsModal from '../components/WholesaleGoodsModal.jsx';
import WholesalePaymentModal from '../components/WholesalePaymentModal.jsx';

export default function Wholesale() {
  const { currentUser, isManager } = useAuth();
  const {
    locations, wholesaleCustomersWithSummary, totalWholesaleDebt,
    addWholesaleCustomer, updateWholesaleCustomer, deleteWholesaleCustomer,
    addWholesaleGoods, addWholesalePayment, deleteWholesaleTransaction, getWholesaleTransactions,
  } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null); // "sheet" iliyofunguliwa
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState('add');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [goodsModalOpen, setGoodsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Wholesale ni kwa ajili ya Owner/Manager pekee.</div>
      </div>
    );
  }

  let list = wholesaleCustomersWithSummary;

  if (search.trim()) {
    list = list.filter(c => matchesSearch([c.name, c.phone, c.address], search));
  }

  const selected = list.find(c => String(c.id) === String(selectedId))
    || wholesaleCustomersWithSummary.find(c => String(c.id) === String(selectedId));

  const ledger = useMemo(() => {
    if (!selected) return [];
    let running = 0;
    return getWholesaleTransactions(selected.id).map(t => {
      running += t.type === 'goods' ? t.amount : -t.amount;
      return { ...t, runningBalance: running };
    });
  }, [selected, getWholesaleTransactions]);

  const totalGoods = ledger.filter(t => t.type === 'goods').reduce((s, t) => s + t.amount, 0);
  const totalPaid = ledger.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

  const openAddCustomer = () => { setCustomerModalMode('add'); setEditingCustomer(null); setCustomerModalOpen(true); };
  const openEditCustomer = (c) => { setCustomerModalMode('edit'); setEditingCustomer(c); setCustomerModalOpen(true); };

  const handleCustomerSubmit = async (payload) => {
    if (customerModalMode === 'add') {
      const created = await addWholesaleCustomer({ ...payload, createdBy: currentUser.id });
      showToast(`✅ Duka "${created.name}" limeongezwa!`);
      setSelectedId(created.id);
    } else {
      await updateWholesaleCustomer(editingCustomer.id, payload);
      showToast('✅ Taarifa za duka zimesasishwa!');
    }
    setCustomerModalOpen(false);
  };

  const handleDeleteCustomer = async (c) => {
    const ok = await confirmAction(`Futa duka "${c.name}" pamoja na historia yake YOTE ya mizigo na malipo?\n\nHatua hii haiwezi kutenguliwa.`);
    if (!ok) return;
    try {
      await deleteWholesaleCustomer(c.id);
      showToast('🗑️ Duka limefutwa');
      if (String(selectedId) === String(c.id)) setSelectedId(null);
    } catch (err) {
      showToast('Imeshindikana: ' + err.message, 'error');
    }
  };

  const handleGoodsSubmit = async ({ items, amount, description, date, advance }) => {
    await addWholesaleGoods({
      customerId: selected.id, locationId: selected.locationId, items, amount, description, date, recordedBy: currentUser.id,
    });
    let msg = `✅ Mzigo wa ${fmtS(amount)} umerekodiwa kwa "${selected.name}"`;
    if (advance > 0) {
      await addWholesalePayment({
        customerId: selected.id, locationId: selected.locationId, amount: advance,
        description: 'Malipo ya awali (advance) wakati wa kutoa mzigo', date, recordedBy: currentUser.id,
      });
      msg += ` · Malipo ya awali ${fmtS(advance)} yamerekodiwa`;
    }
    showToast(msg);
    setGoodsModalOpen(false);
  };

  const handlePaymentSubmit = async ({ amount, description, date }) => {
    await addWholesalePayment({
      customerId: selected.id, locationId: selected.locationId, amount, description, date, recordedBy: currentUser.id,
    });
    showToast(`✅ Malipo ya ${fmtS(amount)} yamerekodiwa`);
    setPaymentModalOpen(false);
  };

  const handleDeleteTxn = async (t) => {
    const ok = await confirmAction(`Futa mstari huu (${t.type === 'goods' ? 'Mzigo' : 'Malipo'} — ${fmtS(t.amount)})?`);
    if (!ok) return;
    try {
      await deleteWholesaleTransaction(t.id);
      showToast('🗑️ Mstari umefutwa');
    } catch (err) {
      showToast('Imeshindikana: ' + err.message, 'error');
    }
  };

  // ---------------- Muonekano wa "sheet" moja (details za duka husika) ----------------
  if (selected) {
    return (
      <div>
        <button className="btn-ghost small" style={{ marginBottom: 14 }} onClick={() => setSelectedId(null)}>
          ◀ Rudi kwenye Majedwali
        </button>

        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 2 }}>📊 {selected.name}</h3>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {selected.phone ? `📞 ${selected.phone}` : ''} {selected.address ? `· 📍 ${selected.address}` : ''} · {selected.locationIcon} {selected.locationName}
            </div>
          </div>
          {isManager() && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-ghost small" onClick={() => openEditCustomer(selected)}>✏️ Hariri</button>
              <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDeleteCustomer(selected)}>🗑️ Futa Duka</button>
            </div>
          )}
        </div>

        <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#e07b2a' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(224,123,42,0.1)' }}>📦</div>
            <div className="stat-label">Jumla ya Mizigo</div>
            <div className="stat-value">{fmtS(totalGoods)}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#16a34a' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)' }}>💰</div>
            <div className="stat-label">Jumla Iliyolipwa</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{fmtS(totalPaid)}</div>
          </div>
          <div className="manager-stat-card">
            <div className="bg-circle" style={{ background: '#dc2626' }}></div>
            <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.1)' }}>💳</div>
            <div className="stat-label">Deni Linalobaki</div>
            <div className="stat-value" style={{ color: selected.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmtS(Math.max(0, selected.balance))}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setGoodsModalOpen(true)}>📦 Toa Mzigo Mpya (Mkopo)</button>
          <button className="btn-ghost" onClick={() => setPaymentModalOpen(true)}>💰 Rekodi Malipo</button>
        </div>

        <div className="table-container excel-sheet" style={{ overflowX: 'auto' }}>
          {ledger.length === 0 ? (
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
                  {isManager() && <th style={{ textAlign: 'center' }}>—</th>}
                </tr>
              </thead>
              <tbody>
                {ledger.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>
                      {t.type === 'goods' && t.items ? t.items.map(it => `${it.name} (${it.quantity})`).join(', ') : (t.description || (t.type === 'goods' ? 'Mzigo' : 'Malipo'))}
                    </td>
                    <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: t.type === 'goods' ? 700 : 400 }}>
                      {t.type === 'goods' ? fmtS(t.amount) : ''}
                    </td>
                    <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: t.type === 'payment' ? 700 : 400 }}>
                      {t.type === 'payment' ? fmtS(t.amount) : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtS(t.runningBalance)}</td>
                    {isManager() && (
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDeleteTxn(t)}>🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <WholesaleGoodsModal open={goodsModalOpen} customer={selected} onClose={() => setGoodsModalOpen(false)} onSubmit={handleGoodsSubmit} />
        <WholesalePaymentModal open={paymentModalOpen} customer={selected} onClose={() => setPaymentModalOpen(false)} onSubmit={handlePaymentSubmit} />
        <WholesaleCustomerModal
          open={customerModalOpen} mode={customerModalMode} initial={editingCustomer}
          locationOptions={locations}
          onClose={() => setCustomerModalOpen(false)} onSubmit={handleCustomerSubmit}
        />
      </div>
    );
  }

  // ---------------- Muonekano wa Majedwali (Excel workbook tabs) ----------------
  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">📊 Wholesale ({list.length})</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="form-input" style={{ maxWidth: 220 }}
            placeholder="Tafuta duka..." value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={openAddCustomer}>+ Ongeza Duka la Jumla</button>
        </div>
      </div>

      <div className="manager-stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <div className="manager-stat-card">
          <div className="bg-circle" style={{ background: '#dc2626' }}></div>
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.08)' }}>💳</div>
          <div className="stat-label">Jumla ya Madeni ya Jumla {isManager() ? '' : '(Duka Lako)'}</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {fmtS(isManager() ? totalWholesaleDebt : list.reduce((s, c) => s + Math.max(0, c.balance), 0))}
          </div>
          <div className="stat-sub">{list.filter(c => c.balance > 0).length} maduka yenye deni</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">Bado Hakuna Duka la Jumla</div>
          <div>Bofya "+ Ongeza Duka la Jumla" kuanza kufuatilia mzigo/deni la duka la kwanza.</div>
        </div>
      ) : (
        <div className="wholesale-sheets-grid">
          {list.map(c => (
            <div key={c.id} className="wholesale-sheet-card" onClick={() => setSelectedId(c.id)}>
              <div className="wholesale-sheet-tab">📄 {c.name}</div>
              <div className="wholesale-sheet-body">
                {isManager() && <div className="wholesale-sheet-loc">{c.locationIcon} {c.locationName}</div>}
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
        locationOptions={locations}
        onClose={() => setCustomerModalOpen(false)} onSubmit={handleCustomerSubmit}
      />
    </div>
  );
}
