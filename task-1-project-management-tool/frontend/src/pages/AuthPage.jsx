import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Logo from '../components/Logo';
import { ErrorNote, Field, Segmented } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MiniBoard() {
  const columns = [
    { name: 'To Do', bar: 'border-t-[#8d9ab0]', cards: [44, 30] },
    { name: 'In Progress', bar: 'border-t-[#5b8def]', cards: [58, 28] },
    { name: 'Done', bar: 'border-t-[#47b57e]', cards: [40] },
    { name: 'Blocked', bar: 'border-t-[#e8914a]', cards: [52] },
  ];
  return (
    <div className="mt-10 grid max-w-[560px] grid-cols-4 gap-3" aria-hidden="true">
      {columns.map((c) => (
        <div key={c.name}>
          <p className="mb-2 text-[13px] font-semibold text-white/75">{c.name}</p>
          <div className="space-y-2">
            {c.cards.map((h, i) => (
              <div key={i} className={`rounded-lg border-t-[3px] bg-navy-card ${c.bar}`} style={{ height: h + 8 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="mt-1 text-muted">Enter your email and we will send you a link.</p>
      {sent ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">
            If this email is registered, a reset link has been sent.
          </p>
          <button type="button" className="link" onClick={onBack}>
            Back to log in
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="Email" error={error}>
            {(p) => <input {...p} type="email" className="input" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />}
          </Field>
          <button type="submit" className="btn btn-primary w-full !py-3" disabled={busy}>
            {busy ? 'Sending\u2026' : 'Send reset link'}
          </button>
          <button type="button" className="link" onClick={onBack}>
            Back to log in
          </button>
        </form>
      )}
    </div>
  );
}

export default function AuthPage() {
  useDocumentTitle('Log in');
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/projects" replace />;

  const isRegister = mode === 'register';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function switchMode(next) {
    setMode(next);
    setErrors({});
    setFormError('');
  }

  function validate() {
    const next = {};
    if (isRegister && !form.name.trim()) next.name = 'Name is required';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    else if (isRegister && form.password.length < 8) next.password = 'Password must be at least 8 characters';
    return next;
  }

  async function submit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      if (isRegister) await register({ name: form.name.trim(), email, password: form.password });
      else await login(email, form.password);
      navigate('/projects', { replace: true });
    } catch (err) {
      const fields = err.fieldErrors();
      setErrors(fields);
      if (!Object.keys(fields).length) setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.0fr_1fr]">
      <section className="flex flex-col bg-navy px-8 py-8 text-white sm:px-14 lg:py-12">
        <div className="flex items-center gap-3 text-xl font-bold">
          <Logo light size={32} />
          PM Tool
        </div>
        <div className="my-10 lg:my-auto">
          <h2 className="max-w-md text-4xl font-bold leading-[1.1] sm:text-5xl">
            Your team&rsquo;s work, one board.
          </h2>
          <p className="mt-6 max-w-md text-lg text-white/75">
            Create a project, add your team, assign tasks and move them from To Do to Done.
          </p>
          <div className="hidden sm:block">
            <MiniBoard />
          </div>
        </div>
        <p className="hidden text-sm text-white/55 lg:block">Works on Chrome, Firefox, Edge and Safari.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[440px]">
          {mode === 'forgot' ? (
            <ForgotPassword onBack={() => switchMode('login')} />
          ) : (
            <>
              <Segmented
                label="Log in or create an account"
                value={mode}
                onChange={switchMode}
                options={[
                  { value: 'login', label: 'Log in' },
                  { value: 'register', label: 'Create account' },
                ]}
              />
              <h1 className="mt-9 text-3xl font-bold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
              <p className="mt-1 text-muted">{isRegister ? 'Start a project and invite your team.' : 'Log in to see your projects.'}</p>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                <ErrorNote>{formError}</ErrorNote>
                {isRegister && (
                  <Field label="Full name" error={errors.name}>
                    {(p) => <input {...p} className="input" value={form.name} onChange={set('name')} autoComplete="name" maxLength={100} />}
                  </Field>
                )}
                <Field label="Email" error={errors.email}>
                  {(p) => <input {...p} type="email" className="input" placeholder="name@example.com" value={form.email} onChange={set('email')} autoComplete="email" />}
                </Field>
                <Field label="Password" error={errors.password}>
                  {(p) => (
                    <input
                      {...p}
                      type="password"
                      className="input"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={set('password')}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                    />
                  )}
                </Field>
                <button type="submit" className="btn btn-primary w-full !py-3" disabled={busy}>
                  {busy ? 'Please wait\u2026' : isRegister ? 'Create account' : 'Log in'}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                <p>
                  {isRegister ? 'Already have an account? ' : 'New here? '}
                  <button type="button" className="link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
                    {isRegister ? 'Log in' : 'Create an account'}
                  </button>
                </p>
                {!isRegister && (
                  <button type="button" className="link" onClick={() => switchMode('forgot')}>
                    Forgot password?
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
