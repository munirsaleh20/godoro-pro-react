import { useEffect, useRef, useState } from 'react';

// KIPENGELE: "Searchable Dropdown" - badala ya <select> ya kawaida
// (ambayo kwenye simu inaonekana kama orodha ndefu ya kuvinjari kwa
// "Prev/Next" bila utafutaji), hii inatoa sanduku la kuandika juu ya
// dropdown ili kutafuta bidhaa haraka bila kuvinjari orodha nzima.
// Inatumika kama sehemu ya "drop-in" badala ya <select className="form-select">.
export default function SearchableSelect({
  options,        // array ya strings
  value,          // thamani iliyochaguliwa sasa
  onChange,       // (newValue) => void
  placeholder = '-- Select --',
  otherLabel = null, // mfano "Other (Type manually)" - ikiwekwa, inaongezwa mwishoni
  otherValue = null,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
    };
  }, []);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const norm = (s) => (s || '').toString().trim().toLowerCase();
  const filtered = query.trim()
    ? options.filter(o => norm(o).includes(norm(query)))
    : options;

  const displayLabel = value === otherValue && otherLabel ? otherLabel : (value || placeholder);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="form-select"
        style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: value ? 'inherit' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <span style={{ marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 320,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              type="text"
              className="form-input"
              placeholder="🔍 Tafuta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            <div
              onClick={() => pick('')}
              style={{ padding: '10px 12px', cursor: 'pointer', color: '#94a3b8', borderBottom: '1px solid #f8fafc' }}
            >
              {placeholder}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', color: '#94a3b8' }}>Hakuna kilichopatikana</div>
            ) : filtered.map(o => (
              <div
                key={o}
                onClick={() => pick(o)}
                style={{
                  padding: '10px 12px', cursor: 'pointer',
                  background: o === value ? '#f0fdfa' : 'transparent',
                  fontWeight: o === value ? 700 : 400,
                  borderBottom: '1px solid #f8fafc',
                }}
              >
                {o}
              </div>
            ))}
            {otherLabel && otherValue && (
              <div
                onClick={() => pick(otherValue)}
                style={{
                  padding: '10px 12px', cursor: 'pointer', fontStyle: 'italic', color: '#2563eb',
                  background: value === otherValue ? '#eff6ff' : 'transparent',
                }}
              >
                {otherLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
