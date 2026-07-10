import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// mode: 'add' | 'edit'
// Kwenye 'edit', Owner (pekee) anaweza pia "Set New Password" kwa
// Manager/Salesperson. Haiwezekani "kuona" password ya sasa (imefichwa
// milele kwa hashing - hii ni kanuni ya usalama ya mifumo yote), hivyo
// tunatoa uwezo wa kuweka password MPYA badala yake.
export default function StaffFormModal({ open, mode, initial, onClose, onSubmit }) {
  const { locations, resetStaffPassword } = useData();
  const { isOwner, currentUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'salesperson', locationId: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [showPwSection, setShowPwSection] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    setShowPwSection(false);
    setNewPw('');
    setShowPw(false);
    setPwErr('');
    if (mode === 'edit' && initial) {
      setForm({ name: initial.name, email: initial.email, password: '', role: initial.role, locationId: initial.locationId || '' });
    } else {
      setForm({ name: '', email: '', password: '', role: 'salesperson', locationId: '' });
    }
  }, [open, mode, initial, locations]);

  const handleSave = async () => {
    setErr('');
    if (mode === 'add') {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        setErr('Please fill in name, email and password');
        return;
      }
      if (form.password.length < 6) {
        setErr('Password must be at least 6 characters');
        return;
      }
    }
    if (form.role === 'salesperson' && !form.locationId) {
      setErr('Please select a location for the salesperson');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setNewPw(pw);
    setShowPw(true);
  };

  const handleSetPassword = async () => {
    setPwErr('');
    if (!newPw || newPw.length < 6) {
      setPwErr('Password must be at least 6 characters');
      return;
    }
    setPwSaving(true);
    try {
      await resetStaffPassword(initial.id, newPw);
      showToast(`✅ Password updated for ${initial.name}. Make sure to share it with them securely.`);
      setShowPwSection(false);
      setNewPw('');
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setPwSaving(false);
    }
  };

  const canChangePassword = mode === 'edit' && initial && isOwner() && initial.id !== currentUser?.id && initial.role !== 'owner';

  return (
    <Modal open={open} title={mode === 'add' ? '👥 Add Staff' : '✏️ Edit Staff'} onClose={onClose}>
      {err && <div className="form-error">{err}</div>}

      <div className="form-group">
        <label className="form-label">Full Name <span className="required">*</span></label>
        <input className="form-input" value={form.name} disabled={mode === 'edit'}
          onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Staff name" />
      </div>

      <div className="form-group">
        <label className="form-label">Email <span className="required">*</span></label>
        <input className="form-input" type="email" value={form.email} disabled={mode === 'edit'}
          onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@example.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Role <span className="required">*</span></label>
        <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="salesperson">🛒 Salesperson</option>
          <option value="manager">🏢 Manager</option>
        </select>
      </div>

      {form.role === 'salesperson' && (
        <div className="form-group">
          <label className="form-label">Location (Shop) <span className="required">*</span></label>
          <select className="form-select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.type === 'store' ? '🏪' : '🏬'} {l.name}</option>
            ))}
          </select>
        </div>
      )}

      {mode === 'add' && (
        <div className="form-group">
          <label className="form-label">Password <span className="required">*</span></label>
          <input className="form-input" type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </div>
      )}

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : mode === 'add' ? '+ Add Staff' : '💾 Save Changes'}
        </button>
      </div>

      {canChangePassword && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          {!showPwSection ? (
            <button className="btn-ghost small" style={{ color: '#7c3aed' }} onClick={() => setShowPwSection(true)}>
              🔑 Set New Password
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                For security, existing passwords can never be viewed or recovered — this
                sets a brand-new password for <strong>{initial.name}</strong>. Share it with
                them directly and securely (e.g. in person or a private message).
              </div>
              {pwErr && <div className="form-error">{pwErr}</div>}
              <div className="form-group" style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-ghost small" onClick={() => setShowPw(!showPw)}>
                  {showPw ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-ghost small" onClick={generatePassword}>🎲 Generate</button>
                <button className="btn-ghost small" onClick={() => { setShowPwSection(false); setNewPw(''); setPwErr(''); }}>Cancel</button>
                <button className="btn-primary small" onClick={handleSetPassword} disabled={pwSaving}>
                  {pwSaving ? 'Saving...' : '💾 Save New Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
