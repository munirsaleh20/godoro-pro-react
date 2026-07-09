import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtS } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';

export default function ProductLocator() {
  const { allProductsWithLocations } = useData();
  const [search, setSearch] = useState('');

  const s = search.trim();
  const results = s
    ? allProductsWithLocations
        .filter(p => matchesSearch([p.name, p.size, p.brand], s))
        .sort((a, b) => b.stock - a.stock)
    : [];

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
                {results.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 6, fontSize: 13, fontWeight: 600 }}>
                      {p.name} {p.size ? `(${p.size})` : ''}
                    </td>
                    <td style={{ padding: 6, fontSize: 13 }}>{p.locationIcon} {p.locationName}</td>
                    <td style={{ padding: 6, fontSize: 13, fontWeight: 700, color: p.stock < 5 ? '#dc2626' : p.stock < 10 ? '#e07b2a' : '#16a34a' }}>
                      {p.stock} pcs
                    </td>
                    <td style={{ padding: 6, fontSize: 13, color: '#e07b2a', fontWeight: 700 }}>{fmtS(p.sell)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
