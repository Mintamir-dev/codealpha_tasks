import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_API_URL || '';

/**
 * One Socket.IO connection while the user is logged in (FR-RT-01).
 * If it fails, the app keeps working through the REST API; only live updates stop.
 */
export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }
    const s = SOCKET_URL ? io(SOCKET_URL, { auth: { token } }) : io({ auth: { token } });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

/** useSocketEvents({ 'task:moved': (payload) => ... }) - subscribes while the component is mounted. */
export function useSocketEvents(handlers) {
  const socket = useContext(SocketContext);
  const latest = useRef(handlers);
  latest.current = handlers;
  const names = Object.keys(handlers).join(',');

  useEffect(() => {
    if (!socket) return undefined;
    const subscriptions = names.split(',').filter(Boolean).map((name) => {
      const listener = (payload) => latest.current[name]?.(payload);
      socket.on(name, listener);
      return [name, listener];
    });
    return () => subscriptions.forEach(([name, listener]) => socket.off(name, listener));
  }, [socket, names]);
}
