import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fmt } from '../utils/format.js';

// Inaonyesha bidhaa (godoro) zote zilizopo kwenye duka/store moja: jina,
// size, brand, category, na idadi (stock). Ina vitufe vya "Print" (inafungua
// dirisha jipya tayari kwa kuchapisha - unaweza "Save as PDF" ambayo inafunguka
// vizuri kwenye Word) na "Export CSV" (inafunguka moja kwa moja kwenye Excel).
export default function StoreProductsModal({ open, location, products, onClose }) {
  const { isManager } = useAuth();

  if (!open || !location) return null;

  const list = products || [];
  const totalStock = list.reduce((sum, p) => sum + (p.stock || 0), 0);

  const handlePrint = () => {
    // KIPENGELE: Kuprint - ondoa Buy Price (ni siri ya biashara, isionekane
    // kwenye karatasi inayoweza kuonekana na mteja) na ondoa bidhaa zenye
    // stock 0 (hazina maana kuonyeshwa kwenye ripoti ya nini kipo dukani).
    // Hii ni kwenye PRINT TU - modal, CSV export, na ukurasa wa Inventory
    // havibadiliki, bado vinaonyesha Buy Price na bidhaa za stock 0.
    const printList = list.filter(p => (p.stock || 0) > 0);
    const printTotalStock = printList.reduce((sum, p) => sum + (p.stock || 0), 0);

    const rows = printList.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.size || '-')}</td>
        <td>${escapeHtml(p.brand || '-')}</td>
        <td>${escapeHtml(p.cat || '-')}</td>
        <td>${fmt(p.sell || 0)}</td>
        <td>${p.stock || 0}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>${escapeHtml(location.name)} - Bidhaa (Products)</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
            h1 { font-size: 20px; margin-bottom: 2px; }
            .sub { color: #64748b; font-size: 13px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; }
            tfoot td { font-weight: 700; background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>🛏️ ${escapeHtml(location.name)}</h1>
          <div class="sub">${escapeHtml(location.location || '')} — Products list printed on ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>Product</th><th>Size</th><th>Brand</th><th>Category</th>
                <th>Sell Price</th><th>Stock</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;">Total Stock:</td>
                <td>${printTotalStock}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleExportCsv = () => {
    const headers = ['Product', 'Size', 'Brand', 'Category', ...(isManager() ? ['Buy Price'] : []), 'Sell Price', 'Stock'];
    const lines = [headers.join(',')];
    list.forEach(p => {
      const row = [
        csvSafe(p.name), csvSafe(p.size || ''), csvSafe(p.brand || ''), csvSafe(p.cat || ''),
        ...(isManager() ? [p.buy || 0] : []),
        p.sell || 0, p.stock || 0,
      ];
      lines.push(row.join(','));
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${location.name.replace(/\s+/g, '_')}_bidhaa.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} title={`📋 ${location.name} — Bidhaa (Products)`} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>{list.length} products · {totalStock} units in stock</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost small" onClick={handlePrint}>🖨️ Print</button>
          <button className="btn-ghost small" onClick={handleExportCsv}>📊 Export to Excel (CSV)</button>
        </div>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No Products Yet</div>
            <div>This location has no products in stock yet.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 8 }}>Product</th>
                <th style={{ padding: 8 }}>Size</th>
                <th style={{ padding: 8 }}>Brand</th>
                <th style={{ padding: 8 }}>Category</th>
                {isManager() && <th style={{ padding: 8 }}>Buy Price</th>}
                <th style={{ padding: 8 }}>Sell Price</th>
                <th style={{ padding: 8 }}>Stock</th>
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
                    {isManager() && <td style={{ padding: 8 }}>{fmt(p.buy || 0)}</td>}
                    <td style={{ padding: 8, color: '#e07b2a', fontWeight: 700 }}>{fmt(p.sell || 0)}</td>
                    <td style={{ padding: 8, color: stockColor, fontWeight: 700 }}>{p.stock || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="form-actions">
        <button className="btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function csvSafe(str) {
  const s = String(str ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
