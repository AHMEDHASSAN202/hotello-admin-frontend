'use client';

import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PlanFormModal } from '@/components/plan-form-modal';
import { Badge, Button, EmptyState, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import { ModuleCatalogEntry, PlanStatus, PlanSummary } from '@/lib/types';

type StatusFilter = 'all' | PlanStatus;
type SortKey = 'name' | 'monthlyPrice' | 'subscriberCount' | 'createdAt';

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const SORTABLE_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Plan' },
  { key: 'monthlyPrice', label: 'Monthly' },
  { key: 'subscriberCount', label: 'Hotels' },
  { key: 'createdAt', label: 'Created' },
];

function formatPrice(value: number | null, currency: string) {
  if (value === null) return '—';
  return `${value.toLocaleString()} ${currency}`;
}

export default function PlansPage() {
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
      setError(err instanceof ApiError ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [status, sortBy, sortDir]);

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

  const canCreate = hasPermission('plans.create');

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            Billing
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Subscription plans
          </h1>
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden /> New plan
          </Button>
        )}
      </div>

      <div className="mt-6 flex gap-1 rounded-lg border border-line bg-white p-1 text-sm w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            aria-pressed={status === tab.value}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              status === tab.value
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState
            title={status === 'all' ? 'No plans yet' : `No ${status} plans`}
            hint={
              canCreate
                ? 'Create the first plan — e.g. a "Standard" default plan.'
                : undefined
            }
            action={
              canCreate && status === 'all' ? (
                <Button onClick={() => setCreating(true)}>New plan</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  {SORTABLE_COLUMNS.slice(0, 2).map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium">
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      >
                        {col.label}
                        {sortBy === col.key &&
                          (sortDir === 'asc' ? (
                            <ArrowUp size={12} aria-hidden />
                          ) : (
                            <ArrowDown size={12} aria-hidden />
                          ))}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Yearly</th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      onClick={() => toggleSort('subscriberCount')}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      Hotels
                      {sortBy === 'subscriberCount' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp size={12} aria-hidden />
                        ) : (
                          <ArrowDown size={12} aria-hidden />
                        ))}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      onClick={() => toggleSort('createdAt')}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      Created
                      {sortBy === 'createdAt' &&
                        (sortDir === 'asc' ? (
                          <ArrowUp size={12} aria-hidden />
                        ) : (
                          <ArrowDown size={12} aria-hidden />
                        ))}
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
                            {plan.trialDurationDays}-day trial · تجربة
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
                    <td className="px-4 py-3 text-ink">{plan.subscriberCount}</td>
                    <td className="px-4 py-3">
                      {plan.status === 'active' ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Archived</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(plan.createdAt).toLocaleDateString()}
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
