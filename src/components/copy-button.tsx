'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/** Copies a value to the clipboard with a brief visual confirmation. */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useTranslations('hotels');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const fallbackLabel = label ?? t('copy.copy');

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to show.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={fallbackLabel}
      title={fallbackLabel}
      className="inline-flex items-center gap-1 rounded p-1.5 text-ink-soft transition-colors hover:text-ink"
    >
      {copied ? (
        <Check size={15} className="text-success" aria-hidden />
      ) : (
        <Copy size={15} aria-hidden />
      )}
    </button>
  );
}
