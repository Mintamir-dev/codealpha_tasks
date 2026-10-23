import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Logo from '../components/Logo';
import { ErrorNote, Field } from '../components/ui';
import { useDocumentTitle } from '../hooks';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[440px] rounded-card border border-line bg-white p-8">
        <div className="mb-6 flex items-center gap-2.5 text-lg font-bold">
          <Logo /> PM Tool
        </div>
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {done ? (
          <div className="mt-5 space-y-4">
            <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">
              Your password was updated. You can log in now.
            </p>
            <Link to="/login" className="btn btn-primary w-full">
              Go to log in
            </Link>
          </div>
        ) : !token ? (
          <p className="mt-4 text-muted">
            This reset link is incomplete. Open the link from your email again, or <Link to="/login" className="link">request a new one</Link>.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <ErrorNote>{formError}</ErrorNote>
            <Field label="New password" error={error} hint="Use 8 or more characters.">
              {(p) => <input {...p} type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />}
            </Field>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Saving\u2026' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
