import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext.jsx';
import { fmtS } from '../utils/format.js';
import { matchesSearch } from '../utils/search.js';

// Inatengeneza "orodha ya bidhaa" kwa kila MTEJA WA JUMLA, ikijumlisha
// jumla ya idadi (quantity) ya kila bidhaa (jina+size) aliyowahi
// kupelekewa kwenye mizigo yote ya 'goods' aliyowahi kupewa - hii NI
// HISTORIA TU (kwa ajili ya kutafuta "bidhaa X iko kwa mteja gani"),
// SI stock halisi - haisomi wala kuandika kitu kwenye `products`, hivyo
// haiathiri stock/mauzo/ripoti za maduka kabisa. locationId hapa ni ya
// mteja (siyo store/shop), inatambulika kwa `locationType: 'wholesale'`.
function useWholesaleProductRows() {
  const { wholesaleCustomers, wholesaleTransactions } = useData();

  return useMemo(() => {
    const rows = new Map(); // key: customerId|name|size -> row

    for (const t of wholesaleTransactions) {
      if (t.type !== 'goods' || !t.items || !t.items.length) continue;
      const customer = wholesaleCustomers.find(c => String(c.id) === String(t.customerId));
      if (!customer) continue;

      for (const it of t.items) {
        const name = (it.name || '').trim();
        if (!name) continue;
        const size = (it.size || '').trim();
        const key = `${customer.id}|${name.toLowerCase()}|${size.toLowerCase()}`;
        const existing = rows.get(key);
        if (existing) {
          existing.stock += (it.quantity || 0);
          existing.sell = it.unitPrice || existing.sell; // bei ya karibuni zaidi
        } else {
          rows.set(key, {
            id: `wholesale-${key}`,
            name, size, brand: '',
            stock: it.quantity || 0,
            sell: it.unitPrice || 0,
            locationName: customer.name,
            locationType: 'wholesale',
            locationIcon: '🧾',
            locationLabel: 'Mteja wa Jumla',
          });
        }
      }
    }
    return Array.from(rows.values());
  }, [wholesaleCustomers, wholesaleTransactions]);
}

export default function ProductLocator() {
  const { allProductsWithLocations } = useData();
  const wholesaleRows = useWholesaleProductRows();
  const [search, setSearch] = useState('');

  const s = search.trim();
  const results = s
    ? [...allProductsWithLocations.filter(p => p.stock > 0), ...wholesaleRows]
        .filter(p => matchesSearch([p.name, p.size, p.brand], s))
        .filter(p => p.stock > 0)
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
                    <td style={{ padding: 6, fontSize: 13, fontWeight: 700, color: p.locationType === 'wholesale' ? '#7c3aed' : (p.stock < 5 ? '#dc2626' : p.stock < 10 ? '#e07b2a' : '#16a34a') }}>
                      {p.stock} pcs{p.locationType === 'wholesale' ? ' (alizopewa)' : ''}
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
