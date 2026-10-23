import { Link, useNavigate } from 'react-router-dom';
import { STATUSES, STATUS_META } from '../constants';
import { dueLabel } from '../utils/format';
import { Avatar, PriorityPill } from './ui';

export default function TaskCard({
  task,
  projectId,
  canMove,
  mobile = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  onDropOnCard,
  onStatusChange,
}) {
  const navigate = useNavigate();
  const due = dueLabel(task);
  const href = `/projects/${projectId}/tasks/${task.id}`;

  return (
    <article
      draggable={canMove && !mobile}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(task.id));
        onDragStart?.(task);
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(e) => {
        if (onDropOnCard) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!onDropOnCard) return;
        e.preventDefault();
        e.stopPropagation();
        onDropOnCard(task);
      }}
      onClick={(e) => {
        if (e.target.closest('a, select, button')) return;
        navigate(href);
      }}
      className={`rounded-lg border border-line border-t-[3px] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,27,45,0.06)] ${STATUS_META[task.status].bar} ${
        canMove && !mobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <h3 className="text-[15px] font-semibold leading-snug">
        <Link to={href} className="hover:underline">
          {task.title}
        </Link>
      </h3>

      {task.status === 'blocked' && task.blockedReason && (
        <p className="mt-2.5 rounded-md bg-warn-soft px-2.5 py-2 text-[13px] text-warn">Blocked: {task.blockedReason}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityPill priority={task.priority} />
        <div className="flex min-w-0 items-center gap-2">
          <span className={`text-[13px] ${due.danger ? 'font-semibold text-danger' : 'text-muted'}`}>{due.text}</span>
          <Avatar user={task.assignee} size={28} />
        </div>
      </div>

      {mobile && (
        <label className="mt-3 flex items-center gap-3 text-sm text-muted">
          Status
          <select
            className="input !py-2"
            value={task.status}
            disabled={!canMove}
            onChange={(e) => onStatusChange?.(task, e.target.value)}
            aria-label={`Status of ${task.title}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>
      )}
    </article>
  );
}
