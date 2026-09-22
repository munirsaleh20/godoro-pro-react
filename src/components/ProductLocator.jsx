import { useState, Fragment } from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtS } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';

export default function ProductLocator() {
  const { allProductsWithLocations, inventoryLogs, sales } = useData();
  const [search, setSearch] = useState('');
  // KIPENGELE: "Product Movement" - bofya bidhaa kuona: imeingizwa mara
  // ngapi (kutoka inventory_logs, qty>0) na imeuzwa mara ngapi (kutoka
  // sales) - kwa hiyo bidhaa MAALUM kwenye duka/store hilo MAALUM.
  const [expandedId, setExpandedId] = useState(null);

  const s = search.trim();
  const results = s
    ? allProductsWithLocations
        .filter(p => matchesSearch([p.name, p.size, p.brand], s))
        .filter(p => p.stock > 0)
        .sort((a, b) => b.stock - a.stock)
    : [];

  const getMovement = (product) => {
    const inLogs = inventoryLogs.filter(l => (
      String(l.productId) === String(product.id) && String(l.locationId) === String(product.locationId) && (l.qty || 0) > 0
    ));
    const outSales = sales.filter(sale => (
      String(sale.productId) === String(product.id) && String(sale.locationId) === String(product.locationId)
    ));
    return {
      inCount: inLogs.length,
      inQty: inLogs.reduce((sum, l) => sum + (l.qty || 0), 0),
      outCount: outSales.length,
      outQty: outSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
    };
  };

  return (
    <div className="manager-store-card" style={{ cursor: 'default', marginBottom: 20 }}>
      <div className="store-header">
        <div>
          <div className="store-name">🔍 Tafuta Bidhaa (Find Product)</div>
          <div className="store-location">Andika jina la bidhaa kuona lipo duka/store gani</div>
        </div>
      </div>
      <input
        className="form-input"
        placeholder="mfano: Vitaraha, Furaha, 6x6x8..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {s && (
        results.length === 0 ? (
          <div style={{ marginTop: 14, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
            Hakuna bidhaa iliyopatikana yenye jina hilo
          </div>
        ) : (
          <div style={{ marginTop: 14, maxHeight: 280, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Bofya bidhaa kuona imeingizwa/imeuzwa mara ngapi duka hilo</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: 6, fontSize: 12 }}>Bidhaa</th>
                  <th style={{ padding: 6, fontSize: 12 }}>Location</th>
                  <th style={{ padding: 6, fontSize: 12 }}>Stock</th>
                  <th style={{ padding: 6, fontSize: 12 }}>Bei</th>
                </tr>
              </thead>
              <tbody>
                {results.map(p => {
                  const rowKey = `${p.id}|${p.locationId}`;
                  const isOpen = expandedId === rowKey;
                  const mv = isOpen ? getMovement(p) : null;
                  return (
                    <Fragment key={rowKey}>
                      <tr
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setExpandedId(isOpen ? null : rowKey)}
                        title="Bofya kuona imeingizwa/imeuzwa mara ngapi"
                      >
                        <td style={{ padding: 6, fontSize: 13, fontWeight: 600 }}>
                          {isOpen ? '▾' : '▸'} {p.name} {p.size ? `(${p.size})` : ''}
                        </td>
                        <td style={{ padding: 6, fontSize: 13 }}>{p.locationIcon} {p.locationName}</td>
                        <td style={{ padding: 6, fontSize: 13, fontWeight: 700, color: p.stock < 5 ? '#dc2626' : p.stock < 10 ? '#e07b2a' : '#16a34a' }}>
                          {p.stock} pcs
                        </td>
                        <td style={{ padding: 6, fontSize: 13, color: '#e07b2a', fontWeight: 700 }}>{fmtS(p.sell)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={4} style={{ padding: '6px 6px 12px 20px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12 }}>
                              <div>
                                <span style={{ color: '#64748b' }}>📥 Imeingizwa: </span>
                                <strong style={{ color: '#0d9488' }}>{mv.inCount}</strong> mara
                                <span style={{ color: '#94a3b8' }}> ({mv.inQty} pcs jumla)</span>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>📤 Imeuzwa: </span>
                                <strong style={{ color: '#2563eb' }}>{mv.outCount}</strong> mara
                                <span style={{ color: '#94a3b8' }}> ({mv.outQty} pcs jumla)</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
