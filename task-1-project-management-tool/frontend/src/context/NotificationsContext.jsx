import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { useSocketEvents } from './SocketContext';
import { useToast } from './ToastContext';

const NotificationsContext = createContext({ unreadCount: 0, setUnreadCount: () => {}, refresh: () => {} });

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    api
      .unreadCount()
      .then((r) => setUnreadCount(r.unreadCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setUnreadCount(0);
  }, [user, refresh]);

  // FR-RT-01: new notifications arrive live; the bell updates without a page reload.
  useSocketEvents({
    'notification:new': ({ notification }) => {
      setUnreadCount((n) => n + 1);
      toast(notification.message, 'info');
    },
  });

  return (
    <NotificationsContext.Provider value={{ unreadCount, setUnreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
