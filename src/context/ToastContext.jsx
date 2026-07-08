import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { message, type }
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`toast-box ${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <div>
            <div className="toast-title">{toast.type === 'success' ? 'Success!' : 'Error!'}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
