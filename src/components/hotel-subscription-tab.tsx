'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { ChangePlanModal } from '@/components/change-plan-modal';
import { Badge, Button, EmptyState, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
import { useMe } from '@/lib/use-me';
import { BillingCycle, HotelSubscriptionView } from '@/lib/types';

const STATUS_TONE = {
  active: 'success',
  trial: 'gold',
  past_due: 'warning',
  canceled: 'neutral',
  expired: 'danger',
} as const;

/** Story 4.6 view, embedded as the hotel details Subscription tab (5.2 AC3). */
export function HotelSubscriptionTab({ hotelId }: { hotelId: string }) {
  const t = useTranslations('hotels');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatDate, formatNumber } = useFormatters();
  const { hasPermission } = useMe();
  const [view, setView] = useState<HotelSubscriptionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const cycleLabel = (cycle: BillingCycle) => t(`billingCycleValue.${cycle}`);

  const load = useCallback(async () => {
    setError(null);
    setView(null);
    try {
      setView(await api<HotelSubscriptionView>(`/hotels/${hotelId}/subscription`));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? resolveError(err)
          : t('subscription.loadError'),
      );
    }
  }, [hotelId, resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (view === null)
    return <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>;

  const current = view.current;
  const canChange = hasPermission('subscriptions.update');
  const planName = current?.plan
    ? `${current.plan.nameEn}`
    : (view.history[0]?.planNameEn ?? tCommon('states.notAvailable'));

  return (
    <div className="space-y-4">
      {current === null ? (
        <EmptyState
          title={t('subscription.noSubscription')}
          hint={t('subscription.noSubscriptionHint')}
          action={
            canChange && (
              <Button onClick={() => setChanging(true)}>
                {t('subscription.assignPlan')}
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-semibold text-ink">
                {t('subscription.currentPlan')}
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-lg font-medium text-ink">{planName}</p>
                <Badge tone={STATUS_TONE[current.status]}>
                  {t(`subscriptionStatus.${current.status}`)}
                </Badge>
                {current.status === 'trial' && current.daysRemaining !== null && (
                  <span className="text-sm text-ink-soft">
                    {t('subscription.daysRemaining', {
                      count: current.daysRemaining,
                    })}
                  </span>
                )}
              </div>
              {current.plan && (
                <p className="mt-1 text-sm text-ink-soft" dir="rtl">
                  {current.plan.nameAr}
                </p>
              )}
              <p className="mt-2 text-sm text-ink-soft">
                {t('subscription.billingSince', {
                  cycle: cycleLabel(current.billingCycle),
                  date: formatDate(current.startDate),
                })}
              </p>
            </div>
            {canChange && (
              <Button variant="ghost" onClick={() => setChanging(true)}>
                {t('subscription.changePlan')}
              </Button>
            )}
          </div>
        </div>
      )}

      {view.usage && view.usage.length > 0 && (
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-display font-semibold text-ink">
            {t('subscription.usageTitle')}
          </h2>
          <div className="mt-3 space-y-3">
            {view.usage.map((row) => {
              const label = t.has(`subscription.usageLabel.${row.label}`)
                ? t(`subscription.usageLabel.${row.label}`)
                : row.label;
              return (
              <div key={row.field}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">{label}</span>
                  <span className="font-medium text-ink">
                    {row.max === null
                      ? t('subscription.usageUnlimited', {
                          used: formatNumber(row.used),
                        })
                      : t('subscription.usageOf', {
                          used: formatNumber(row.used),
                          max: formatNumber(row.max),
                        })}
                  </span>
                </div>
                {row.pct !== null && (
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper"
                    role="progressbar"
                    aria-valuenow={Math.min(row.pct, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('subscription.usageAria', { label })}
                  >
                    <div
                      className={`h-full rounded-full ${
                        row.pct >= 100
                          ? 'bg-danger'
                          : row.pct >= 80
                            ? 'bg-amber-400'
                            : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display font-semibold text-ink">
          {t('subscription.history')}
        </h2>
        {view.history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            {t('subscription.noHistory')}
          </p>
        ) : (
          <table className="mt-3 w-full text-start text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="py-2 pe-4 font-medium">
                  {t('subscription.historyTable.plan')}
                </th>
                <th className="py-2 pe-4 font-medium">
                  {t('subscription.historyTable.cycle')}
                </th>
                <th className="py-2 pe-4 font-medium">
                  {t('subscription.historyTable.status')}
                </th>
                <th className="py-2 pe-4 font-medium">
                  {t('subscription.historyTable.period')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.history.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pe-4 text-ink">
                    {row.planNameEn ?? row.planId}
                  </td>
                  <td className="py-2 pe-4 text-ink-soft">
                    {cycleLabel(row.billingCycle)}
                  </td>
                  <td className="py-2 pe-4">
                    <Badge tone={STATUS_TONE[row.status]}>
                      {t(`subscriptionStatus.${row.status}`)}
                    </Badge>
                  </td>
                  <td className="py-2 pe-4 text-ink-soft">
                    {formatDate(row.startDate)} →{' '}
                    {row.endDate ? formatDate(row.endDate) : t('subscription.now')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ChangePlanModal
        open={changing}
        onClose={() => setChanging(false)}
        onSaved={load}
        hotelId={hotelId}
        currentPlanId={current?.planId ?? null}
      />
    </div>
  );
}
