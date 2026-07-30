'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { NotificationStatusBadge } from '@/components/notifications-table';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { NotificationListItem, Paginated } from '@/lib/types';
import { useMe } from '@/lib/use-me';

/**
 * Story 6.4 AC3 — shows the delivery status of the latest owner_setup_link
 * email alongside the manual copy-link fallback. Hidden without
 * `notifications.read`; the copy-link UI remains regardless.
 */
export function SetupEmailStatus({ hotelId }: { hotelId: string }) {
  const t = useTranslations('hotels');
  const resolveError = useApiError();
  const { hasPermission } = useMe();
  const canRead = hasPermission('notifications.read');

  const [latest, setLatest] = useState<NotificationListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<Paginated<NotificationListItem>>(
        `/notifications?hotelId=${hotelId}&type=owner_setup_link&pageSize=1`,
      );
      setLatest(res.data[0] ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? resolveError(err) : t('setupEmail.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [hotelId, resolveError, t]);

  useEffect(() => {
    if (canRead) load();
  }, [canRead, load]);

  if (!canRead) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink-soft">{t('setupEmail.label')}</span>
      {loading ? (
        <span className="text-ink-soft">{t('setupEmail.checking')}</span>
      ) : error ? (
        <span className="text-danger">{error}</span>
      ) : latest ? (
        <NotificationStatusBadge
          status={latest.status}
          attemptCount={latest.attemptCount}
        />
      ) : (
        <span className="text-ink-soft">{t('setupEmail.notSent')}</span>
      )}
      <button
        onClick={load}
        aria-label={t('setupEmail.refreshAria')}
        className="rounded p-1 text-ink-soft hover:text-ink"
      >
        <RefreshCw size={14} aria-hidden />
      </button>
    </div>
  );
}
