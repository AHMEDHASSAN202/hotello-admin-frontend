'use client';

import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, useEffect } from 'react';

/* ----------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'ghost' | 'danger';

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white hover:bg-ink-deep disabled:bg-ink/50',
  ghost:
    'bg-transparent text-ink border border-line hover:border-ink disabled:opacity-50',
  danger:
    'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
};

export function Button({
  variant = 'primary',
  loading = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${buttonStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Field */

export function Field({
  label,
  hint,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50"
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ Badge */

type BadgeTone = 'neutral' | 'gold' | 'success' | 'danger' | 'warning';

const badgeStyles: Record<BadgeTone, string> = {
  neutral: 'bg-paper text-ink-soft border border-line',
  gold: 'bg-gold-soft text-ink border border-gold/40',
  success: 'bg-success/10 text-success border border-success/30',
  danger: 'bg-danger/10 text-danger border border-danger/30',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
};

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[tone]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-y-auto rounded-xl bg-white p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ink-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Empty & Error */

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-white py-12 text-center">
      <Inbox size={28} className="text-ink-soft/50" aria-hidden />
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 py-10 text-center">
      <AlertTriangle size={28} className="text-danger" aria-hidden />
      <p className="font-medium text-ink">Something went wrong</p>
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
