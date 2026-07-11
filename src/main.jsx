import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { DataProvider } from './context/DataContext.jsx';

// Kinga ya JUMLA dhidi ya "bug" maarufu ya browser (Chrome/Edge): scroll
// wheel ya mouse ikisogea wakati cursor ipo juu ya input type="number"
// inayo-focus, thamani ya field hiyo INABADILIKA (inaongezeka/inapungua)
// bila mtumiaji kukusudia. Hii ndiyo iliyokuwa ikisababisha idadi/bei
// kubadilika yenyewe (mfano 10 kuwa 8, au 1,500,000 kuwa 1,499,990) wakati
// wa ku-scroll ukurasa. Suluhisho: mara field ya namba ikiwa "focused" na
// mtumiaji aanze ku-scroll, tunai-"blur" mara moja ili scroll iendelee
// kusogeza ukurasa kama kawaida BILA kugusa thamani ya field.
document.addEventListener('wheel', () => {
  const el = document.activeElement;
  if (el && el.tagName === 'INPUT' && el.type === 'number') {
    el.blur();
  }
}, { passive: true });

// Kinga ya PILI: funguo za mshale (ArrowUp/ArrowDown) kwenye keyboard pia
// zinaweza kupunguza/kuongeza thamani ya input type="number" iliyo na
// "focus" - moja moja kwa kila bonyezo - bila kuhitaji mouse/cursor
// kuguswa kabisa. Hii ndiyo iliyokuwa ikisababisha upungufu mdogo (mfano
// -10 kwenye bei, -2 kwenye idadi) hata bila mtumiaji kutumia scroll.
document.addEventListener('keydown', (e) => {
  const el = document.activeElement;
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && el && el.tagName === 'INPUT' && el.type === 'number') {
    e.preventDefault();
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
