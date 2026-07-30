'use client';

import { useTranslations } from 'next-intl';
import { Badge, Bdi } from '@/components/ui';
import { useFormatters } from '@/i18n/use-format';
import {
  NotificationListItem,
  NotificationStatus,
  NotificationType,
} from '@/lib/types';

/**
 * Canonical notification-type keys. Labels are resolved at render time via the
 * `notifications.types.<type>` namespace — this map exists so callers can
 * enumerate the type filter options without hardcoding the list.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  owner_setup_link: 'owner_setup_link',
  trial_countdown: 'trial_countdown',
  trial_expired: 'trial_expired',
  hotel_suspended: 'hotel_suspended',
  hotel_reactivated: 'hotel_reactivated',
};

export const NOTIFICATION_STATUS_TONE: Record<
  NotificationStatus,
  'warning' | 'success' | 'danger'
> = {
  pending: 'warning',
  sent: 'success',
  failed: 'danger',
};

export function NotificationStatusBadge({
  status,
  attemptCount,
}: {
  status: NotificationStatus;
  attemptCount: number;
}) {
  const t = useTranslations('notifications');
  const label = t(`status.${status}`);
  return (
    <Badge tone={NOTIFICATION_STATUS_TONE[status]}>
      {status === 'failed' && attemptCount > 0
        ? t('statusWithAttempts', {
            status: label,
            attempts: t('attempts', { count: attemptCount }),
          })
        : label}
    </Badge>
  );
}

/** Shared log table (Story 6.7 AC2) — used by /notifications and the hotel tab. */
export function NotificationsTable({
  items,
  onSelect,
  showHotel = true,
}: {
  items: NotificationListItem[];
  onSelect: (item: NotificationListItem) => void;
  showHotel?: boolean;
}) {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const { formatDateTime } = useFormatters();

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <table className="w-full text-start text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3 font-medium">{t('table.date')}</th>
            <th className="px-4 py-3 font-medium">{t('table.type')}</th>
            <th className="px-4 py-3 font-medium">{t('table.recipient')}</th>
            {showHotel && (
              <th className="px-4 py-3 font-medium">{t('table.hotel')}</th>
            )}
            <th className="px-4 py-3 font-medium">{t('table.channel')}</th>
            <th className="px-4 py-3 font-medium">{t('table.language')}</th>
            <th className="px-4 py-3 font-medium">{t('table.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect(item)}
              className="cursor-pointer transition-colors hover:bg-paper"
            >
              <td className="px-4 py-3 text-ink-soft">
                {formatDateTime(item.createdAt)}
              </td>
              <td className="px-4 py-3 text-ink">
                {t(`types.${item.type}`)}
                {item.resendOfId && (
                  <p className="text-xs text-ink-soft">{t('table.resend')}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="text-ink">{item.recipientName}</p>
                {/* Email is a Latin value — isolate it in RTL (AC 7.3-5). */}
                <Bdi className="block text-xs text-ink-soft">
                  {item.recipientEmail}
                </Bdi>
              </td>
              {showHotel && (
                <td className="px-4 py-3 text-ink-soft">
                  {item.hotel ? (
                    <Bdi>{item.hotel.nameEn}</Bdi>
                  ) : (
                    tCommon('states.notAvailable')
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-ink-soft">{item.channel}</td>
              <td className="px-4 py-3 uppercase text-ink-soft">
                {item.language}
              </td>
              <td className="px-4 py-3">
                <NotificationStatusBadge
                  status={item.status}
                  attemptCount={item.attemptCount}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
