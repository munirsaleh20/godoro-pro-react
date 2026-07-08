import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

// Hii inachukua nafasi ya window.confirm() ambayo baadhi ya in-app browsers
// (WhatsApp, Instagram, Facebook) huizuia kimya kimya - hivyo kitufe
// "kinaonekana hakifanyi kazi" ingawa tatizo ni confirm() tu haionekani.
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { message, resolve }
  const resolveRef = useRef(null);

  const confirmAction = useCallback((message) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ message });
    });
  }, []);

  const handle = (result) => {
    resolveRef.current?.(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirmAction }}>
      {children}
      {dialog && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) handle(false); }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-body" style={{ whiteSpace: 'pre-line', paddingTop: 24 }}>
              {dialog.message}
            </div>
            <div className="form-actions" style={{ padding: '0 24px 20px' }}>
              <button className="btn-ghost" onClick={() => handle(false)}>Cancel</button>
              <button className="btn-primary" style={{ background: '#dc2626' }} onClick={() => handle(true)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirmAction;
}
