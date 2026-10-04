import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Crown, Lock, User, ArrowRight, ShieldCheck, Sparkles, Store, Mail } from 'lucide-react';

export function LoginPage(): React.JSX.Element {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register, loginWithGoogle } = useAuthStore();

  const handleSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setError('Invalid username or password. Please use admin / admin123 or create a new account.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({
        fullName: regFullName,
        storeName: regStoreName,
        username: regEmail,
        password: regPassword,
      });
      if (!res.success) {
        setError(res.error ?? 'Could not create account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (userRole: 'admin' | 'manager' | 'cashier'): void => {
    setError(null);
    if (userRole === 'admin') {
      setUsername('admin');
      setPassword('admin123');
      void login('admin', 'admin123');
    } else if (userRole === 'manager') {
      setUsername('manager');
      setPassword('manager123');
      void login('manager', 'manager123');
    } else {
      setUsername('cashier');
      setPassword('cashier123');
      void login('cashier', 'cashier123');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1218 0%, #131921 50%, #1b2530 100%)',
        color: 'white',
        padding: '1.5rem',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(27, 37, 48, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '4.25rem',
              height: '4.25rem',
              margin: '0 auto 1rem',
              borderRadius: '1.25rem',
              background: 'linear-gradient(135deg, #f7a83e, #f0932a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#131921',
              boxShadow: '0 10px 25px rgba(240, 147, 42, 0.35)',
            }}
          >
            <Crown size={32} strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
            MARTPOS <span style={{ color: '#f0932a', fontSize: '0.875rem', verticalAlign: 'super', fontWeight: 700 }}>CLOUD</span>
          </h1>
          <p style={{ color: '#97a3b3', fontSize: '0.875rem', marginTop: '0.375rem' }}>
            Next-Gen Multi-Counter Cloud POS & ERP
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              background: 'rgba(240, 147, 42, 0.12)',
              border: '1px solid rgba(240, 147, 42, 0.25)',
              borderRadius: '999px',
              fontSize: '0.75rem',
              color: '#f7a83e',
              fontWeight: 600,
            }}
          >
            <Sparkles size={12} />
            <span>3 Days Free Trial Included • Cloud & Offline Sync</span>
          </div>
        </div>

        {/* Tab switcher: Sign In vs Create Account */}
        <div
          style={{
            display: 'flex',
            background: '#131921',
            borderRadius: '0.625rem',
            padding: '0.25rem',
            marginBottom: '1.5rem',
            border: '1px solid #1b2530',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.625rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: mode === 'signin' ? '#f0932a' : 'transparent',
              color: mode === 'signin' ? '#131921' : '#97a3b3',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.625rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: mode === 'register' ? '#f0932a' : 'transparent',
              color: mode === 'register' ? '#131921' : '#97a3b3',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.625rem',
            background: '#ffffff',
            color: '#131921',
            border: 'none',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            marginBottom: '1.25rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.25rem',
            color: '#5f7085',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span>Or with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#fca5a5',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#c3cad3',
                  marginBottom: '0.375rem',
                }}
              >
                Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#5f7085',
                  }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                    background: '#131921',
                    border: '1px solid #3b4a5e',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  placeholder="admin or your email"
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#c3cad3',
                  marginBottom: '0.375rem',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#5f7085',
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                    background: '#131921',
                    border: '1px solid #3b4a5e',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  placeholder="admin123"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: '#f0932a',
                color: '#131921',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s ease',
              }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* REGISTER / CREATE ACCOUNT FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#c3cad3',
                  marginBottom: '0.375rem',
                }}
              >
                Owner / Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#5f7085',
                  }}
                />
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                    background: '#131921',
                    border: '1px solid #3b4a5e',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  placeholder="e.g. Mubeen Khan"
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#c3cad3',
                  marginBottom: '0.375rem',
                }}
              >
                Mart / Business Name
              </label>
              <div style={{ position: 'relative' }}>
                <Store
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#5f7085',
                  }}
                />
                <input
                  type="text"
                  value={regStoreName}
                  onChange={(e) => setRegStoreName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                    background: '#131921',
                    border: '1px solid #3b4a5e',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  placeholder="e.g. Metro Hyper Mart"
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#c3cad3',
                  marginBottom: '0.375rem',
                }}
              >
                Email Address / Login ID
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#5f7085',
                  }}
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                    background: '#131921',
                    border: '1px solid #3b4a5e',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  placeholder="owner@yourmart.com"
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#c3cad3',
                  marginBottom: '0.375rem',
                }}
              >
                Create Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#5f7085',
                  }}
                />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                    background: '#131921',
                    border: '1px solid #3b4a5e',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: '#f0932a',
                color: '#131921',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s ease',
              }}
            >
              <span>{loading ? 'Creating Mart Account...' : 'Start 3-Day Free Trial'}</span>
              <Sparkles size={16} />
            </button>
          </form>
        )}

        {/* Quick Demo Login (for fast 1-click test) */}
        {mode === 'signin' && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: '#97a3b3', marginBottom: '0.5rem', textAlign: 'center' }}>
              Instant 1-Click Demo Login:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                style={{
                  padding: '0.45rem',
                  background: '#131921',
                  border: '1px solid #3b4a5e',
                  borderRadius: '0.375rem',
                  color: '#f0932a',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('manager')}
                style={{
                  padding: '0.45rem',
                  background: '#131921',
                  border: '1px solid #3b4a5e',
                  borderRadius: '0.375rem',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('cashier')}
                style={{
                  padding: '0.45rem',
                  background: '#131921',
                  border: '1px solid #3b4a5e',
                  borderRadius: '0.375rem',
                  color: '#4ade80',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Cashier
              </button>
            </div>
          </div>
        )}

        {/* Security footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            marginTop: '1.25rem',
            color: '#5f7085',
            fontSize: '0.75rem',
          }}
        >
          <ShieldCheck size={14} />
          <span>Encrypted Session • Cloud & Offline Sync Ready</span>
        </div>
      </div>
    </div>
  );
}
