import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import StaffFormModal from '../components/StaffFormModal.jsx';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';

export default function Staff() {
  const { currentUser, isManager } = useAuth();
  const { staffWithLocations, createStaff, updateStaff, deleteStaff } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [editing, setEditing] = useState(null);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  if (!isManager()) {
    return (
      <div className="access-denied">
        <div className="icon">🔒</div>
        <div className="title">Access Denied</div>
        <div>Staff management is for Owner/Manager only.</div>
      </div>
    );
  }

  const openAdd = () => { setMode('add'); setEditing(null); setModalOpen(true); };
  const openEdit = (s) => { setMode('edit'); setEditing(s); setModalOpen(true); };

  const handleSubmit = async (form) => {
    if (mode === 'add') {
      const s = await createStaff({
        name: form.name.trim(), email: form.email.trim(),
        password: form.password, role: form.role, locationId: form.locationId,
      });
      showToast(`✅ ${s.name} added as ${form.role}!`);
    } else {
      await updateStaff(editing.id, { role: form.role, locationId: form.locationId });
      showToast('✅ Staff updated!');
    }
    setModalOpen(false);
  };

  const handleDelete = async (s) => {
    const ok = await confirmAction(`Remove "${s.name}" from staff?\n\nThis will also delete their login account. This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteStaff(s.id);
      showToast('🗑️ Staff removed');
    } catch (err) {
      showToast('Failed to remove: ' + err.message, 'error');
    }
  };

  const roleIcon = (role) => (role === 'owner' ? '👑' : role === 'manager' ? '🏢' : '🛒');

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="section-title">👥 Staff ({staffWithLocations.length})</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add Staff</button>
      </div>

      <div className="manager-stores-grid">
        {staffWithLocations.map(s => (
          <div key={s.id} className="manager-store-card" style={{ cursor: 'default' }}>
            <div className="store-header">
              <div>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{roleIcon(s.role)}</div>
                <div className="store-name">{s.name}</div>
                <div className="store-location">{s.email}</div>
              </div>
              <span className="badge">{s.role}</span>
            </div>
            <div className="store-footer">
              {s.locationName ? `📍 ${s.locationName}` : s.role === 'owner' || s.role === 'manager' ? '📍 All Locations' : 'No location assigned'}
            </div>
            {s.id !== currentUser.id && s.role !== 'owner' && (
              <div className="card-actions">
                <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => openEdit(s)}>✏️ Edit</button>
                <button className="btn-ghost small" style={{ color: '#dc2626' }} onClick={() => handleDelete(s)}>🗑️ Remove</button>
              </div>
            )}
            {s.id === currentUser.id && (
              <div className="card-actions">
                <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => setPwdModalOpen(true)}>🔑 Badilisha Password Yangu</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <StaffFormModal
        open={modalOpen}
        mode={mode}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ChangePasswordModal
        open={pwdModalOpen}
        onClose={() => setPwdModalOpen(false)}
      />
    </div>
  );
}
