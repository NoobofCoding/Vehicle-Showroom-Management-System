import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  X,
} from "lucide-react"

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function StatusBadge({ value }) {
  const tone = ["Completed", "Active", "In stock"].includes(value)
    ? "success"
    : ["Low stock", "Pending"].includes(value)
      ? "warning"
      : ["Cancelled", "Out of stock"].includes(value)
        ? "danger"
        : "neutral"
  return <span className={`status status-${tone}`}>{value}</span>
}

export function SearchBox({ value, onChange, placeholder = "Search records" }) {
  return (
    <div className="search-box">
      <Search size={17} aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

export function EmptyState({
  title = "No records found",
  message = "Try changing your search or filters.",
}) {
  return (
    <div className="empty-state">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <div className="pagination-bar">
      <span>
        Page {page} of {pages}
      </span>
      <div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onClose,
}) {
  if (!open) return null
  return (
    <div
      className="modal-backdrop-custom"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <div className="dialog-icon">
            <AlertTriangle size={20} />
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>
        <h2 id="dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-outline-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function VehiclePlaceholder() {
  return (
    <div
      className="vehicle-placeholder"
      aria-label="Neutral vehicle illustration"
    >
      <svg viewBox="0 0 680 260" role="img">
        <path
          d="M105 167h36l36-67c11-21 29-33 53-34h222c24 0 43 11 58 32l48 69h35c18 0 33 15 33 33v12H71v-12c0-18 15-33 34-33Z"
          fill="currentColor"
          opacity=".12"
        />
        <path
          d="m188 165 34-62c5-9 14-14 25-14h188c13 0 22 5 30 15l43 61H188Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
        />
        <path
          d="M91 166h497c22 0 40 18 40 40v11H51v-11c0-22 18-40 40-40Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
        />
        <circle
          cx="167"
          cy="214"
          r="31"
          fill="#fff"
          stroke="currentColor"
          strokeWidth="8"
        />
        <circle
          cx="517"
          cy="214"
          r="31"
          fill="#fff"
          stroke="currentColor"
          strokeWidth="8"
        />
        <path d="M342 91v74" stroke="currentColor" strokeWidth="7" />
      </svg>
      <span>Vehicle image not provided</span>
    </div>
  )
}
