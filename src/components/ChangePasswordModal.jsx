import { useState } from 'react';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ChangePasswordModal({ open, onClose }) {
  const { changePassword } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tafadhali jaza sehemu zote.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password mpya lazima iwe na herufi/tarakimu 6 au zaidi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password mpya na uthibitisho wake havifanani.');
      return;
    }

    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('✅ Password imebadilishwa kikamilifu!');
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="🔑 Badilisha Password Yangu" onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Password ya Sasa</label>
          <input
            className="form-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password Mpya</label>
          <input
            className="form-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Thibitisha Password Mpya</label>
          <input
            className="form-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Inabadilisha...' : 'Badilisha Password →'}
        </button>
      </form>
    </Modal>
  );
}
