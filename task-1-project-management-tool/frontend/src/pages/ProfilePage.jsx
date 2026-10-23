import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Avatar, ErrorNote, Field, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';

function DeleteAccountModal({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [blockingProjects, setBlockingProjects] = useState([]);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) {
      setError('Enter your password to confirm');
      return;
    }
    setBusy(true);
    setError('');
    setBlockingProjects([]);
    try {
      await api.deleteMe(password);
      toast('Your account was deleted', 'info');
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      if (err.code === 'MANAGES_SHARED_PROJECTS') setBlockingProjects(err.details?.projects || []);
      setError(err.fieldErrors().password || err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Delete your account?" onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-[15px] text-muted">
          This removes your account and your notifications. Your comments stay visible as &ldquo;Deleted user&rdquo;. You cannot undo this.
        </p>
        <Field label="Your password" error={error}>
          {(p) => <input {...p} type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />}
        </Field>
        {blockingProjects.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {blockingProjects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}/settings`} className="link" onClick={onClose}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={busy}>
            {busy ? 'Deleting\u2026' : 'Delete my account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProfilePage() {
  useDocumentTitle('Your profile');
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [details, setDetails] = useState({ name: user.name, phone: user.phone || '' });
  const [detailErrors, setDetailErrors] = useState({});
  const [detailFormError, setDetailFormError] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordFormError, setPasswordFormError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);

  async function saveDetails(e) {
    e.preventDefault();
    setDetailFormError('');
    if (!details.name.trim()) {
      setDetailErrors({ name: 'Name is required' });
      return;
    }
    setDetailErrors({});
    setSavingDetails(true);
    try {
      const { user: updated } = await api.updateMe({ name: details.name.trim(), phone: details.phone.trim() || null });
      setUser(updated);
      toast('Changes saved');
    } catch (err) {
      setDetailErrors(err.fieldErrors());
      if (!Object.keys(err.fieldErrors()).length) setDetailFormError(err.message);
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordFormError('');
    const next = {};
    if (!passwords.current) next.currentPassword = 'Current password is required';
    if (passwords.next.length < 8) next.newPassword = 'Password must be at least 8 characters';
    setPasswordErrors(next);
    if (Object.keys(next).length) return;

    setSavingPassword(true);
    try {
      await api.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      toast('Password updated');
    } catch (err) {
      setPasswordErrors(err.fieldErrors());
      if (!Object.keys(err.fieldErrors()).length) setPasswordFormError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={64} />
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          Log out
        </button>
      </div>

      <form onSubmit={saveDetails} className="card mt-6 space-y-4 p-6" noValidate>
        <h2 className="text-xl font-bold">Personal details</h2>
        <ErrorNote>{detailFormError}</ErrorNote>
        <Field label="Full name" error={detailErrors.name}>
          {(p) => <input {...p} className="input" value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))} maxLength={100} autoComplete="name" />}
        </Field>
        <Field label="Email" hint="Your email identifies you in projects, so it cannot be changed.">
          {(p) => <input {...p} className="input" value={user.email} disabled />}
        </Field>
        <Field label="Phone number" optional error={detailErrors.phone}>
          {(p) => <input {...p} type="tel" className="input" placeholder="+251 9XX XXX XXX" value={details.phone} onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))} autoComplete="tel" />}
        </Field>
        <button type="submit" className="btn btn-primary" disabled={savingDetails}>
          {savingDetails ? 'Saving\u2026' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={savePassword} className="card mt-6 space-y-4 p-6" noValidate>
        <h2 className="text-xl font-bold">Change password</h2>
        <ErrorNote>{passwordFormError}</ErrorNote>
        <Field label="Current password" error={passwordErrors.currentPassword}>
          {(p) => <input {...p} type="password" className="input" value={passwords.current} onChange={(e) => setPasswords((s) => ({ ...s, current: e.target.value }))} autoComplete="current-password" />}
        </Field>
        <Field label="New password" error={passwordErrors.newPassword} hint="Use 8 or more characters.">
          {(p) => <input {...p} type="password" className="input" value={passwords.next} onChange={(e) => setPasswords((s) => ({ ...s, next: e.target.value }))} autoComplete="new-password" />}
        </Field>
        <button type="submit" className="btn btn-outline" disabled={savingPassword}>
          {savingPassword ? 'Updating\u2026' : 'Update password'}
        </button>
      </form>

      <section className="mt-6 rounded-card border border-danger/50 bg-white p-6">
        <h2 className="text-xl font-bold text-danger">Delete account</h2>
        <p className="mt-2 text-[15px] text-muted">
          This removes your account and your notifications. Your comments stay visible as &ldquo;Deleted user&rdquo;. You will be asked for your password.
        </p>
        <button type="button" className="btn btn-danger-outline mt-4" onClick={() => setDeleting(true)}>
          Delete my account
        </button>
      </section>

      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </div>
  );
}
