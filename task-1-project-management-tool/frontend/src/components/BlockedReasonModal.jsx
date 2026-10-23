import { useState } from 'react';
import { Field, Modal } from './ui';

/** Asked when a task is moved to Blocked: the reason is optional and shows on the card (FR-TASK-16). */
export default function BlockedReasonModal({ task, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      title="Mark as Blocked"
      onClose={onCancel}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm(reason.trim())}>
            Mark as Blocked
          </button>
        </>
      }
    >
      <p className="mb-4 text-[15px] text-muted">
        Say what is stopping &ldquo;{task.title}&rdquo; so your team can help. This note appears on the card.
      </p>
      <Field label="Reason" optional>
        {(p) => (
          <input
            {...p}
            className="input"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Waiting for the committee reply"
            autoFocus
          />
        )}
      </Field>
    </Modal>
  );
}
