'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { NotificationStatusBadge } from '@/components/notifications-table';
import { Bdi, Button, ErrorState, Modal } from '@/components/ui';
import { useFormatters } from '@/i18n/use-format';
import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { NotificationDetail } from '@/lib/types';
import { useMe } from '@/lib/use-me';

/**
 * Story 6.7 AC3/AC4 — rendered email preview (setup-link bodies arrive with
 * the token already masked server-side) + delivery timeline + resend.
 */
export function NotificationDetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  /** Called after a successful resend so lists can refresh. */
  onChanged?: () => void;
}) {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatDateTime } = useFormatters();
  const { hasPermission } = useMe();
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [confirmingResend, setConfirmingResend] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resentNote, setResentNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await api<NotificationDetail>(`/notifications/${id}`));
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [id, resolveError]);

  useEffect(() => {
    setDetail(null);
    setConfirmingResend(false);
    setResendError(null);
    setResentNote(null);
    load();
  }, [load]);

  async function handleResend() {
    if (!detail) return;
    setResending(true);
    setResendError(null);
    try {
      await api(`/notifications/${detail.id}/resend`, { method: 'POST' });
      setResentNote(
        detail.type === 'owner_setup_link'
          ? t('resend.resentSetupLink')
          : t('resend.resentGeneric'),
      );
      setConfirmingResend(false);
      onChanged?.();
    } catch (err) {
      setResendError(resolveError(err));
    } finally {
      setResending(false);
    }
  }

  const canResend =
    detail?.status === 'failed' && hasPermission('notifications.resend');

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title={detail ? t(`types.${detail.type}`) : t('detail.fallbackTitle')}
      wide
    >
      {loading ? (
        <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : detail ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <NotificationStatusBadge
              status={detail.status}
              attemptCount={detail.attemptCount}
            />
            <span className="text-ink-soft">
              {t('detail.toLabel')}{' '}
              <span className="text-ink">{detail.recipientName}</span>{' '}
              {/* Email is a Latin value — isolate it in RTL (AC 7.3-5). */}
              <Bdi>&lt;{detail.recipientEmail}&gt;</Bdi>
            </span>
            {detail.hotel && (
              <span className="text-ink-soft">
                {t('detail.hotelLabel')}{' '}
                <span className="text-ink">
                  <Bdi>{detail.hotel.nameEn}</Bdi>
                </span>
              </span>
            )}
            <span className="uppercase text-ink-soft">{detail.language}</span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              {t('detail.subject')}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {detail.subject || tCommon('states.notAvailable')}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              {t('detail.bodyPreview')}
            </p>
            {detail.bodyHtml ? (
              // The email body is backend-rendered HTML in the recipient's own
              // language; render it in its own direction, don't translate it.
              <iframe
                sandbox=""
                srcDoc={detail.bodyHtml}
                title={t('detail.bodyPreviewTitle')}
                className="mt-1 h-80 w-full rounded-lg border border-line bg-white"
              />
            ) : (
              <p className="mt-1 text-sm text-ink-soft">{t('detail.noBody')}</p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              {t('detail.timeline')}
            </p>
            {detail.attempts.length === 0 ? (
              <p className="mt-1 text-sm text-ink-soft">
                {t('detail.noAttempts')}
              </p>
            ) : (
              <ol className="mt-1 space-y-1 text-sm">
                {detail.attempts.map((attempt, index) => (
                  <li
                    key={`${attempt.at}-${index}`}
                    className="flex items-baseline gap-2"
                  >
                    <span className="text-xs text-ink-soft">
                      {formatDateTime(attempt.at)}
                    </span>
                    {attempt.ok ? (
                      <span className="text-success">
                        {t('detail.delivered')}
                      </span>
                    ) : (
                      <span className="text-danger">
                        {attempt.error
                          ? t('detail.failedWithError', { error: attempt.error })
                          : t('detail.failed')}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {resendError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {resendError}
            </div>
          )}
          {resentNote && (
            <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
              {resentNote}
            </div>
          )}

          {/* Explicit confirmation — resending a setup link invalidates the
              previous token, so it never fires on a single click. */}
          {confirmingResend && !resentNote && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {detail.type === 'owner_setup_link'
                ? t('resend.confirmSetupLink')
                : t('resend.confirmGeneric', {
                    email: detail.recipientEmail,
                  })}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button
              variant="ghost"
              onClick={
                confirmingResend ? () => setConfirmingResend(false) : onClose
              }
            >
              {confirmingResend
                ? tCommon('actions.cancel')
                : tCommon('actions.close')}
            </Button>
            {canResend &&
              !resentNote &&
              (confirmingResend ? (
                <Button onClick={handleResend} loading={resending}>
                  <RefreshCw size={15} aria-hidden />
                  {detail.type === 'owner_setup_link'
                    ? t('resend.confirmRegenerate')
                    : t('resend.confirmResend')}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setResendError(null);
                    setConfirmingResend(true);
                  }}
                >
                  <RefreshCw size={15} aria-hidden />
                  {detail.type === 'owner_setup_link'
                    ? t('resend.regenerateAction')
                    : t('resend.resendAction')}
                </Button>
              ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
