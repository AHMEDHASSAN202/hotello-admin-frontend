'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Bdi,
  Button,
  Code,
  EmptyState,
  ErrorState,
  Pagination,
  selectClass,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
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
  { value: 'createdAt:desc', labelKey: 'newest' },
  { value: 'createdAt:asc', labelKey: 'oldest' },
  { value: 'name:asc', labelKey: 'nameAsc' },
  { value: 'name:desc', labelKey: 'nameDesc' },
  { value: 'plan:asc', labelKey: 'planAsc' },
  { value: 'plan:desc', labelKey: 'planDesc' },
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
  const t = useTranslations('hotels');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatDate } = useFormatters();
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
      setError(err instanceof ApiError ? resolveError(err) : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [query, filters, sort, page, resolveError, t]);

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
  const hasQueryOrFilters =
    query !== '' || Object.values(filters).some((v) => v !== '');

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
          <Button onClick={() => router.push('/hotels/new')}>
            <Plus size={16} aria-hidden /> {t('onboard')}
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
              className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
              aria-hidden
            />
            <input
              type="search"
              placeholder={t('list.search.placeholder')}
              aria-label={t('list.search.aria')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-line bg-white py-2 pe-3 ps-9 text-sm text-ink"
            />
          </div>
          <Button type="submit" variant="ghost">
            {tCommon('actions.search')}
          </Button>
        </form>

        <select
          aria-label={t('list.filters.statusAria')}
          value={filters.status}
          onChange={(e) =>
            updateFilters({ status: e.target.value as Filters['status'] })
          }
          className={selectClass}
        >
          <option value="">{t('list.filters.allStatuses')}</option>
          <option value="active">{t('hotelStatus.active')}</option>
          <option value="suspended">{t('hotelStatus.suspended')}</option>
          <option value="inactive">{t('hotelStatus.inactive')}</option>
        </select>

        <select
          aria-label={t('list.filters.subscriptionAria')}
          value={filters.subscriptionStatus}
          onChange={(e) =>
            updateFilters({
              subscriptionStatus: e.target
                .value as Filters['subscriptionStatus'],
            })
          }
          className={selectClass}
        >
          <option value="">{t('list.filters.allSubscriptions')}</option>
          <option value="active">{t('subscriptionStatus.active')}</option>
          <option value="trial">{t('subscriptionStatus.trial')}</option>
          <option value="past_due">{t('subscriptionStatus.past_due')}</option>
          <option value="canceled">{t('subscriptionStatus.canceled')}</option>
          <option value="expired">{t('subscriptionStatus.expired')}</option>
        </select>

        {plans.length > 0 && (
          <select
            aria-label={t('list.filters.planAria')}
            value={filters.planId}
            onChange={(e) => updateFilters({ planId: e.target.value })}
            className={selectClass}
          >
            <option value="">{t('list.filters.allPlans')}</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nameEn}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder={t('list.filters.cityPlaceholder')}
          aria-label={t('list.filters.cityAria')}
          value={filters.city}
          onChange={(e) => updateFilters({ city: e.target.value })}
          className="w-32 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
        />

        <select
          aria-label={t('list.filters.sortAria')}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className={`${selectClass} ms-auto`}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(`list.sort.${opt.labelKey}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !hotels || hotels.length === 0 ? (
          <EmptyState
            title={
              hasQueryOrFilters
                ? t('list.empty.noMatchTitle')
                : t('list.empty.emptyTitle')
            }
            hint={
              hasQueryOrFilters
                ? t('list.empty.noMatchHint')
                : canCreate
                  ? t('list.empty.emptyHintCanCreate')
                  : t('list.empty.emptyHint')
            }
            action={
              !hasQueryOrFilters &&
              canCreate && (
                <Button onClick={() => router.push('/hotels/new')}>
                  {t('onboard')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.hotel')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.city')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.slug')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.plan')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.subscription')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.status')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('list.table.onboarded')}
                    </th>
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
                          {/* Latin hotel name — isolate in RTL (AC 7.3-5). */}
                          <Bdi>{hotel.nameEn}</Bdi>
                        </Link>
                        <p className="text-xs text-ink-soft" dir="rtl">
                          {hotel.nameAr}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{hotel.city}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {/* Slug is code-like — never reorders (AC 7.3-5). */}
                        <Code>{hotel.slug}</Code>
                      </td>
                      <td className="px-4 py-3">
                        {hotel.plan ? (
                          <div className="flex items-center gap-2">
                            <span className="text-ink">{hotel.plan.nameEn}</span>
                            {hotel.plan.isTrial &&
                              hotel.subscription?.daysRemaining !== null &&
                              hotel.subscription?.daysRemaining !== undefined && (
                                <Badge tone="gold">
                                  {t('list.daysLeft', {
                                    count: hotel.subscription.daysRemaining,
                                  })}
                                </Badge>
                              )}
                          </div>
                        ) : (
                          <span className="text-ink-soft/60">
                            {tCommon('states.notAvailable')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hotel.subscription ? (
                          <Badge
                            tone={
                              SUBSCRIPTION_STATUS_TONE[hotel.subscription.status]
                            }
                          >
                            {t(
                              `subscriptionStatus.${hotel.subscription.status}`,
                            )}
                          </Badge>
                        ) : (
                          <span className="text-ink-soft/60">
                            {tCommon('states.notAvailable')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={HOTEL_STATUS_TONE[hotel.status]}>
                          {t(`hotelStatus.${hotel.status}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {formatDate(hotel.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
