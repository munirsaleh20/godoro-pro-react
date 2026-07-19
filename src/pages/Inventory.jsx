import { useState, Fragment } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmt } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';
import ProductFormModal from '../components/ProductFormModal.jsx';
import BulkAddProductsModal from '../components/BulkAddProductsModal.jsx';

export default function Inventory() {
  const { isManager, isSalesperson, currentUser } = useAuth();
  const { allProductsWithLocations, locations, addProduct, updateProduct, deleteProduct, bulkAddProducts, dailyInventorySummary, inventoryLogs } = useData();
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

  const canManage = isManager();
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
    } else {
      await updateProduct(editing.id, payload);
      showToast(`✅ Product "${payload.name}" updated!`);
    }
    setModalOpen(false);
  };

  const handleBulkSubmit = async (locationId, rows) => {
    const summary = await bulkAddProducts(locationId, rows);
    showToast(`✅ ${rows.length} products processed (${summary.newCount} new, ${summary.mergedCount} restocked) — total value ${fmt(summary.totalValue)}`);
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

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">
          📦 {salesView ? 'My Store Inventory' : 'All Inventory'} ({baseCount.length} products, {totalStock} units)
        </h3>
        {canManage && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => setShowSummary(s => !s)}>
              {showSummary ? '📦 Hide Daily Summary' : '📅 Daily Summary'}
            </button>
            <button className="btn-ghost" onClick={() => setBulkModalOpen(true)}>+ Bulk Add</button>
            <button className="btn-primary" onClick={openAdd}>+ Add Product</button>
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
                  <th style={{ padding: 8 }}>New Products</th>
                  <th style={{ padding: 8 }}>Restocks</th>
                  <th style={{ padding: 8 }}>Units Added</th>
                  <th style={{ padding: 8 }}>Total Value (Auto)</th>
                </tr>
              </thead>
              <tbody>
                {dailyInventorySummary.map(d => {
                  const isOpen = expandedDate === d.date;
                  const dayLogs = isOpen ? inventoryLogs.filter(l => l.date === d.date) : [];
                  return (
                    <Fragment key={d.date}>
                      <tr
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setExpandedDate(isOpen ? null : d.date)}
                      >
                        <td style={{ padding: 8 }}>{isOpen ? '▾' : '▸'} {d.date}</td>
                        <td style={{ padding: 8 }}>{d.newProducts}</td>
                        <td style={{ padding: 8 }}>{d.restocks}</td>
                        <td style={{ padding: 8, fontWeight: 700 }}>{d.totalUnits}</td>
                        <td style={{ padding: 8, fontWeight: 700, color: '#0d9488' }}>{fmt(d.totalValue)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0, background: '#f8fafc' }}>
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
                                </tr>
                              </thead>
                              <tbody>
                                {dayLogs.length === 0 ? (
                                  <tr><td colSpan={8} style={{ padding: '8px 8px 8px 28px', color: '#94a3b8' }}>No entries</td></tr>
                                ) : dayLogs.map(l => {
                                  const loc = locations.find(x => String(x.id) === String(l.locationId));
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
                                      <td style={{ padding: 6, fontWeight: 700 }}>{l.qty}</td>
                                      <td style={{ padding: 6 }}>{fmt(l.unitPrice)}</td>
                                      <td style={{ padding: 6, fontWeight: 700, color: '#0d9488' }}>{fmt(l.totalValue)}</td>
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
                <th style={{ padding: 8 }}>Product</th>
                <th style={{ padding: 8 }}>Size</th>
                <th style={{ padding: 8 }}>Brand</th>
                <th style={{ padding: 8 }}>Category</th>
                {canManage && <th style={{ padding: 8 }}>Location</th>}
                {canManage && <th style={{ padding: 8 }}>Type</th>}
                {canManage && <th style={{ padding: 8 }}>Buy Price</th>}
                <th style={{ padding: 8 }}>Sell Price</th>
                <th style={{ padding: 8 }}>Stock</th>
                {canManage && <th style={{ padding: 8 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const stockColor = p.stock < 5 ? '#dc2626' : p.stock < 10 ? '#e07b2a' : '#16a34a';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>{p.size || 'N/A'}</td>
                    <td style={{ padding: 8 }}>{p.brand || 'N/A'}</td>
                    <td style={{ padding: 8 }}><span className="badge">{p.cat || 'N/A'}</span></td>
                    {canManage && <td style={{ padding: 8 }}>{p.locationIcon} {p.locationName}</td>}
                    {canManage && <td style={{ padding: 8 }}>{p.locationLabel}</td>}
                    {canManage && <td style={{ padding: 8 }}>{fmt(p.buy || 0)}</td>}
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
                <td colSpan={canManage ? 8 : 5} style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>Total Stock (shown):</td>
                <td style={{ padding: 8, fontWeight: 900, color: '#0d9488' }}>{totalListStock} units</td>
                {canManage && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

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
