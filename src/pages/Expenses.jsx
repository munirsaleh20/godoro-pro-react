import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { fmtS } from '../utils/format.js';
import ExpenseFormModal from '../components/ExpenseFormModal.jsx';

export default function Expenses() {
  const { currentUser, isManager } = useAuth();
  const { allExpensesWithLocations, getExpenses, getLocation, totalAllExpenses, locations, addExpense, updateExpense, deleteExpense } = useData();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [editing, setEditing] = useState(null);

  const myShop = !isManager() ? getLocation(currentUser.locationId) : null;

  let list;
  if (isManager()) {
    list = allExpensesWithLocations;
  } else if (myShop) {
    list = allExpensesWithLocations.filter(e => String(e.locationId) === String(myShop.id));
  } else {
    list = [];
  }

  const total = list.reduce((sum, e) => sum + (e.amount || 0), 0);

  const openAdd = () => { setMode('add'); setEditing(null); setModalOpen(true); };
  const openEdit = (e) => { setMode('edit'); setEditing(e); setModalOpen(true); };

  const handleSubmit = async (payload) => {
    if (mode === 'add') {
      await addExpense({ ...payload, staffId: currentUser.id });
      showToast('✅ Expense added!');
    } else {
      await updateExpense(editing.id, payload);
      showToast('✅ Expense updated!');
    }
    setModalOpen(false);
  };

  const handleDelete = async (e) => {
    const ok = await confirmAction(`Delete this expense ("${e.desc}", ${fmtS(e.amount)})?\n\nThis cannot be undone.`);
    if (!ok) return;
    try {
      await deleteExpense(e.id);
      showToast('🗑️ Expense deleted');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  };

  if (!isManager() && !myShop) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏪</div>
        <div className="empty-title">No Shop Assigned</div>
        <div>Contact your manager to assign you to a shop</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h3 className="section-title">
          💸 Expenses — {isManager() ? 'All Locations' : `Your Shop: ${myShop.name}`} · Total: {fmtS(isManager() ? totalAllExpenses : total)}
        </h3>
        {isManager() && <button className="btn-primary" onClick={openAdd}>+ Add Expense</button>}
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <div className="empty-title">No Expenses Recorded</div>
            <div>Expenses will appear here once you add them</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Date</th>
                {isManager() && <th style={{ padding: 8 }}>Location</th>}
                <th style={{ padding: 8 }}>Category</th>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8 }}>Paid To</th>
                <th style={{ padding: 8 }}>Amount</th>
                <th style={{ padding: 8 }}>Recorded By</th>
                {isManager() && <th style={{ padding: 8 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{e.date}</td>
                  {isManager() && <td style={{ padding: 8 }}>{e.locationIcon} {e.locationName}</td>}
                  <td style={{ padding: 8 }}><span className="badge">{e.cat}</span></td>
                  <td style={{ padding: 8 }}>{e.desc}</td>
                  <td style={{ padding: 8 }}>{e.to || 'N/A'}</td>
                  <td style={{ padding: 8, color: '#dc2626', fontWeight: 700 }}>{fmtS(e.amount)}</td>
                  <td style={{ padding: 8, fontSize: 12, color: '#64748b' }}>👤 {e.recordedBy || '—'}</td>
                  {isManager() && (
                    <td style={{ padding: 8 }}>
                      <button className="btn-ghost small" style={{ color: '#2563eb' }} onClick={() => openEdit(e)}>✏️</button>
                      <button className="btn-ghost small" style={{ color: '#dc2626', marginLeft: 4 }} onClick={() => handleDelete(e)}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #1a1a2e', background: '#f8fafc' }}>
                <td colSpan={isManager() ? 5 : 4} style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>Total:</td>
                <td style={{ padding: 8, fontWeight: 900, color: '#dc2626' }}>{fmtS(total)}</td>
                <td></td>
                {isManager() && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <ExpenseFormModal
        open={modalOpen}
        mode={mode}
        initial={editing}
        locationOptions={locations}
        lockedLocationId={!isManager() ? myShop?.id : null}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
