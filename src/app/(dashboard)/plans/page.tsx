'use client';

import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { PlanFormModal } from '@/components/plan-form-modal';
import { Badge, Button, EmptyState, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
import { useMe } from '@/lib/use-me';
import { ModuleCatalogEntry, PlanStatus, PlanSummary } from '@/lib/types';

type StatusFilter = 'all' | PlanStatus;
type SortKey = 'name' | 'monthlyPrice' | 'subscriberCount' | 'createdAt';

const STATUS_TABS: StatusFilter[] = ['all', 'active', 'archived'];

export default function PlansPage() {
  const t = useTranslations('plans');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatCurrency, formatDate, formatNumber } = useFormatters();
  const { hasPermission } = useMe();

  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [catalog, setCatalog] = useState<ModuleCatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, sortBy, sortDir });
      const [plansRes, catalogRes] = await Promise.all([
        api<PlanSummary[]>(`/plans?${params}`),
        api<ModuleCatalogEntry[]>('/plans/modules/catalog'),
      ]);
      setPlans(plansRes);
      setCatalog(catalogRes);
    } catch (err) {
      setError(err instanceof ApiError ? resolveError(err) : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [status, sortBy, sortDir, resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  function formatPrice(value: number | null, currency: string) {
    if (value === null) return tCommon('states.notAvailable');
    return formatCurrency(value, currency);
  }

  const canCreate = hasPermission('plans.create');

  const sortIndicator = (key: SortKey) =>
    sortBy === key &&
    (sortDir === 'asc' ? (
      <ArrowUp size={12} aria-hidden />
    ) : (
      <ArrowDown size={12} aria-hidden />
    ));

  const emptyTitle =
    status === 'all'
      ? t('list.empty.allTitle')
      : status === 'active'
        ? t('list.empty.activeTitle')
        : t('list.empty.archivedTitle');

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            {t('title')}
          </h1>
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden /> {t('new')}
          </Button>
        )}
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-lg border border-line bg-white p-1 text-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            aria-pressed={status === tab}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              status === tab
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t(`list.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            hint={canCreate ? t('list.empty.hint') : undefined}
            action={
              canCreate && status === 'all' ? (
                <Button onClick={() => setCreating(true)}>{t('new')}</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <button
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      {t('list.table.plan')}
                      {sortIndicator('name')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      onClick={() => toggleSort('monthlyPrice')}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      {t('list.table.monthly')}
                      {sortIndicator('monthlyPrice')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t('list.table.yearly')}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      onClick={() => toggleSort('subscriberCount')}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      {t('list.table.hotels')}
                      {sortIndicator('subscriberCount')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t('list.table.status')}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      {t('list.table.created')}
                      {sortIndicator('createdAt')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/plans/${plan.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {plan.nameEn}
                      </Link>
                      <p className="text-xs text-ink-soft" dir="rtl">
                        {plan.nameAr}
                      </p>
                      {plan.isTrial && (
                        <span className="mt-1 inline-block">
                          <Badge tone="gold">
                            {t('trialBadge', {
                              days: plan.trialDurationDays ?? 0,
                            })}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {formatPrice(plan.monthlyPrice, plan.currency)}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {formatPrice(plan.yearlyPrice, plan.currency)}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {formatNumber(plan.subscriberCount)}
                    </td>
                    <td className="px-4 py-3">
                      {plan.status === 'active' ? (
                        <Badge tone="success">{t('status.active')}</Badge>
                      ) : (
                        <Badge tone="neutral">{t('status.archived')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatDate(plan.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={load}
        catalog={catalog}
        plan={null}
      />
    </div>
  );
}
