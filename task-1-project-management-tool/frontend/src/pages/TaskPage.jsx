import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import BlockedReasonModal from '../components/BlockedReasonModal';
import MentionTextarea from '../components/MentionTextarea';
import RichText from '../components/RichText';
import TaskFormModal from '../components/TaskFormModal';
import { Avatar, ConfirmDialog, EmptyState, PriorityPill, Spinner } from '../components/ui';
import { STATUSES, STATUS_META } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useSocketEvents } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';
import { formatDateTime, formatIsoDate, formatLongDate, overdueDays } from '../utils/format';

const DELETED_USER = { id: -1, name: 'Deleted user' };

export default function TaskPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [task, setTask] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [comments, setComments] = useState(null);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockedAsk, setBlockedAsk] = useState(false);

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [commentToDelete, setCommentToDelete] = useState(null);

  useDocumentTitle(task?.title);

  const loadTask = useCallback(async () => {
    try {
      const result = await api.getTask(taskId);
      setTask(result.task);
      setPermissions(result.permissions);
    } catch (err) {
      setError(err);
    }
  }, [taskId]);

  const loadProject = useCallback(async () => {
    try {
      const { project: p } = await api.getProject(projectId);
      setProject(p);
    } catch (err) {
      setError(err);
    }
  }, [projectId]);

  const loadComments = useCallback(async () => {
    try {
      const { comments: list } = await api.listComments(taskId);
      setComments(list);
    } catch (err) {
      setError(err);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
    loadProject();
    loadComments();
  }, [loadTask, loadProject, loadComments]);

  const sameTask = (p) => String(p.taskId ?? p.task?.id) === String(taskId);
  useSocketEvents({
    'comment:added': (p) => sameTask(p) && p.actorId !== user.id && loadComments(),
    'comment:updated': (p) => sameTask(p) && p.actorId !== user.id && loadComments(),
    'comment:deleted': (p) => sameTask(p) && p.actorId !== user.id && loadComments(),
    'task:updated': (p) => sameTask(p) && p.actorId !== user.id && loadTask(),
    'task:moved': (p) => sameTask(p) && p.actorId !== user.id && loadTask(),
    'task:deleted': (p) => {
      if (!sameTask(p)) return;
      toast('This task was deleted by the Manager', 'info');
      navigate(`/projects/${projectId}`, { replace: true });
    },
    'member:removed': (p) => {
      if (String(p.projectId) === String(projectId) && p.userId === user.id) navigate('/projects', { replace: true });
    },
    'project:deleted': (p) => {
      if (String(p.projectId) === String(projectId)) navigate('/projects', { replace: true });
    },
  });

  async function changeStatus(status, blockedReason) {
    const body = { status };
    if (blockedReason) body.blockedReason = blockedReason;
    try {
      const result = await api.changeTaskStatus(task.id, body);
      setTask(result.task);
      toast('Status updated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function onStatusSelect(e) {
    const status = e.target.value;
    if (status === task.status) return;
    if (status === 'blocked') setBlockedAsk(true);
    else changeStatus(status);
  }

  async function removeTask() {
    setDeleting(true);
    try {
      await api.deleteTask(task.id);
      toast('Task deleted');
      navigate(`/projects/${projectId}`, { replace: true });
    } catch (err) {
      toast(err.message, 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setCommentError('');
    try {
      const { comment } = await api.addComment(task.id, text.trim());
      setComments((list) => [...list, comment]);
      setText('');
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(commentId) {
    if (!editText.trim()) return;
    try {
      const { comment } = await api.editComment(task.id, commentId, editText.trim());
      setComments((list) => list.map((c) => (c.id === commentId ? comment : c)));
      setEditingId(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function removeComment() {
    const target = commentToDelete;
    setCommentToDelete(null);
    try {
      await api.deleteComment(task.id, target.id);
      setComments((list) => list.filter((c) => c.id !== target.id));
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (error) {
    const unavailable = error.status === 403 || error.status === 404;
    return (
      <EmptyState
        title={unavailable ? 'Task not available' : 'Could not load this task'}
        action={
          <Link to="/projects" className="btn btn-primary">
            Back to projects
          </Link>
        }
      >
        {unavailable ? 'It does not exist, or you are not a member of its project.' : error.message}
      </EmptyState>
    );
  }
  if (!task || !project || comments === null) return <Spinner />;

  const memberNames = project.members.map((m) => m.name);
  const mentionable = project.members.filter((m) => m.id !== user.id);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link to="/projects" className="font-medium text-brand hover:underline">
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/projects/${project.id}`} className="font-medium text-brand hover:underline">
          {project.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Task</span>
      </nav>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{task.title}</h1>
              {permissions.canEdit && (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                    Edit task
                  </button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => setConfirmDelete(true)}>
                    Delete task
                  </button>
                </div>
              )}
            </div>
            <h2 className="mt-5 text-[15px] font-bold">Description</h2>
            <p className="mt-1 max-w-prose text-[15px] leading-relaxed text-muted">
              {task.description ? <RichText text={task.description} /> : 'No description.'}
            </p>
            {task.status === 'blocked' && task.blockedReason && (
              <p className="mt-4 rounded-md bg-warn-soft px-3 py-2.5 text-sm text-warn">Blocked: {task.blockedReason}</p>
            )}
          </section>

          <section className="card p-6" aria-labelledby="comments-heading">
            <h2 id="comments-heading" className="text-2xl font-bold">
              Comments <span className="text-base font-normal text-muted">({comments.length})</span>
            </h2>

            <ul className="mt-5 space-y-5">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar user={c.author || DELETED_USER} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-bold">
                        {c.author ? c.author.name : 'Deleted user'}
                        {c.author?.role === 'manager' && ' (Manager)'}
                      </span>{' '}
                      <span className="text-faint">
                        {formatDateTime(c.createdAt)}
                        {c.edited && ' \u00B7 edited'}
                      </span>
                    </p>
                    {editingId === c.id ? (
                      <div className="mt-2 space-y-2">
                        <MentionTextarea value={editText} onChange={setEditText} members={mentionable} aria-label="Edit comment" />
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(c.id)} disabled={!editText.trim()}>
                            Save changes
                          </button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[15px] leading-relaxed">
                        <RichText text={c.text} memberNames={memberNames} />
                      </p>
                    )}
                    {editingId !== c.id && (c.canEdit || c.canDelete) && (
                      <p className="mt-1 flex gap-3 text-[13px] font-semibold">
                        {c.canEdit && (
                          <button
                            type="button"
                            className="text-brand hover:underline"
                            onClick={() => {
                              setEditingId(c.id);
                              setEditText(c.text);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {c.canDelete && (
                          <button type="button" className="text-danger hover:underline" onClick={() => setCommentToDelete(c)}>
                            Delete
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {comments.length === 0 && <li className="text-[15px] text-muted">No comments yet. Start the conversation below.</li>}
            </ul>

            <form onSubmit={postComment} className="mt-6 flex gap-3 border-t border-line pt-5">
              <Avatar user={user} size={36} />
              <div className="min-w-0 flex-1">
                <label htmlFor="new-comment" className="mb-1.5 block text-sm font-bold">
                  Add a comment
                </label>
                <MentionTextarea
                  id="new-comment"
                  value={text}
                  onChange={setText}
                  members={mentionable}
                  rows={3}
                  maxLength={1000}
                  placeholder="Write a comment. Use @name to mention a member."
                />
                {commentError && (
                  <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
                    {commentError}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[13px] text-faint">{text.length} / 1000 characters</span>
                  <button type="submit" className="btn btn-primary" disabled={posting || !text.trim()}>
                    {posting ? 'Posting\u2026' : 'Post comment'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>

        <aside className="card space-y-5 p-5">
          <div>
            <label htmlFor="task-status" className="mb-1.5 block text-sm font-bold">
              Status
            </label>
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[task.status].dot}`} />
              <select id="task-status" className="input" value={task.status} onChange={onStatusSelect} disabled={!permissions.canChangeStatus}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            {!permissions.canChangeStatus && (
              <p className="mt-1.5 text-[13px] text-faint">Only the Manager or the assignee can change the status.</p>
            )}
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-bold">Assignee</h3>
            {task.assignee ? (
              <div className="flex items-center gap-2.5">
                <Avatar user={task.assignee} size={28} />
                <span className="text-[15px]">{task.assignee.name}</span>
              </div>
            ) : (
              <p className="text-[15px] text-muted">Unassigned</p>
            )}
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-bold">Priority</h3>
            <PriorityPill priority={task.priority} />
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-bold">Due date</h3>
            {task.dueDate ? (
              <p className="flex flex-wrap items-center gap-2 text-[15px]">
                {formatLongDate(task.dueDate)}
                {task.isOverdue && (
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                    Overdue by {overdueDays(task.dueDate)} day{overdueDays(task.dueDate) === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-[15px] text-muted">No due date</p>
            )}
          </div>
          <p className="border-t border-line pt-4 text-[13px] text-muted">
            Created by {task.createdBy ? task.createdBy.name : 'Deleted user'} on {formatIsoDate(task.createdAt)}
          </p>
        </aside>
      </div>

      {editing && (
        <TaskFormModal
          project={project}
          task={task}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            setTask(updated);
          }}
        />
      )}
      {blockedAsk && (
        <BlockedReasonModal
          task={task}
          onCancel={() => setBlockedAsk(false)}
          onConfirm={(reason) => {
            setBlockedAsk(false);
            changeStatus('blocked', reason || undefined);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete this task?" confirmLabel="Delete task" danger busy={deleting} onConfirm={removeTask} onCancel={() => setConfirmDelete(false)}>
          &ldquo;{task.title}&rdquo; and its {comments.length} comment{comments.length === 1 ? '' : 's'} will be deleted. This cannot be undone.
        </ConfirmDialog>
      )}
      {commentToDelete && (
        <ConfirmDialog title="Delete this comment?" confirmLabel="Delete comment" danger onConfirm={removeComment} onCancel={() => setCommentToDelete(null)}>
          This cannot be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
