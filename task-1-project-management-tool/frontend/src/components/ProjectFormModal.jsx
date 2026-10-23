import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { ErrorNote, Field, Modal } from './ui';

/** FR-PROJ-01: title (required), description and end date (optional). The creator becomes the Manager. */
export default function ProjectFormModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', description: '', endDate: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const { project } = await api.createProject({
        title: form.title.trim(),
        description: form.description.trim(),
        endDate: form.endDate || null,
      });
      toast('Project created');
      onCreated(project);
    } catch (err) {
      setErrors(err.fieldErrors());
      setFormError(Object.keys(err.fieldErrors()).length ? '' : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{formError}</ErrorNote>
        <Field label="Title" error={errors.title}>
          {(p) => <input {...p} className="input" value={form.title} onChange={set('title')} maxLength={150} autoFocus />}
        </Field>
        <Field label="Description" optional error={errors.description}>
          {(p) => <textarea {...p} className="input resize-y" rows={3} value={form.description} onChange={set('description')} maxLength={2000} />}
        </Field>
        <Field label="End date" optional error={errors.endDate}>
          {(p) => <input {...p} type="date" className="input" value={form.endDate} onChange={set('endDate')} />}
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating\u2026' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
