import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fmt } from '../utils/format.js';

// KIPENGELE: "Mizigo ya Supplier" - TOFAUTI na Daily Summary (ile
// inaunganisha bidhaa zote za SIKU MOJA + DUKA MOJA pamoja). Hapa kila
// MZIGO (kila "Pokea Mzigo Mpya" uliowasilishwa) unaonekana KAMA
// ULIVYOWASILISHWA - mzigo mmoja mmoja, ukionyesha ni kiwanda (Supplier)
// gani, unaenda wapi (duka/store au Dropship kwa mteja wa jumla), na
// bidhaa zilizopokelewa (Jina, Size, Brand, Qty, Buy Price, Sell/Unit
// Price). Hii inaruhusu kulinganisha bei ya mzigo mpya dhidi ya mzigo
// uliopita wa bidhaa hiyo hiyo - kila bidhaa inaonyesha bei ya mzigo
// ULIOTANGULIA (wa mzigo wowote, kiwanda chochote) na tofauti (⬆️/⬇️).
export default function SupplierShipmentsSummary() {
  const { isOwner } = useAuth();
  const owner = isOwner();
  const { supplierTransactions, suppliers, locations, wholesaleTransactions, wholesaleCustomers } = useData();
  const [expandedId, setExpandedId] = useState(null);
  const [supplierFilter, setSupplierFilter] = useState('all');

  const shipments = useMemo(() => (
    supplierTransactions
      .filter(t => t.type === 'stock_in' && Array.isArray(t.items) && t.items.length > 0)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  ), [supplierTransactions]);

  const filteredShipments = supplierFilter === 'all'
    ? shipments
    : shipments.filter(s => String(s.supplierId) === String(supplierFilter));

  // Kwa kila bidhaa (jina+size), tunatunza orodha ya BEI ZOTE za mizigo
  // iliyopita (kwa mfuatano wa tarehe), ili tuweze kuonyesha "bei ya
  // mzigo uliotangulia" kwa bidhaa hiyo hiyo kwenye mzigo wa SASA.
  const priceHistory = useMemo(() => {
    const chronological = [...shipments].sort((a, b) => (
      (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')
    ));
    const map = new Map(); // key: name|size -> [{ buyPrice, date, txnId }]
    chronological.forEach(t => {
      t.items.forEach(it => {
        const key = `${(it.name || '').trim().toLowerCase()}|${(it.size || '').trim().toLowerCase()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ buyPrice: it.buyPrice || 0, date: t.date, txnId: t.id });
      });
    });
    return map;
  }, [shipments]);

  const getPreviousBuyPrice = (txnId, name, size) => {
    const key = `${(name || '').trim().toLowerCase()}|${(size || '').trim().toLowerCase()}`;
    const history = priceHistory.get(key) || [];
    const idx = history.findIndex(h => String(h.txnId) === String(txnId));
    if (idx <= 0) return null; // hakuna mzigo uliotangulia wa bidhaa hii
    return history[idx - 1].buyPrice;
  };

  const resolveDestination = (txn) => {
    if (txn.locationId) {
      const loc = locations.find(l => String(l.id) === String(txn.locationId));
      return loc ? `${loc.type === 'store' ? '🏪' : '🏬'} ${loc.name}` : 'Duka lisilojulikana';
    }
    if (txn.dropshipGroupId) {
      const wt = wholesaleTransactions.find(w => w.dropshipGroupId === txn.dropshipGroupId && w.type === 'goods');
      const cust = wt ? wholesaleCustomers.find(c => String(c.id) === String(wt.customerId)) : null;
      return `🚚 Dropship${cust ? ` → ${cust.name}` : ' (mteja wa jumla)'}`;
    }
    return '—';
  };

  const handlePrint = (txn, supplierName, destination) => {
    const rows = txn.items.map(it => {
      const prev = owner ? getPreviousBuyPrice(txn.id, it.name, it.size) : null;
      const diffHtml = prev == null ? '' : (
        it.buyPrice > prev ? ` <span style="color:#dc2626;">(⬆️ +${fmt(it.buyPrice - prev)})</span>`
        : it.buyPrice < prev ? ` <span style="color:#16a34a;">(⬇️ -${fmt(prev - it.buyPrice)})</span>`
        : ' <span style="color:#64748b;">(sawa)</span>'
      );
      return `
        <tr>
          <td>${escapeHtml(it.name)}</td>
          <td>${escapeHtml(it.size || '-')}</td>
          <td>${escapeHtml(it.brand || '-')}</td>
          <td>${it.quantity || 0}</td>
          ${owner ? `<td>${fmt(it.buyPrice || 0)}${diffHtml}</td>` : ''}
          <td>${fmt(it.sellPrice || 0)}</td>
          <td>${fmt((it.quantity || 0) * (owner ? (it.buyPrice || 0) : (it.sellPrice || 0)))}</td>
        </tr>
      `;
    }).join('');
    const total = txn.items.reduce((sum, it) => sum + (it.quantity || 0) * (owner ? (it.buyPrice || 0) : (it.sellPrice || 0)), 0);

    const html = `
      <html>
        <head>
          <title>Mzigo - ${escapeHtml(supplierName)} - ${escapeHtml(txn.date)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
            h1 { font-size: 20px; margin-bottom: 2px; }
            .sub { color: #64748b; font-size: 13px; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; }
            tfoot td { font-weight: 700; background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>📦 Mzigo kutoka: ${escapeHtml(supplierName)}</h1>
          <div class="sub">Tarehe: ${escapeHtml(txn.date)} — Kwenda: ${escapeHtml(destination.replace(/^[^\s]+\s/, ''))}</div>
          ${txn.description ? `<div class="sub">${escapeHtml(txn.description)}</div>` : ''}
          <table>
            <thead>
              <tr>
                <th>Bidhaa</th><th>Size</th><th>Brand</th><th>Qty</th>
                ${owner ? '<th>Buy Price</th>' : ''}<th>Sell/Unit Price</th><th>Thamani</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr><td colspan="${owner ? 6 : 5}" style="text-align:right;">Jumla:</td><td>${fmt(total)}</td></tr>
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

  return (
    <div className="table-container" style={{ overflowX: 'auto', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <h3 className="section-title" style={{ margin: 0 }}>🚚 Mizigo kwa Kila Supplier (Shipment kwa Shipment)</h3>
        <select className="form-select" style={{ maxWidth: 220 }} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
          <option value="all">Wasambazaji Wote (All Suppliers)</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filteredShipments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚚</div>
          <div className="empty-title">Hakuna Mzigo Bado</div>
          <div>Mizigo utakayopokea kutoka kwa Suppliers itaonekana hapa, mmoja mmoja.</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Tarehe</th>
              <th style={{ padding: 8 }}>Kiwanda (Supplier)</th>
              <th style={{ padding: 8 }}>Kwenda</th>
              <th style={{ padding: 8 }}>Bidhaa</th>
              <th style={{ padding: 8 }}>{owner ? 'Jumla Thamani (Buy)' : 'Jumla Thamani (Sell)'}</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map(txn => {
              const supplierName = suppliers.find(s => String(s.id) === String(txn.supplierId))?.name || 'Haijulikani';
              const destination = resolveDestination(txn);
              const isOpen = expandedId === txn.id;
              const totalValue = owner
                ? txn.items.reduce((sum, it) => sum + (it.quantity || 0) * (it.buyPrice || 0), 0)
                : txn.items.reduce((sum, it) => sum + (it.quantity || 0) * (it.sellPrice || 0), 0);
              return (
                <FragmentRow
                  key={txn.id}
                  txn={txn}
                  supplierName={supplierName}
                  destination={destination}
                  isOpen={isOpen}
                  totalValue={totalValue}
                  owner={owner}
                  onToggle={() => setExpandedId(isOpen ? null : txn.id)}
                  onPrint={() => handlePrint(txn, supplierName, destination)}
                  getPreviousBuyPrice={getPreviousBuyPrice}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FragmentRow({ txn, supplierName, destination, isOpen, totalValue, owner, onToggle, onPrint, getPreviousBuyPrice }) {
  return (
    <>
      <tr style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={onToggle}>
        <td style={{ padding: 8 }}>{isOpen ? '▾' : '▸'} {txn.date}</td>
        <td style={{ padding: 8, fontWeight: 600 }}>{supplierName}</td>
        <td style={{ padding: 8 }}>{destination}</td>
        <td style={{ padding: 8 }}>{txn.items.length} bidhaa</td>
        <td style={{ padding: 8, fontWeight: 700, color: '#0d9488' }}>{fmt(totalValue)}</td>
        <td style={{ padding: 8 }}>
          <button className="btn-ghost small" onClick={(e) => { e.stopPropagation(); onPrint(); }}>🖨️ Print / PDF</button>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: '#f8fafc' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: '6px 8px 6px 28px' }}>Bidhaa</th>
                  <th style={{ padding: 6 }}>Size</th>
                  <th style={{ padding: 6 }}>Brand</th>
                  <th style={{ padding: 6 }}>Qty</th>
                  {owner && <th style={{ padding: 6 }}>Buy Price</th>}
                  {owner && <th style={{ padding: 6 }}>Bei ya Mzigo Uliopita</th>}
                  <th style={{ padding: 6 }}>Sell/Unit Price</th>
                  <th style={{ padding: 6 }}>Thamani</th>
                </tr>
              </thead>
              <tbody>
                {txn.items.map((it, idx) => {
                  const prev = getPreviousBuyPrice(txn.id, it.name, it.size);
                  return (
                    <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px 6px 28px', fontWeight: 600 }}>{it.name}</td>
                      <td style={{ padding: 6 }}>{it.size || 'N/A'}</td>
                      <td style={{ padding: 6 }}>{it.brand || 'N/A'}</td>
                      <td style={{ padding: 6 }}>{it.quantity || 0}</td>
                      {owner && <td style={{ padding: 6, fontWeight: 700 }}>{fmt(it.buyPrice || 0)}</td>}
                      {owner && (
                        <td style={{ padding: 6 }}>
                          {prev == null ? (
                            <span style={{ color: '#94a3b8' }}>Mzigo wa kwanza</span>
                          ) : it.buyPrice > prev ? (
                            <span style={{ color: '#dc2626' }}>{fmt(prev)} (⬆️ +{fmt(it.buyPrice - prev)})</span>
                          ) : it.buyPrice < prev ? (
                            <span style={{ color: '#16a34a' }}>{fmt(prev)} (⬇️ -{fmt(prev - it.buyPrice)})</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>{fmt(prev)} (sawa)</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: 6 }}>{fmt(it.sellPrice || 0)}</td>
                      <td style={{ padding: 6, fontWeight: 700, color: '#0d9488' }}>{fmt((it.quantity || 0) * (owner ? (it.buyPrice || 0) : (it.sellPrice || 0)))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
