import { useState } from 'react';
import './BugReportModal.css';

interface BugReportModalProps {
  onClose: () => void;
  onSubmit: (description: string) => Promise<void>;
  isSubmitting: boolean;
  error: string;
}

export default function BugReportModal({ onClose, onSubmit, isSubmitting, error }: BugReportModalProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    await onSubmit(description);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Report a bug">
      <div className="bug-report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>

        <div className="bug-report-header">
          <h2>Report a Bug</h2>
          <p>Tell us what went wrong and we will send a safe snapshot of this session to the admin team.</p>
        </div>

        <div className="bug-report-body">
          <label htmlFor="bug-report-description" className="bug-report-label">
            What happened?
          </label>
          <textarea
            id="bug-report-description"
            className="bug-report-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: My creation stopped working after I asked for a change."
            maxLength={500}
            autoFocus
          />

          <div className="bug-report-meta">
            <p>We will include:</p>
            <ul>
              <li>Your bug note</li>
              <li>A small snapshot of your recent AI chat</li>
              <li>A snapshot of your current project code</li>
            </ul>
            <p className="bug-report-note">Please do not type personal information here.</p>
          </div>

          {error && <div className="bug-report-error">{error}</div>}

          <div className="bug-report-actions">
            <button className="bug-report-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="bug-report-submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Bug Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
