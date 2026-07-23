import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import Modal from '../components/Modal.jsx';
import StoreProductsModal from '../components/StoreProductsModal.jsx';
import AddSaleModal from '../components/AddSaleModal.jsx';
import BulkSaleModal from '../components/BulkSaleModal.jsx';

const EMPTY_FORM = { name: '', location: '', type: 'store', phone: '', email: '' };

export default function Locations({ type }) {
  // type: 'store' | 'shop'
  const { isManager } = useAuth();
  const { stores, shops, addLocation, updateLocation, deleteLocation, getProducts } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const list = type === 'store' ? stores : shops;
  const label = type === 'store' ? 'Stores (Warehouses)' : 'Shops (Open for Sales)';
  const icon = type === 'store' ? '🏪' : '🏬';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, type });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [viewingLocation, setViewingLocation] = useState(null);
  const [sellingLocation, setSellingLocation] = useState(null);
  const [bulkSellingLocation, setBulkSellingLocation] = useState(null);

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>This page is for Owner/Manager only.</div>
      </div>
    );
  }

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, type });
    setFormErr('');
    setModalOpen(true);
  };

  const openEdit = (loc) => {
    setEditingId(loc.id);
    setForm({ name: loc.name, location: loc.location, type: loc.type, phone: loc.phone || '', email: loc.email || '' });
    setFormErr('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      setFormErr('Name and Location are required.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      if (editingId) {
        await updateLocation(editingId, form);
        showToast('✅ Location updated!');
      } else {
        await addLocation(form);
        showToast(`✅ ${form.type === 'store' ? 'Store' : 'Shop'} added!`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loc) => {
    const ok = await confirmAction(`Delete "${loc.name}"?\n\nThis cannot be undone.`);
    if (!ok) return;
    try {
      await deleteLocation(loc.id);
      showToast('🗑️ Location deleted!');
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="section-title">{icon} {label}</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add {type === 'store' ? 'Store' : 'Shop'}</button>
      </div>

      <div className="manager-stores-grid">
        {list.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">{icon}</div>
            <div className="empty-title">No {type === 'store' ? 'Stores' : 'Shops'} Yet</div>
            <div>Click "+ Add {type === 'store' ? 'Store' : 'Shop'}" to get started</div>
          </div>
        ) : list.map(loc => (
          <div key={loc.id} className="manager-store-card" style={{ cursor: 'default' }}>
            <div className="store-header">
              <div>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                <div className="store-name">{loc.name}</div>
                <div className="store-location">📍 {loc.location}</div>
              </div>
            </div>
            <div className="store-footer">{loc.phone || 'No phone'} {loc.email ? `• ${loc.email}` : ''}</div>
            <div className="card-actions">
              <button className="btn-ghost small" style={{ color: '#e07b2a' }} onClick={() => setSellingLocation(loc)}>🛒 Sell</button>
              <button className="btn-ghost small" style={{ color: '#0d9488' }} onClick={() => setBulkSellingLocation(loc)}>📦 Bulk Sell</button>
              <button className="btn-ghost small" style={{ color: '#0d9488' }} onClick={() => setViewingLocation(loc)}>📋 View Products</button>
              <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => openEdit(loc)}>✏️ Edit</button>
              <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDelete(loc)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} title={`${icon} ${editingId ? 'Edit' : 'Add New'} ${form.type === 'store' ? 'Store' : 'Shop'}`} onClose={() => setModalOpen(false)}>
        {formErr && <div className="form-error">{formErr}</div>}
        <div className="form-group">
          <label className="form-label">Name <span className="required">*</span></label>
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Warehouse Dodoma" />
        </div>
        <div className="form-group">
          <label className="form-label">Location <span className="required">*</span></label>
          <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Dodoma" />
        </div>
        <div className="form-group">
          <label className="form-label">Type <span className="required">*</span></label>
          <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="store">🏪 Store (Warehouse)</option>
            <option value="shop">🏬 Shop (Open for Sales)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g., 0712 345 678" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="location@example.com" />
        </div>
        <div className="form-actions">
          <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : `💾 ${editingId ? 'Save Changes' : '+ Add Location'}`}
          </button>
        </div>
      </Modal>

      <StoreProductsModal
        open={!!viewingLocation}
        location={viewingLocation}
        products={viewingLocation ? getProducts(viewingLocation.id) : []}
        onClose={() => setViewingLocation(null)}
      />

      <AddSaleModal
        open={!!sellingLocation}
        lockedLocationId={sellingLocation ? sellingLocation.id : null}
        onClose={() => setSellingLocation(null)}
      />

      <BulkSaleModal
        open={!!bulkSellingLocation}
        lockedLocationId={bulkSellingLocation ? bulkSellingLocation.id : null}
        onClose={() => setBulkSellingLocation(null)}
      />
    </div>
  );
}
