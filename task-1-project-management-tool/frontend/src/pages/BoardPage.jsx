import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import BlockedReasonModal from '../components/BlockedReasonModal';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import { Avatar, EmptyState, ProgressBar, ProjectStatusPill, Spinner } from '../components/ui';
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useSocketEvents } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useDebounce, useDocumentTitle, useMediaQuery } from '../hooks';

const SORTS = [
  { value: 'board', label: 'Board order' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'name', label: 'Name' },
];

const EMPTY_FILTERS = { search: '', priority: '', assignee: '', mine: false, sort: 'board' };

export default function BoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);
  const [taskModal, setTaskModal] = useState(false);
  const [blockedAsk, setBlockedAsk] = useState(null);
  const [mobileTab, setMobileTab] = useState('todo');
  const [dragId, setDragId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);

  useDocumentTitle(project?.title);

  const loadProject = useCallback(async () => {
    try {
      const { project: p } = await api.getProject(projectId);
      setProject(p);
    } catch (err) {
      setError(err);
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    try {
      const { tasks: list } = await api.listTasks(projectId, {
        search: debouncedSearch.trim(),
        priority: filters.priority,
        assignee: filters.assignee,
        mine: filters.mine ? 'true' : '',
        sort: filters.sort,
      });
      setTasks(list);
    } catch (err) {
      setError(err);
    }
  }, [projectId, debouncedSearch, filters.priority, filters.assignee, filters.mine, filters.sort]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // FR-RT-01: changes made by other people appear without a reload. Our own changes are already applied.
  const forThisProject = (p) => String(p.projectId) === String(projectId);
  const refreshFromOthers = (p) => {
    if (!forThisProject(p) || p.actorId === user.id) return;
    loadTasks();
    loadProject();
  };
  useSocketEvents({
    'task:created': refreshFromOthers,
    'task:updated': refreshFromOthers,
    'task:moved': refreshFromOthers,
    'task:deleted': refreshFromOthers,
    'member:added': refreshFromOthers,
    'project:updated': refreshFromOthers,
    'member:removed': (p) => {
      if (!forThisProject(p)) return;
      if (p.userId === user.id) {
        toast('You were removed from this project', 'info');
        navigate('/projects', { replace: true });
      } else if (p.actorId !== user.id) {
        loadTasks();
        loadProject();
      }
    },
    'project:deleted': (p) => {
      if (!forThisProject(p) || p.actorId === user.id) return;
      toast('This project was deleted by its Manager', 'info');
      navigate('/projects', { replace: true });
    },
  });

  const isManager = project?.myRole === 'manager';
  const canCreate = isManager || Boolean(project?.membersCanCreateTasks);
  const canMove = (task) => isManager || task.assignee?.id === user.id;

  const columns = useMemo(
    () =>
      STATUSES.map((status) => {
        const list = (tasks || []).filter((t) => t.status === status);
        if (filters.sort === 'board') list.sort((a, b) => a.position - b.position || a.id - b.id);
        return { status, tasks: list };
      }),
    [tasks, filters.sort]
  );

  async function applyMove(task, status, { blockedReason, position } = {}) {
    const before = tasks;
    setTasks((list) =>
      list.map((t) =>
        t.id === task.id
          ? { ...t, status, blockedReason: status === 'blocked' ? blockedReason || null : null, position: position ?? 1e9 }
          : t
      )
    );
    const body = { status };
    if (blockedReason) body.blockedReason = blockedReason;
    if (position !== undefined) body.position = position;
    try {
      await api.changeTaskStatus(task.id, body);
      await Promise.all([loadTasks(), loadProject()]);
    } catch (err) {
      setTasks(before);
      toast(err.message, 'error');
    }
  }

  function requestMove(task, status, extra = {}) {
    if (task.status === status && extra.position === undefined) return;
    if (status === 'blocked' && task.status !== 'blocked') setBlockedAsk({ task, extra });
    else applyMove(task, status, extra);
  }

  function dropOn(status, beforeTask) {
    const task = (tasks || []).find((t) => t.id === dragId);
    setDragId(null);
    setOverStatus(null);
    if (!task || !canMove(task)) return;
    if (beforeTask && beforeTask.id === task.id) return;
    requestMove(task, status, beforeTask ? { position: beforeTask.position } : {});
  }

  if (error) {
    const forbidden = error.status === 403 || error.status === 404;
    return (
      <EmptyState
        title={forbidden ? 'Project not available' : 'Could not load this project'}
        action={
          <Link to="/projects" className="btn btn-primary">
            Back to projects
          </Link>
        }
      >
        {forbidden ? 'It does not exist, or you are not a member of it.' : error.message}
      </EmptyState>
    );
  }
  if (!project || tasks === null) return <Spinner />;

  const filtersActive = Boolean(filters.search || filters.priority || filters.assignee || filters.mine);
  const noTasksAtAll = project.counts.total === 0 && !filtersActive;
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const newTaskButton = canCreate && (
    <button type="button" className="btn btn-primary !px-5 !py-3" onClick={() => setTaskModal(true)}>
      <span aria-hidden="true" className="text-lg leading-none">+</span> New task
    </button>
  );

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm font-medium text-brand">
        <Link to="/projects" className="hover:underline">
          Projects
        </Link>
      </nav>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{project.title}</h1>
          <ProjectStatusPill status={project.status} />
          {!isManager && <span className="rounded-full bg-[#e4e8ef] px-2.5 py-0.5 text-xs font-semibold text-muted">Member</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <div className="flex justify-between text-sm text-muted">
              <span>
                {project.counts.done} of {project.counts.total} tasks done
              </span>
              <span className="font-bold text-ink">{project.progress}%</span>
            </div>
            <div className="mt-1.5">
              <ProgressBar value={project.progress} complete={project.status === 'completed'} label="Project progress" />
            </div>
          </div>
          {isManager && (
            <Link to={`/projects/${project.id}/settings`} className="btn btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </svg>
              Project settings
            </Link>
          )}
        </div>
      </div>

      {!isManager && (
        <p className="mt-5 rounded-lg border border-[#c5d5f2] bg-[#e9f0fc] px-4 py-3 text-sm text-[#1d3f7a]">
          You are a Member of this project. You can view all tasks, change the status of tasks assigned to you, and comment on any task.
          {project.membersCanCreateTasks
            ? ' You can also create tasks. Only the Manager can edit, assign or delete tasks.'
            : ' Only the Manager can create, edit, assign or delete tasks.'}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" className="input !pl-10" placeholder="Search tasks by title" aria-label="Search tasks by title" value={filters.search} onChange={set('search')} />
        </div>
        <button
          type="button"
          aria-pressed={filters.mine}
          onClick={() => setFilters((f) => ({ ...f, mine: !f.mine }))}
          className={`btn !py-2.5 ${filters.mine ? 'btn-dark' : 'btn-outline'}`}
        >
          My tasks
        </button>
        <label className="flex items-center gap-2 text-sm text-muted">
          Priority
          <select className="input !w-auto" value={filters.priority} onChange={set('priority')}>
            <option value="">All</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Assignee
          <select className="input !w-auto" value={filters.assignee} onChange={set('assignee')} disabled={filters.mine}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {project.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort by
          <select className="input !w-auto" value={filters.sort} onChange={set('sort')}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">{newTaskButton}</div>
      </div>

      <div className="mt-6">
        {noTasksAtAll ? (
          <EmptyState title="No tasks found" action={newTaskButton || undefined}>
            This board has no tasks yet. {canCreate ? 'Create the first task and it will appear in the To Do column.' : 'The Manager can add the first task.'}
          </EmptyState>
        ) : isMobile ? (
          <div>
            <div role="tablist" aria-label="Task status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
              {columns.map((c) => (
                <button
                  key={c.status}
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === c.status}
                  onClick={() => setMobileTab(c.status)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
                    mobileTab === c.status ? 'bg-navy text-white' : 'bg-[#e3e8f0] text-ink'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[c.status].dot}`} />
                  {STATUS_META[c.status].label}
                  <span className={`rounded-full px-2 text-xs ${mobileTab === c.status ? 'bg-white text-ink' : 'bg-white/80'}`}>{c.tasks.length}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-3">
              {columns
                .find((c) => c.status === mobileTab)
                .tasks.map((t) => (
                  <TaskCard key={t.id} task={t} projectId={project.id} mobile canMove={canMove(t)} onStatusChange={requestMove} />
                ))}
              {columns.find((c) => c.status === mobileTab).tasks.length === 0 && (
                <p className="rounded-lg bg-white px-4 py-8 text-center text-sm text-muted">No tasks in this column.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_260px] md:grid-cols-4">
            {columns.map((c) => (
              <section
                key={c.status}
                aria-label={`${STATUS_META[c.status].label}, ${c.tasks.length} tasks`}
                onDragOver={(e) => {
                  if (dragId === null) return;
                  e.preventDefault();
                  setOverStatus(c.status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setOverStatus(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn(c.status, null);
                }}
                className={`min-h-[200px] rounded-card p-3 transition-colors ${overStatus === c.status ? 'bg-[#d6e6e3]' : 'bg-[#e5e9f1]'}`}
              >
                <h2 className="mb-3 flex items-center gap-2 px-1 text-[15px] font-bold">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[c.status].dot}`} />
                  {STATUS_META[c.status].label}
                  <span className="ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold">{c.tasks.length}</span>
                </h2>
                <div className="space-y-3">
                  {c.tasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projectId={project.id}
                      canMove={canMove(t)}
                      dragging={dragId === t.id}
                      onDragStart={(task) => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStatus(null);
                      }}
                      onDropOnCard={dragId !== null ? (target) => dropOn(c.status, target) : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}

            <aside className="card p-5 md:col-span-4 lg:col-span-1">
              <h2 className="text-lg font-bold">Members</h2>
              <ul className="mt-3 space-y-3">
                {project.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar user={m} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-tight">{m.name}</p>
                      <p className="text-[13px] capitalize text-muted">{m.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {isManager && (
                <Link to={`/projects/${project.id}/settings`} className="btn btn-outline mt-4 w-full">
                  Add or remove members
                </Link>
              )}
            </aside>
          </div>
        )}
      </div>

      {!noTasksAtAll && !isMobile && (
        <p className="mt-3 text-sm text-muted">
          {isManager
            ? 'Drag a card to another column to change its status.'
            : 'You can drag only the cards assigned to you. Other cards are view-only.'}
        </p>
      )}
      {filtersActive && tasks.length === 0 && !noTasksAtAll && (
        <p className="mt-3 text-sm text-muted">
          No tasks match these filters.{' '}
          <button type="button" className="link" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        </p>
      )}

      {taskModal && (
        <TaskFormModal
          project={project}
          onClose={() => setTaskModal(false)}
          onSaved={() => {
            setTaskModal(false);
            loadTasks();
            loadProject();
          }}
        />
      )}
      {blockedAsk && (
        <BlockedReasonModal
          task={blockedAsk.task}
          onCancel={() => setBlockedAsk(null)}
          onConfirm={(reason) => {
            const { task, extra } = blockedAsk;
            setBlockedAsk(null);
            applyMove(task, 'blocked', { ...extra, blockedReason: reason || undefined });
          }}
        />
      )}
    </div>
  );
}
