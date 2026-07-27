'use client';

import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, EmptyState, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import {
  HotelListItem,
  HotelStatus,
  Paginated,
  PlanSummary,
  SubscriptionStatus,
} from '@/lib/types';

const HOTEL_STATUS_TONE: Record<HotelStatus, 'success' | 'danger' | 'neutral'> = {
  active: 'success',
  suspended: 'danger',
  inactive: 'neutral',
};

const SUBSCRIPTION_STATUS_TONE = {
  active: 'success',
  trial: 'gold',
  past_due: 'warning',
  canceled: 'neutral',
  expired: 'danger',
} as const;

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A→Z' },
  { value: 'name:desc', label: 'Name Z→A' },
  { value: 'plan:asc', label: 'Plan A→Z' },
  { value: 'plan:desc', label: 'Plan Z→A' },
] as const;

const PAGE_SIZE = 20;

interface Filters {
  status: '' | HotelStatus;
  subscriptionStatus: '' | SubscriptionStatus;
  planId: string;
  city: string;
}

const EMPTY_FILTERS: Filters = {
  status: '',
  subscriptionStatus: '',
  planId: '',
  city: '',
};

export default function HotelsPage() {
  const router = useRouter();
  const { hasPermission } = useMe();

  const [result, setResult] = useState<Paginated<HotelListItem> | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<string>('createdAt:desc');
  const [page, setPage] = useState(1);

  const canCreate = hasPermission('hotels.create');
  const canReadPlans = hasPermission('plans.read');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sortBy, sortDir] = sort.split(':');
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (filters.status) params.set('status', filters.status);
      if (filters.subscriptionStatus) {
        params.set('subscriptionStatus', filters.subscriptionStatus);
      }
      if (filters.planId) params.set('planId', filters.planId);
      if (filters.city) params.set('city', filters.city);
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      setResult(await api<Paginated<HotelListItem>>(`/hotels?${params}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  }, [query, filters, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Plan filter options — only for admins who can read plans.
  useEffect(() => {
    if (!canReadPlans) return;
    api<PlanSummary[]>('/plans?status=active')
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [canReadPlans]);

  function updateFilters(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  const hotels = result?.data ?? null;
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasQueryOrFilters =
    query !== '' || Object.values(filters).some((v) => v !== '');

  const selectClass =
    'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            Tenants
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Hotels
          </h1>
        </div>
        {canCreate && (
          <Button onClick={() => router.push('/hotels/new')}>
            <Plus size={16} aria-hidden /> Onboard hotel
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
        >
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search name or slug…"
              aria-label="Search hotels"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink"
            />
          </div>
          <Button type="submit" variant="ghost">
            Search
          </Button>
        </form>

        <select
          aria-label="Filter by hotel status"
          value={filters.status}
          onChange={(e) =>
            updateFilters({ status: e.target.value as Filters['status'] })
          }
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          aria-label="Filter by subscription status"
          value={filters.subscriptionStatus}
          onChange={(e) =>
            updateFilters({
              subscriptionStatus: e.target
                .value as Filters['subscriptionStatus'],
            })
          }
          className={selectClass}
        >
          <option value="">All subscriptions</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
        </select>

        {plans.length > 0 && (
          <select
            aria-label="Filter by plan"
            value={filters.planId}
            onChange={(e) => updateFilters({ planId: e.target.value })}
            className={selectClass}
          >
            <option value="">All plans</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nameEn}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder="City"
          aria-label="Filter by city"
          value={filters.city}
          onChange={(e) => updateFilters({ city: e.target.value })}
          className="w-32 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />

        <select
          aria-label="Sort hotels"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className={`${selectClass} ml-auto`}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !hotels || hotels.length === 0 ? (
          <EmptyState
            title={
              hasQueryOrFilters ? 'No hotels match your filters' : 'No hotels yet'
            }
            hint={
              hasQueryOrFilters
                ? 'Try different search terms or filters.'
                : canCreate
                  ? 'Onboard the first hotel to start building the tenant base.'
                  : 'Hotels appear here once they are onboarded.'
            }
            action={
              !hasQueryOrFilters &&
              canCreate && (
                <Button onClick={() => router.push('/hotels/new')}>
                  Onboard hotel
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hotel</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Subscription</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Onboarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {hotels.map((hotel) => (
                    <tr
                      key={hotel.id}
                      onClick={() => router.push(`/hotels/${hotel.id}`)}
                      className="cursor-pointer transition-colors hover:bg-paper"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/hotels/${hotel.id}`}
                          className="font-medium text-ink hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hotel.nameEn}
                        </Link>
                        <p className="text-xs text-ink-soft" dir="rtl">
                          {hotel.nameAr}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{hotel.city}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                        {hotel.slug}
                      </td>
                      <td className="px-4 py-3">
                        {hotel.plan ? (
                          <div className="flex items-center gap-2">
                            <span className="text-ink">{hotel.plan.nameEn}</span>
                            {hotel.plan.isTrial &&
                              hotel.subscription?.daysRemaining !== null &&
                              hotel.subscription?.daysRemaining !== undefined && (
                                <Badge tone="gold">
                                  {hotel.subscription.daysRemaining}d left
                                </Badge>
                              )}
                          </div>
                        ) : (
                          <span className="text-ink-soft/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hotel.subscription ? (
                          <Badge
                            tone={
                              SUBSCRIPTION_STATUS_TONE[hotel.subscription.status]
                            }
                          >
                            {hotel.subscription.status.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-ink-soft/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={HOTEL_STATUS_TONE[hotel.status]}>
                          {hotel.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {new Date(hotel.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
                <p>
                  {total} hotel{total === 1 ? '' : 's'} · page {page} of{' '}
                  {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={15} aria-hidden /> Previous
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight size={15} aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
