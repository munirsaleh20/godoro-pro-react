import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmt } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';
import ProductFormModal from '../components/ProductFormModal.jsx';
import BulkAddProductsModal from '../components/BulkAddProductsModal.jsx';

export default function Inventory() {
  const { isManager, isSalesperson, isOwner, currentUser } = useAuth();
  const { allProductsWithLocations, locations, addProduct, updateProduct, updateProductEverywhere, deleteProduct, bulkDeleteProducts, bulkAddProducts, dailyInventorySummary, inventoryLogs, deleteInventoryLog, updateInventoryLog } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [filter, setFilter] = useState('all'); // all | store | shop
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [expandedDate, setExpandedDate] = useState(null);
  const [mode, setMode] = useState('add');
  const [editing, setEditing] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [editingLogId, setEditingLogId] = useState(null);
  const [logEditForm, setLogEditForm] = useState({ qty: '', unitPrice: '' });
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [filter, search]);

  const canManage = isManager();
  const owner = isOwner();
  // Salesperson: anaona TU bidhaa za eneo lake (location_id yake), na ni
  // "view-only" - hawezi kuongeza, kuhariri wala kufuta chochote.
  const salesView = isSalesperson();

  if (!canManage && !salesView) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>You don't have permission to view Inventory.</div>
      </div>
    );
  }

  let list = salesView
    ? allProductsWithLocations.filter(p => String(p.locationId) === String(currentUser?.locationId))
    : allProductsWithLocations;

  if (canManage) {
    if (filter === 'store') list = list.filter(p => p.locationType === 'store');
    if (filter === 'shop') list = list.filter(p => p.locationType === 'shop');
  }
  if (search.trim()) {
    list = list.filter(p => matchesSearch([p.name, p.size, p.brand, p.cat, p.sell, p.buy], search));
  }

  // KIPENGELE: "Pagination" - bidhaa zikiwa nyingi, onyesha 50 kwa wakati
  // mmoja pekee, na buttons za Next/Previous kuvinjari zilizobaki -
  // badala ya kuorodhesha zote kwenye page moja ndefu.
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedList = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const baseCount = salesView ? allProductsWithLocations.filter(p => String(p.locationId) === String(currentUser?.locationId)) : allProductsWithLocations;
  const totalStock = baseCount.reduce((sum, p) => sum + p.stock, 0);
  const totalListStock = list.reduce((sum, p) => sum + p.stock, 0);

  const openAdd = () => { setMode('add'); setEditing(null); setModalOpen(true); };
  const openEdit = (p) => { setMode('edit'); setEditing(p); setModalOpen(true); };

  const handleSubmit = async (payload) => {
    if (mode === 'add') {
      const result = await addProduct(payload);
      if (result.merged) {
        showToast(`✅ "${payload.name}" already existed here — stock increased by ${result.addedQty} (value ${fmt(result.addedValue)})`);
      } else {
        showToast(`✅ Product "${payload.name}" added! (${result.addedQty} × ${fmt(payload.sell)} = ${fmt(result.addedValue)})`);
      }
      if (result.logFailed) {
        showToast('⚠️ Stock imehifadhiwa, lakini Daily Summary haikuandikwa (tatizo la mtandao) — angalia Inventory moja kwa moja.', 'error');
      }
    } else {
      const { applyPriceToAll, ...productPayload } = payload;
      const syncedCount = await updateProductEverywhere(editing.id, productPayload, applyPriceToAll);
      if (applyPriceToAll && syncedCount > 0) {
        showToast(`✅ Product "${productPayload.name}" updated! Bei imesasishwa kwenye maduka mengine ${syncedCount} pia.`);
      } else {
        showToast(`✅ Product "${productPayload.name}" updated!`);
      }
    }
    setModalOpen(false);
  };

  const handleBulkSubmit = async (locationId, rows) => {
    const summary = await bulkAddProducts(locationId, rows);
    showToast(`✅ ${rows.length} products processed (${summary.newCount} new, ${summary.mergedCount} restocked) — total value ${fmt(summary.totalValue)}`);
    if (summary.logFailedCount > 0) {
      showToast(`⚠️ Stock imehifadhiwa, lakini Daily Summary ya bidhaa ${summary.logFailedCount} haikuandikwa (tatizo la mtandao/muunganiko) — jaribu upya baadaye au angalia Inventory moja kwa moja.`, 'error');
    }
    setBulkModalOpen(false);
  };

  const handleDelete = async (p) => {
    const ok = await confirmAction(`Delete "${p.name}"?\n\nThis cannot be undone.`);
    if (!ok) return;
    try {
      await deleteProduct(p.id);
      showToast('🗑️ Product deleted');
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  // KIPENGELE: "Bulk Delete" - chagua bidhaa nyingi (checkbox) na uzifute
  // zote kwa wakati mmoja, badala ya kubofya futa moja moja.
  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  };
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id)); else next.add(String(id));
      return next;
    });
  };
  const allVisibleSelected = pagedList.length > 0 && pagedList.every(p => selectedIds.has(String(p.id)));
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        pagedList.forEach(p => next.delete(String(p.id)));
        return next;
      }
      const next = new Set(prev);
      pagedList.forEach(p => next.add(String(p.id)));
      return next;
    });
  };
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirmAction(`Delete ${ids.length} selected product${ids.length > 1 ? 's' : ''}?\n\nThis cannot be undone.`);
    if (!ok) return;
    try {
      await bulkDeleteProducts(ids);
      showToast(`🗑️ ${ids.length} product${ids.length > 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  const handleDeleteLog = async (log) => {
    const ok = await confirmAction(`Delete this log entry?\n\n"${log.name}" — ${log.qty} units on ${log.date}\n\nStock ya bidhaa husika itapunguzwa kwa ${log.qty} (haitakwenda chini ya 0). Hii haiwezi kurudishwa.`);
    if (!ok) return;
    try {
      await deleteInventoryLog(log.id);
      showToast('🗑️ Log entry deleted');
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  const startEditLog = (log) => {
    setEditingLogId(log.id);
    setLogEditForm({ qty: String(log.qty || 0), unitPrice: String(log.unitPrice || 0) });
  };
  const cancelEditLog = () => {
    setEditingLogId(null);
    setLogEditForm({ qty: '', unitPrice: '' });
  };
  const saveEditLog = async (log) => {
    const qtyNum = parseInt(logEditForm.qty, 10);
    const priceNum = parseFloat(logEditForm.unitPrice);
    if (Number.isNaN(qtyNum) || qtyNum < 0) { showToast('Weka Qty sahihi', 'error'); return; }
    if (Number.isNaN(priceNum) || priceNum < 0) { showToast('Weka Unit Price sahihi', 'error'); return; }
    try {
      await updateInventoryLog(log.id, { qty: qtyNum, unitPrice: priceNum });
      showToast('✅ Log entry updated — stock imesasishwa');
      cancelEditLog();
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">
          📦 {salesView ? 'My Store Inventory' : 'All Inventory'} ({baseCount.length} products, {totalStock} units)
        </h3>
        {canManage && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={() => setShowSummary(s => !s)}>
              {showSummary ? '📦 Hide Daily Summary' : '📅 Daily Summary'}
            </button>
            {selectMode ? (
              <>
                <button
                  className="btn-ghost small"
                  style={{ color: '#dc2626' }}
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                >
                  🗑️ Delete Selected ({selectedIds.size})
                </button>
                <button className="btn-ghost" onClick={toggleSelectMode}>Cancel</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={toggleSelectMode}>☑️ Select / Delete</button>
                <button className="btn-ghost" onClick={() => setBulkModalOpen(true)}>+ Bulk Add</button>
                <button className="btn-primary" onClick={openAdd}>+ Add Product</button>
              </>
            )}
          </div>
        )}
      </div>

      {canManage && showSummary && (
        <div className="table-container" style={{ overflowX: 'auto', marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: '0 0 12px' }}>📅 Muhtasari wa Bidhaa Zilizoongezwa kwa Siku</h3>
          {dailyInventorySummary.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <div className="empty-title">No Data Yet</div>
              <div>Ongeza bidhaa ili muhtasari uonekane hapa</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: 8 }}>Date</th>
                  <th style={{ padding: 8 }}>Store</th>
                  <th style={{ padding: 8 }}>New Products</th>
                  <th style={{ padding: 8 }}>Restocks</th>
                  <th style={{ padding: 8 }}>Units Added</th>
                  <th style={{ padding: 8 }}>Total Value (Auto)</th>
                </tr>
              </thead>
              <tbody>
                {dailyInventorySummary.map(d => {
                  const rowKey = `${d.date}|${d.locationId}`;
                  const isOpen = expandedDate === rowKey;
                  const dayLogs = isOpen ? inventoryLogs.filter(l => l.date === d.date && String(l.locationId) === String(d.locationId)) : [];
                  return (
                    <Fragment key={rowKey}>
                      <tr
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setExpandedDate(isOpen ? null : rowKey)}
                      >
                        <td style={{ padding: 8 }}>{isOpen ? '▾' : '▸'} {d.date}</td>
                        <td style={{ padding: 8 }}>{d.locationIcon} {d.locationName}</td>
                        <td style={{ padding: 8 }}>{d.newProducts}</td>
                        <td style={{ padding: 8 }}>{d.restocks}</td>
                        <td style={{ padding: 8, fontWeight: 700 }}>{d.totalUnits}</td>
                        <td style={{ padding: 8, fontWeight: 700, color: '#0d9488' }}>{fmt(d.totalValue)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, background: '#f8fafc' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                                  <th style={{ padding: '6px 8px 6px 28px' }}>Product</th>
                                  <th style={{ padding: 6 }}>Size</th>
                                  <th style={{ padding: 6 }}>Brand</th>
                                  <th style={{ padding: 6 }}>Location</th>
                                  <th style={{ padding: 6 }}>Type</th>
                                  <th style={{ padding: 6 }}>Qty</th>
                                  <th style={{ padding: 6 }}>Unit Price</th>
                                  <th style={{ padding: 6 }}>Value</th>
                                  {canManage && <th style={{ padding: 6 }}>Action</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {dayLogs.length === 0 ? (
                                  <tr><td colSpan={9} style={{ padding: '8px 8px 8px 28px', color: '#94a3b8' }}>No entries</td></tr>
                                ) : dayLogs.map(l => {
                                  const loc = locations.find(x => String(x.id) === String(l.locationId));
                                  const isEditing = editingLogId === l.id;
                                  return (
                                    <tr key={l.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: '6px 8px 6px 28px', fontWeight: 600 }}>{l.name}</td>
                                      <td style={{ padding: 6 }}>{l.size || 'N/A'}</td>
                                      <td style={{ padding: 6 }}>{l.brand || 'N/A'}</td>
                                      <td style={{ padding: 6 }}>{loc ? `${loc.type === 'store' ? '🏪' : '🏬'} ${loc.name}` : 'Unknown'}</td>
                                      <td style={{ padding: 6 }}>
                                        <span className="badge" style={l.isNewProduct
                                          ? { background: 'rgba(37,99,235,0.1)', color: '#2563eb' }
                                          : { background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                                          {l.isNewProduct ? 'New' : 'Restock'}
                                        </span>
                                      </td>
                                      {isEditing ? (
                                        <>
                                          <td style={{ padding: 6 }}>
                                            <input
                                              type="number" className="form-input" style={{ width: 70, padding: 4 }}
                                              value={logEditForm.qty}
                                              onChange={(e) => setLogEditForm(f => ({ ...f, qty: e.target.value }))}
                                            />
                                          </td>
                                          <td style={{ padding: 6 }}>
                                            <input
                                              type="number" className="form-input" style={{ width: 90, padding: 4 }}
                                              value={logEditForm.unitPrice}
                                              onChange={(e) => setLogEditForm(f => ({ ...f, unitPrice: e.target.value }))}
                                            />
                                          </td>
                                          <td style={{ padding: 6, fontWeight: 700, color: '#0d9488' }}>
                                            {fmt((parseInt(logEditForm.qty, 10) || 0) * (parseFloat(logEditForm.unitPrice) || 0))}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td style={{ padding: 6, fontWeight: 700 }}>{l.qty}</td>
                                          <td style={{ padding: 6 }}>{fmt(l.unitPrice)}</td>
                                          <td style={{ padding: 6, fontWeight: 700, color: '#0d9488' }}>{fmt(l.totalValue)}</td>
                                        </>
                                      )}
                                      {canManage && (
                                        <td style={{ padding: 6, whiteSpace: 'nowrap' }}>
                                          {isEditing ? (
                                            <>
                                              <button className="btn-ghost small" style={{ color: '#16a34a' }} onClick={() => saveEditLog(l)}>💾</button>
                                              <button className="btn-ghost small" onClick={cancelEditLog}>✖️</button>
                                            </>
                                          ) : (
                                            <>
                                              <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => startEditLog(l)}>✏️</button>
                                              <button className="btn-ghost small" style={{ color: '#dc2626', marginLeft: 4 }} onClick={() => handleDeleteLog(l)}>🗑️</button>
                                            </>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {canManage && ['all', 'store', 'shop'].map(f => (
          <button
            key={f}
            className="btn-ghost small"
            style={filter === f ? { background: '#e07b2a', color: '#fff', borderColor: '#e07b2a' } : {}}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'store' ? '🏪 Stores' : '🏬 Shops'}
          </button>
        ))}
        <input
          className="form-input"
          style={{ maxWidth: 240 }}
          placeholder="Search by name, size, brand, or price..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: '#64748b' }}>{list.length} products</span>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No Products Found</div>
            <div>Try changing your filter or search term</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                {canManage && selectMode && (
                  <th style={{ padding: 8 }}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
                  </th>
                )}
                <th style={{ padding: 8 }}>Product</th>
                <th style={{ padding: 8 }}>Size</th>
                <th style={{ padding: 8 }}>Brand</th>
                <th style={{ padding: 8 }}>Category</th>
                {canManage && <th style={{ padding: 8 }}>Location</th>}
                {canManage && <th style={{ padding: 8 }}>Type</th>}
                {owner && <th style={{ padding: 8 }}>Buy Price</th>}
                <th style={{ padding: 8 }}>Sell Price</th>
                <th style={{ padding: 8 }}>Stock</th>
                {canManage && <th style={{ padding: 8 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {pagedList.map(p => {
                const stockColor = p.stock < 5 ? '#dc2626' : p.stock < 10 ? '#e07b2a' : '#16a34a';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {canManage && selectMode && (
                      <td style={{ padding: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(p.id))}
                          onChange={() => toggleSelectOne(p.id)}
                        />
                      </td>
                    )}
                    <td style={{ padding: 8, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>{p.size || 'N/A'}</td>
                    <td style={{ padding: 8 }}>{p.brand || 'N/A'}</td>
                    <td style={{ padding: 8 }}><span className="badge">{p.cat || 'N/A'}</span></td>
                    {canManage && <td style={{ padding: 8 }}>{p.locationIcon} {p.locationName}</td>}
                    {canManage && <td style={{ padding: 8 }}>{p.locationLabel}</td>}
                    {owner && <td style={{ padding: 8 }}>{fmt(p.buy || 0)}</td>}
                    <td style={{ padding: 8, color: '#e07b2a', fontWeight: 700 }}>{fmt(p.sell || 0)}</td>
                    <td style={{ padding: 8, color: stockColor, fontWeight: 700 }}>{p.stock || 0}</td>
                    {canManage && (
                      <td style={{ padding: 8 }}>
                        <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn-ghost small" style={{ color: '#dc2626', marginLeft: 4 }} onClick={() => handleDelete(p)}>🗑️</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1a1a2e', background: '#f8fafc' }}>
                <td colSpan={canManage ? (7 + (selectMode ? 1 : 0) + (owner ? 1 : 0)) : 5} style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>Total Stock (shown):</td>
                <td style={{ padding: 8, fontWeight: 900, color: '#0d9488' }}>{totalListStock} units</td>
                {canManage && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {list.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '14px 0' }}>
          <button className="btn-ghost" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>⬅️ Previous</button>
          <span style={{ fontSize: 13, color: '#64748b' }}>Page {safePage} of {totalPages} ({list.length} products)</span>
          <button className="btn-ghost" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next ➡️</button>
        </div>
      )}

      {canManage && (
        <ProductFormModal
          open={modalOpen}
          mode={mode}
          initial={editing}
          locationOptions={locations}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      {canManage && (
        <BulkAddProductsModal
          open={bulkModalOpen}
          locationOptions={locations}
          onClose={() => setBulkModalOpen(false)}
          onSubmit={handleBulkSubmit}
        />
      )}
    </div>
  );
}
