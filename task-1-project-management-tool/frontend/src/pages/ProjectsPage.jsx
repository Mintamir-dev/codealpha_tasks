import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ProjectFormModal from '../components/ProjectFormModal';
import { AvatarStack, EmptyState, ProgressBar, ProjectStatusPill, Spinner } from '../components/ui';
import { useDebounce, useDocumentTitle } from '../hooks';
import { formatLongDate } from '../utils/format';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

function ProjectCard({ project }) {
  const complete = project.status === 'completed';
  const roleLabel = project.myRole === 'manager' ? 'Manager' : 'Member';
  const end = project.endDate ? `${complete ? 'Ended' : 'Ends'} ${formatLongDate(project.endDate)}` : null;

  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        className="flex h-full flex-col rounded-card border border-line bg-white p-5 transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-snug">{project.title}</h2>
          <ProjectStatusPill status={project.status} />
        </div>
        <p className="mt-3 line-clamp-2 min-h-[3rem] text-[15px] text-muted">{project.description || 'No description yet.'}</p>
        <div className="mt-4 flex items-baseline justify-between text-sm text-muted">
          <span>
            {project.counts.done} of {project.counts.total} tasks done
          </span>
          <span className="font-bold text-ink">{project.progress}%</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar value={project.progress} complete={complete} label={`${project.title} progress`} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <AvatarStack users={project.members} total={project.memberCount} />
          <span className="text-right text-[13px] text-muted">
            {roleLabel}
            {end && ` \u00B7 ${end}`}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function ProjectsPage() {
  useDocumentTitle('Projects');
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { projects: list } = await api.listProjects({ status, search: debouncedSearch.trim() });
      setProjects(list);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtering = Boolean(status || debouncedSearch.trim());
  const newProjectButton = (
    <button type="button" className="btn btn-primary !px-5 !py-3" onClick={() => setCreating(true)}>
      <span aria-hidden="true" className="text-lg leading-none">+</span> New project
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Your projects</h1>
          {projects && projects.length > 0 && (
            <p className="mt-1 text-muted">
              {projects.length} project{projects.length === 1 ? '' : 's'} you manage or belong to.
            </p>
          )}
        </div>
        {(projects?.length > 0 || filtering) && newProjectButton}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {(projects?.length > 0 || filtering) && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={status === f.value}
                onClick={() => setStatus(f.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  status === f.value ? 'border-navy bg-navy text-white' : 'border-[#b9c2d0] bg-white text-ink hover:bg-page'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" className="input !pl-10" placeholder="Search projects by name" aria-label="Search projects by name" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-6">
        {projects === null && !error ? (
          <Spinner />
        ) : projects && projects.length === 0 ? (
          filtering ? (
            <p className="rounded-card border border-line bg-white px-6 py-12 text-center text-muted">No projects match your search or filter.</p>
          ) : (
            <EmptyState
              icon={
                <svg width="64" height="64" viewBox="0 0 32 32" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="24" rx="3" fill="#b5d8d3" />
                  <rect x="13" y="4" width="6" height="14" rx="3" fill="#0a5f58" />
                  <rect x="22" y="4" width="6" height="8" rx="3" fill="#b5d8d3" />
                </svg>
              }
              title="Create your first project"
              action={
                <button type="button" className="btn btn-primary !px-6 !py-3" onClick={() => setCreating(true)}>
                  Create project
                </button>
              }
            >
              A project holds your team, a board and all its tasks. You become its Manager and can add members by email.
            </EmptyState>
          )
        ) : projects ? (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ul>
        ) : null}
      </div>

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onCreated={(project) => {
            setCreating(false);
            navigate(`/projects/${project.id}`);
          }}
        />
      )}
    </div>
  );
}
