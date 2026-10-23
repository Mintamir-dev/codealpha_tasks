import { useEffect, useId, useRef } from 'react';
import { PRIORITY_META, PROJECT_STATUS_META } from '../constants';
import { avatarColor, initials } from '../utils/format';

/** Round avatar with initials. No user => dashed circle (unassigned). */
export function Avatar({ user, size = 32, ring = false }) {
  const fontSize = Math.max(10, Math.round(size * 0.38));
  if (!user) {
    return (
      <span
        title="Unassigned"
        role="img"
        aria-label="Unassigned"
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-faint text-faint"
        style={{ width: size, height: size, fontSize }}
      >
        &ndash;
      </span>
    );
  }
  return (
    <span
      title={user.name}
      role="img"
      aria-label={user.name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${
        ring ? 'ring-2 ring-white' : ''
      }`}
      style={{ width: size, height: size, fontSize, backgroundColor: avatarColor(user.id) }}
    >
      {initials(user.name)}
    </span>
  );
}

/** First few avatars overlapped, plus "+N" for the rest. */
export function AvatarStack({ users, total, size = 30 }) {
  const extra = Math.max(0, (total ?? users.length) - users.length);
  return (
    <div className="flex items-center -space-x-2">
      {users.map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-st-todo font-semibold text-white ring-2 ring-white"
          style={{ width: size, height: size, fontSize: 11 }}
          aria-label={`${extra} more members`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export function PriorityPill({ priority }) {
  const meta = PRIORITY_META[priority];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>;
}

export function ProjectStatusPill({ status }) {
  const meta = PROJECT_STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function ProgressBar({ value, complete = false, label }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label || 'Progress'}
      className="h-2 w-full overflow-hidden rounded-full bg-[#dfe4ec]"
    >
      <div className={`h-full rounded-full ${complete ? 'bg-st-done' : 'bg-brand'}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function Spinner({ label = 'Loading\u2026' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-muted">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

/** Label + control + error/hint, wired for screen readers. Pass a render function to get the ids. */
export function Field({ label, optional = false, error, hint, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-faint">(optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level error, e.g. "Incorrect email or password". */
export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function EmptyState({ title, children, action, icon }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-[#b9c2d0] bg-white px-6 py-16 text-center">
      {icon}
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] text-muted">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, width = 'max-w-lg' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/55 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${width} rounded-card bg-white p-6 shadow-xl outline-none`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-mr-1 rounded p-1 text-2xl leading-none text-faint hover:text-ink" aria-label="Close">
            &times;
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, children, confirmLabel, danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working\u2026' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[15px] text-muted">{children}</div>
    </Modal>
  );
}

/** Two or three buttons that switch a view (Log in / Create account, Users / Projects). */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex w-full gap-1 rounded-xl bg-[#e3e8f0] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink/80 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
