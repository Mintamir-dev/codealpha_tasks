import { useState } from 'react';
import { api } from '../api';
import { PRIORITIES, PRIORITY_META } from '../constants';
import { useToast } from '../context/ToastContext';
import { ErrorNote, Field, Modal } from './ui';

/** Create a task (task = undefined) or edit one. Only the Manager sees the Assignee field. */
export default function TaskFormModal({ project, task, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(task);
  const isManager = project.myRole === 'manager';

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate || '',
    assigneeId: task?.assignee ? String(task.assignee.id) : '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (form.title.length > 200) next.title = 'Title must be at most 200 characters';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      dueDate: form.dueDate || null,
    };
    if (isManager) body.assigneeId = form.assigneeId ? Number(form.assigneeId) : null;

    setSaving(true);
    try {
      const result = isEdit ? await api.updateTask(task.id, body) : await api.createTask(project.id, body);
      toast(isEdit ? 'Task saved' : 'Task created');
      onSaved(result.task);
    } catch (err) {
      setErrors(err.fieldErrors());
      setFormError(Object.keys(err.fieldErrors()).length ? '' : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{formError}</ErrorNote>
        <Field label="Title" error={errors.title}>
          {(p) => <input {...p} className="input" value={form.title} onChange={set('title')} maxLength={200} autoFocus />}
        </Field>
        <Field label="Description" optional error={errors.description}>
          {(p) => <textarea {...p} className="input resize-y" rows={4} value={form.description} onChange={set('description')} maxLength={5000} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority" error={errors.priority}>
            {(p) => (
              <select {...p} className="input" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map((v) => (
                  <option key={v} value={v}>
                    {PRIORITY_META[v].label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Due date" optional error={errors.dueDate}>
            {(p) => <input {...p} type="date" className="input" value={form.dueDate} onChange={set('dueDate')} />}
          </Field>
        </div>
        {isManager && (
          <Field label="Assignee" optional error={errors.assigneeId}>
            {(p) => (
              <select {...p} className="input" value={form.assigneeId} onChange={set('assigneeId')}>
                <option value="">Unassigned</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving\u2026' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
