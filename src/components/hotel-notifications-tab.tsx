'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { NotificationDetailModal } from '@/components/notification-detail-modal';
import { NotificationsTable } from '@/components/notifications-table';
import { EmptyState, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { NotificationListItem, Paginated } from '@/lib/types';

/** Story 6.7 AC5 — this hotel's notifications, same permission gating. */
export function HotelNotificationsTab({ hotelId }: { hotelId: string }) {
  const t = useTranslations('hotels');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const [items, setItems] = useState<NotificationListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<Paginated<NotificationListItem>>(
        `/notifications?hotelId=${hotelId}&pageSize=50`,
      );
      setItems(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? resolveError(err)
          : t('notifications.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [hotelId, resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items || items.length === 0) {
    return (
      <EmptyState
        title={t('notifications.emptyTitle')}
        hint={t('notifications.emptyHint')}
      />
    );
  }

  return (
    <>
      <NotificationsTable
        items={items}
        onSelect={(item) => setSelectedId(item.id)}
        showHotel={false}
      />
      <NotificationDetailModal
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </>
  );
}
