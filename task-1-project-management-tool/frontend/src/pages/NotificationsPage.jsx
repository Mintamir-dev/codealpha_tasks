import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EmptyState, Spinner } from '../components/ui';
import { useNotifications } from '../context/NotificationsContext';
import { useSocketEvents } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';
import { relativeTime } from '../utils/format';

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const toast = useToast();
  const { setUnreadCount, refresh } = useNotifications();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await api.listNotifications({ limit: 100 });
      setItems(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      setError(err.message);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvents({
    'notification:new': ({ notification }) => setItems((list) => (list ? [notification, ...list] : list)),
  });

  async function open(n) {
    if (!n.isRead) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      api.markRead(n.id).then(refresh).catch(() => {});
    }
    navigate(n.taskId ? `/projects/${n.projectId}/tasks/${n.taskId}` : `/projects/${n.projectId}`);
  }

  async function markAll() {
    try {
      await api.markAllRead();
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const unread = items ? items.filter((n) => !n.isRead).length : 0;

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Notifications</h1>
          {items && <p className="mt-1 text-muted">{unread === 0 ? 'You are all caught up.' : `${unread} unread`}</p>}
        </div>
        <button type="button" className="btn btn-outline" onClick={markAll} disabled={!unread}>
          Mark all as read
        </button>
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-6">
        {items === null && !error ? (
          <Spinner />
        ) : items && items.length === 0 ? (
          <EmptyState title="No notifications yet">
            You will see a message here when someone assigns you a task, comments, mentions you or adds you to a project.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {(items || []).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={`flex w-full items-start gap-4 rounded-xl border px-5 py-4 text-left transition-colors ${
                    n.isRead ? 'border-line bg-white hover:bg-page' : 'border-brand-mid bg-brand-soft hover:bg-[#d8ebe8]'
                  }`}
                >
                  <span className="mt-2 flex h-2.5 w-2.5 shrink-0 items-center justify-center" aria-hidden={n.isRead}>
                    {!n.isRead && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[16px] ${n.isRead ? '' : 'font-semibold'}`}>
                      {!n.isRead && <span className="sr-only">Unread: </span>}
                      {n.message}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {n.projectTitle ? `${n.projectTitle} \u00B7 ` : ''}
                      {relativeTime(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
