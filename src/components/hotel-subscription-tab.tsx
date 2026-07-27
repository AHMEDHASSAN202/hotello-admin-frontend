'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChangePlanModal } from '@/components/change-plan-modal';
import { Badge, Button, EmptyState, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import { HotelSubscriptionView } from '@/lib/types';

const STATUS_TONE = {
  active: 'success',
  trial: 'gold',
  past_due: 'warning',
  canceled: 'neutral',
  expired: 'danger',
} as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

/** Story 4.6 view, embedded as the hotel details Subscription tab (5.2 AC3). */
export function HotelSubscriptionTab({ hotelId }: { hotelId: string }) {
  const { hasPermission } = useMe();
  const [view, setView] = useState<HotelSubscriptionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setView(null);
    try {
      setView(await api<HotelSubscriptionView>(`/hotels/${hotelId}/subscription`));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load subscription',
      );
    }
  }, [hotelId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (view === null) return <p className="text-sm text-ink-soft">Loading…</p>;

  const current = view.current;
  const canChange = hasPermission('subscriptions.update');
  const planName = current?.plan
    ? `${current.plan.nameEn}`
    : (view.history[0]?.planNameEn ?? '—');

  return (
    <div className="space-y-4">
      {current === null ? (
        <EmptyState
          title="No subscription"
          hint="This hotel has no current subscription record."
          action={
            canChange && (
              <Button onClick={() => setChanging(true)}>Assign plan</Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-semibold text-ink">
                Current plan
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-lg font-medium text-ink">{planName}</p>
                <Badge tone={STATUS_TONE[current.status]}>
                  {current.status.replace('_', ' ')}
                </Badge>
                {current.status === 'trial' && current.daysRemaining !== null && (
                  <span className="text-sm text-ink-soft">
                    {current.daysRemaining} day
                    {current.daysRemaining === 1 ? '' : 's'} remaining
                  </span>
                )}
              </div>
              {current.plan && (
                <p className="mt-1 text-sm text-ink-soft" dir="rtl">
                  {current.plan.nameAr}
                </p>
              )}
              <p className="mt-2 text-sm text-ink-soft">
                <span className="capitalize">{current.billingCycle}</span> billing
                · since {formatDate(current.startDate)}
              </p>
            </div>
            {canChange && (
              <Button variant="ghost" onClick={() => setChanging(true)}>
                Change plan
              </Button>
            )}
          </div>
        </div>
      )}

      {view.usage && view.usage.length > 0 && (
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-display font-semibold text-ink">
            Usage vs limits
          </h2>
          <div className="mt-3 space-y-3">
            {view.usage.map((row) => (
              <div key={row.field}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize text-ink-soft">{row.label}</span>
                  <span className="font-medium text-ink">
                    {row.used.toLocaleString()}
                    {row.max === null
                      ? ' · Unlimited'
                      : ` / ${row.max.toLocaleString()}`}
                  </span>
                </div>
                {row.pct !== null && (
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper"
                    role="progressbar"
                    aria-valuenow={Math.min(row.pct, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.label} usage`}
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
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-display font-semibold text-ink">History</h2>
        {view.history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No previous subscriptions.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Cycle</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.history.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-4 text-ink">
                    {row.planNameEn ?? row.planId}
                  </td>
                  <td className="py-2 pr-4 capitalize text-ink-soft">
                    {row.billingCycle}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONE[row.status]}>
                      {row.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">
                    {formatDate(row.startDate)} →{' '}
                    {row.endDate ? formatDate(row.endDate) : 'now'}
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
