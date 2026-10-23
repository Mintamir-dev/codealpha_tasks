import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Avatar, ConfirmDialog, EmptyState, ErrorNote, Field, Spinner } from '../components/ui';
import { PROJECT_STATUSES, PROJECT_STATUS_META } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';

export default function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useDocumentTitle(project ? `${project.title} settings` : 'Project settings');

  const load = useCallback(async () => {
    try {
      const { project: p } = await api.getProject(projectId);
      setProject(p);
      setForm((f) => f || { title: p.title, description: p.description, status: p.status, endDate: p.endDate || '' });
    } catch (err) {
      setError(err);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <EmptyState title="Project not available" action={<Link to="/projects" className="btn btn-primary">Back to projects</Link>}>
        {error.status === 403 || error.status === 404 ? 'It does not exist, or you are not a member of it.' : error.message}
      </EmptyState>
    );
  }
  if (!project || !form) return <Spinner />;

  if (project.myRole !== 'manager') {
    return (
      <EmptyState title="Only the Manager can open settings" action={<Link to={`/projects/${project.id}`} className="btn btn-primary">Back to the board</Link>}>
        Ask the project Manager if you need a change, such as adding a member.
      </EmptyState>
    );
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function saveDetails(e) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) {
      setFormErrors({ title: 'Title is required' });
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      const { project: updated } = await api.updateProject(project.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        endDate: form.endDate || null,
      });
      setProject(updated);
      toast('Changes saved');
    } catch (err) {
      setFormErrors(err.fieldErrors());
      if (!Object.keys(err.fieldErrors()).length) setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError('Enter the email address of a registered user');
      return;
    }
    setAdding(true);
    setEmailError('');
    try {
      const { member } = await api.addMember(project.id, email.trim());
      toast(`${member.name} was added to the project`);
      setEmail('');
      await load();
    } catch (err) {
      setEmailError(err.fieldErrors().email || err.message);
    } finally {
      setAdding(false);
    }
  }

  async function removeMember() {
    setRemoving(true);
    try {
      await api.removeMember(project.id, removeTarget.id);
      toast(`${removeTarget.name} was removed`);
      setRemoveTarget(null);
      await load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRemoving(false);
    }
  }

  async function togglePermission(e) {
    const checked = e.target.checked;
    setProject((p) => ({ ...p, membersCanCreateTasks: checked }));
    try {
      await api.updateProject(project.id, { membersCanCreateTasks: checked });
      toast(checked ? 'Members can now create tasks' : 'Only the Manager can create tasks');
    } catch (err) {
      setProject((p) => ({ ...p, membersCanCreateTasks: !checked }));
      toast(err.message, 'error');
    }
  }

  async function deleteProject() {
    setDeleting(true);
    try {
      await api.deleteProject(project.id);
      toast('Project deleted');
      navigate('/projects', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link to="/projects" className="font-medium text-brand hover:underline">Projects</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/projects/${project.id}`} className="font-medium text-brand hover:underline">{project.title}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Settings</span>
      </nav>
      <h1 className="mt-2 text-4xl font-bold">Project settings</h1>
      <p className="mt-1 text-muted">Only the project Manager can change these settings.</p>

      <form onSubmit={saveDetails} className="card mt-6 space-y-4 p-6" noValidate>
        <h2 className="text-xl font-bold">Project details</h2>
        <ErrorNote>{formError}</ErrorNote>
        <Field label="Title" error={formErrors.title}>
          {(p) => <input {...p} className="input" value={form.title} onChange={set('title')} maxLength={150} />}
        </Field>
        <Field label="Description" optional error={formErrors.description}>
          {(p) => <textarea {...p} className="input resize-y" rows={3} value={form.description} onChange={set('description')} maxLength={2000} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" error={formErrors.status}>
            {(p) => (
              <select {...p} className="input" value={form.status} onChange={set('status')}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{PROJECT_STATUS_META[s].label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="End date" optional error={formErrors.endDate}>
            {(p) => <input {...p} type="date" className="input" value={form.endDate} onChange={set('endDate')} />}
          </Field>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving\u2026' : 'Save changes'}
        </button>
      </form>

      <section className="card mt-6 p-6" aria-labelledby="members-heading">
        <h2 id="members-heading" className="text-xl font-bold">Members</h2>
        <p className="mt-1 text-sm text-muted">Add people who already have an account. Removing a member unassigns their tasks.</p>
        <form onSubmit={addMember} className="mt-4" noValidate>
          <Field label="Add a member by email" error={emailError}>
            {(p) => (
              <div className="flex gap-3">
                <input {...p} type="email" className="input" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button type="submit" className="btn btn-dark shrink-0" disabled={adding}>
                  {adding ? 'Adding\u2026' : 'Add member'}
                </button>
              </div>
            )}
          </Field>
        </form>
        <ul className="mt-4 divide-y divide-line">
          {project.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar user={m} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">
                  {m.name}
                  {m.id === user.id && ' (you)'}
                </p>
                <p className="truncate text-[13px] text-muted">{m.email}</p>
              </div>
              {m.role === 'manager' ? (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">Manager</span>
              ) : (
                <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => setRemoveTarget(m)}>
                  Remove from project
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 p-6" aria-labelledby="permissions-heading">
        <h2 id="permissions-heading" className="text-xl font-bold">Task permissions</h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0a5f58]" checked={project.membersCanCreateTasks} onChange={togglePermission} />
          <span>
            <span className="block font-semibold">Let members create tasks</span>
            <span className="block text-sm text-muted">By default only the Manager creates, edits and deletes tasks.</span>
          </span>
        </label>
      </section>

      <section className="mt-6 rounded-card border border-danger/50 bg-white p-6" aria-labelledby="delete-heading">
        <h2 id="delete-heading" className="text-xl font-bold text-danger">Delete project</h2>
        <p className="mt-2 text-[15px] text-muted">
          Deleting this project also deletes its {project.counts.total} task{project.counts.total === 1 ? '' : 's'}, all comments and notifications.
          <br />
          This cannot be undone.
        </p>
        <button type="button" className="btn btn-danger-outline mt-4" onClick={() => setConfirmDelete(true)}>
          Delete this project
        </button>
      </section>

      {removeTarget && (
        <ConfirmDialog title={`Remove ${removeTarget.name}?`} confirmLabel="Remove from project" danger busy={removing} onConfirm={removeMember} onCancel={() => setRemoveTarget(null)}>
          Their tasks in this project become unassigned. They lose access to the project.
        </ConfirmDialog>
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete this project?" confirmLabel="Delete project" danger busy={deleting} onConfirm={deleteProject} onCancel={() => setConfirmDelete(false)}>
          &ldquo;{project.title}&rdquo; and everything in it will be deleted for all members.
        </ConfirmDialog>
      )}
    </div>
  );
}
