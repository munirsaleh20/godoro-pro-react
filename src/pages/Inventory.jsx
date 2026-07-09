import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmt } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';
import ProductFormModal from '../components/ProductFormModal.jsx';

export default function Inventory() {
  const { isOwner, isManager } = useAuth();
  const { allProductsWithLocations, locations, addProduct, updateProduct, deleteProduct } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [filter, setFilter] = useState('all'); // all | store | shop
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [editing, setEditing] = useState(null);

  let list = allProductsWithLocations;
  if (filter === 'store') list = list.filter(p => p.locationType === 'store');
  if (filter === 'shop') list = list.filter(p => p.locationType === 'shop');
  if (search.trim()) {
    list = list.filter(p => matchesSearch([p.name, p.size, p.brand, p.cat], search));
  }

  const totalStock = allProductsWithLocations.reduce((sum, p) => sum + p.stock, 0);
  const totalListStock = list.reduce((sum, p) => sum + p.stock, 0);

  const openAdd = () => { setMode('add'); setEditing(null); setModalOpen(true); };
  const openEdit = (p) => { setMode('edit'); setEditing(p); setModalOpen(true); };

  const handleSubmit = async (payload) => {
    if (mode === 'add') {
      await addProduct(payload);
      showToast(`✅ Product "${payload.name}" added!`);
    } else {
      await updateProduct(editing.id, payload);
      showToast(`✅ Product "${payload.name}" updated!`);
    }
    setModalOpen(false);
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

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Inventory is for Owner/Manager only.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">📦 All Inventory ({allProductsWithLocations.length} products, {totalStock} units)</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {['all', 'store', 'shop'].map(f => (
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
          placeholder="Search by name, brand, category..."
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
                <th style={{ padding: 8 }}>Location</th>
                <th style={{ padding: 8 }}>Type</th>
                {isOwner() && <th style={{ padding: 8 }}>Buy Price</th>}
                <th style={{ padding: 8 }}>Sell Price</th>
                <th style={{ padding: 8 }}>Stock</th>
                <th style={{ padding: 8 }}>Action</th>
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
                    <td style={{ padding: 8 }}>{p.locationIcon} {p.locationName}</td>
                    <td style={{ padding: 8 }}>{p.locationLabel}</td>
                    {isOwner() && <td style={{ padding: 8 }}>{fmt(p.buy || 0)}</td>}
                    <td style={{ padding: 8, color: '#e07b2a', fontWeight: 700 }}>{fmt(p.sell || 0)}</td>
                    <td style={{ padding: 8, color: stockColor, fontWeight: 700 }}>{p.stock || 0}</td>
                    <td style={{ padding: 8 }}>
                      <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn-ghost small" style={{ color: '#dc2626', marginLeft: 4 }} onClick={() => handleDelete(p)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1a1a2e', background: '#f8fafc' }}>
                <td colSpan={isOwner() ? 8 : 7} style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>Total Stock (shown):</td>
                <td style={{ padding: 8, fontWeight: 900, color: '#0d9488' }}>{totalListStock} units</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        mode={mode}
        initial={editing}
        locationOptions={locations}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
