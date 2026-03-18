import type { BugReportResolutionNotification } from '../types';
import './BugResolutionModal.css';

interface BugResolutionModalProps {
  notification: BugReportResolutionNotification;
  pendingCount: number;
  isAcknowledging: boolean;
  onClose: () => void;
}

function formatReviewedAt(reviewedAt?: string | null) {
  if (!reviewedAt) return null;
  const date = new Date(reviewedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildFallbackMessage(notification: BugReportResolutionNotification) {
  if (notification.status === 'resolved') {
    return 'We checked your bug report and fixed the issue. Thanks for helping us make the studio better.';
  }
  return 'We reviewed your bug report. It looks like this was not a platform bug, so we added a note to help next time.';
}

export default function BugResolutionModal({
  notification,
  pendingCount,
  isAcknowledging,
  onClose,
}: BugResolutionModalProps) {
  const reviewedLabel = formatReviewedAt(notification.reviewedAt);
  const projectLabel = notification.projectName?.trim() || 'your project';
  const title = notification.status === 'resolved' ? 'Bug update: fixed' : 'Bug update';
  const summary =
    notification.status === 'resolved'
      ? `Good news. We finished reviewing the report for ${projectLabel}.`
      : `We reviewed the report for ${projectLabel} and left a note for you.`;
  const message = notification.reviewNote?.trim() || buildFallbackMessage(notification);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Bug report update">
      <div className="bug-resolution-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="bug-resolution-summary">{summary}</p>

        <div className="bug-resolution-card">
          <p className="bug-resolution-label">What you reported</p>
          <p className="bug-resolution-description">{notification.description}</p>
          {reviewedLabel && <p className="bug-resolution-date">Reviewed {reviewedLabel}</p>}
        </div>

        <div className="bug-resolution-message">
          <p className="bug-resolution-label">Update from the team</p>
          <p>{message}</p>
        </div>

        {pendingCount > 1 && <p className="bug-resolution-count">You have {pendingCount} bug updates to review.</p>}

        <div className="bug-resolution-actions">
          <button type="button" className="bug-resolution-button" onClick={onClose} disabled={isAcknowledging}>
            {isAcknowledging ? 'Saving...' : pendingCount > 1 ? 'Next update' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
