import { useEffect, useState } from 'react';
import { api } from '../api';
import { ProgressBar, ProjectStatusPill, Segmented, Spinner } from '../components/ui';
import { useDocumentTitle } from '../hooks';
import { formatIsoDate, formatLongDate } from '../utils/format';

function Table({ columns, rows, empty }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line bg-[#f7f8fb] text-sm text-muted">
            {columns.map((c) => (
              <th key={c} scope="col" className="px-5 py-3.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  useDocumentTitle('Administration');
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(null);
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = tab === 'users' ? api.adminUsers().then((r) => setUsers(r.users)) : api.adminProjects().then((r) => setProjects(r.projects));
    load.then(() => setError('')).catch((err) => setError(err.message));
  }, [tab]);

  return (
    <div>
      <h1 className="text-4xl font-bold">Administration</h1>
      <p className="mt-1 text-muted">View all users and all projects in the system.</p>

      <div className="mt-6 w-full max-w-[300px]">
        <Segmented
          label="Administration sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'users', label: 'Users' },
            { value: 'projects', label: 'Projects' },
          ]}
        />
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-6">
        {tab === 'users' ? (
          users === null ? (
            !error && <Spinner />
          ) : (
            <Table
              columns={['Name', 'Email', 'System role', 'Projects', 'Joined']}
              empty="No users yet."
              rows={users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3.5 font-semibold">{u.name}</td>
                  <td className="px-5 py-3.5 text-muted">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.systemRole === 'admin' ? 'bg-navy text-white' : 'bg-[#e4e8ef] text-muted'}`}>
                      {u.systemRole === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">{u.projectCount}</td>
                  <td className="px-5 py-3.5 text-muted">{formatIsoDate(u.joinedAt)}</td>
                </tr>
              ))}
            />
          )
        ) : projects === null ? (
          !error && <Spinner />
        ) : (
          <Table
            columns={['Project', 'Status', 'Manager', 'Members', 'Tasks done', 'Ends']}
            empty="No projects yet."
            rows={projects.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3.5 font-semibold">{p.title}</td>
                <td className="px-5 py-3.5">
                  <ProjectStatusPill status={p.status} />
                </td>
                <td className="px-5 py-3.5 text-muted">{p.managerName || '\u2013'}</td>
                <td className="px-5 py-3.5">{p.memberCount}</td>
                <td className="px-5 py-3.5">
                  <div className="flex min-w-[150px] items-center gap-3">
                    <div className="w-20">
                      <ProgressBar value={p.progress} complete={p.status === 'completed'} label={`${p.title} progress`} />
                    </div>
                    <span className="text-sm text-muted">
                      {p.counts.done}/{p.counts.total}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-muted">{p.endDate ? formatLongDate(p.endDate) : '\u2013'}</td>
              </tr>
            ))}
          />
        )}
      </div>
    </div>
  );
}
