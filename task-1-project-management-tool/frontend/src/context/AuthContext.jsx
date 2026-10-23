import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { setUnauthorizedHandler } from '../api/client';
import { TOKEN_KEY } from '../constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const justLoggedIn = useRef(false);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
  }, [clear]);

  // On page load (or when the token changes) fetch the current user.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    if (justLoggedIn.current) {
      justLoggedIn.current = false;
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    api
      .me()
      .then(({ user: me }) => {
        if (!cancelled) setUser(me);
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) clear();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, clear]);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    justLoggedIn.current = true;
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setToken(result.token);
    return result.user;
  }, []);

  const register = useCallback(
    async ({ name, email, password }) => {
      await api.register({ name, email, password });
      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    clear();
  }, [clear]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
