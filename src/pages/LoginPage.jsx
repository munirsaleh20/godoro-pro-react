import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage() {
  const { checkOwnerExists, ownerExists, login, signupOwner } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('login');
  const [checking, setChecking] = useState(true);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [signupErr, setSignupErr] = useState('');
  const [signupOk, setSignupOk] = useState('');
  const [signupBusy, setSignupBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const exists = await checkOwnerExists();
      setTab(exists ? 'login' : 'signup');
      setChecking(false);
    })();
  }, [checkOwnerExists]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    if (!loginEmail.trim() || !loginPass) {
      setLoginErr('Please fill in email and password.');
      return;
    }
    setLoginBusy(true);
    try {
      const user = await login(loginEmail.trim(), loginPass);
      showToast(`👋 Welcome, ${user.name}!`);
    } catch (err) {
      setLoginErr(err.message);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupErr('');
    setSignupOk('');
    if (!name.trim() || !email.trim() || !pass || !passConfirm) {
      setSignupErr('Please fill in all fields.');
      return;
    }
    if (pass.length < 6) {
      setSignupErr('Password must be at least 6 characters.');
      return;
    }
    if (pass !== passConfirm) {
      setSignupErr('Passwords do not match.');
      return;
    }
    setSignupBusy(true);
    try {
      await signupOwner({ name: name.trim(), email: email.trim(), password: pass });
      setSignupOk('✅ Owner account created! You can now login.');
      setLoginEmail(email.trim());
      setTimeout(async () => {
        const exists = await checkOwnerExists();
        setTab(exists ? 'login' : 'signup');
      }, 1500);
    } catch (err) {
      setSignupErr(err.message);
    } finally {
      setSignupBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="auth-wrapper">
        <div className="auth-box" style={{ textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <h2 style={{ marginBottom: 4 }}>🛏️ Godoro Pro</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
          Multi-store mattress business management
        </p>

        {ownerExists && (
          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => setTab('login')}
            >Login</button>
            <button
              className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => setTab('signup')}
              disabled
              title="Owner account already exists"
            >Sign Up</button>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            {loginErr && <div className="form-error">{loginErr}</div>}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={loginBusy}>
              {loginBusy ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              No owner account exists yet. Create the first (Owner) account to get started.
            </p>
            {signupErr && <div className="form-error">{signupErr}</div>}
            {signupOk && <div className="form-success">{signupOk}</div>}
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" value={passConfirm} onChange={(e) => setPassConfirm(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={signupBusy}>
              {signupBusy ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
