import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Logo from './Logo';
import { Avatar } from './ui';

const navClass = ({ isActive }) =>
  `rounded-lg px-4 py-2 text-[15px] font-semibold transition-colors ${
    isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink hover:bg-page'
  }`;

function Bell({ count }) {
  return (
    <NavLink
      to="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className={({ isActive }) =>
        `relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-brand-soft' : 'hover:bg-page'}`
      }
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-3 px-4 sm:px-6">
          <Link to="/projects" className="mr-2 flex items-center gap-2.5 text-lg font-bold">
            <Logo />
            <span className="hidden sm:inline">PM Tool</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/projects" className={navClass}>
              Projects
            </NavLink>
            {user?.systemRole === 'admin' && (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Bell count={unreadCount} />
            <Link to="/profile" aria-label="Your profile" className="rounded-full">
              <Avatar user={user} size={40} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
