'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { NOTIFICATION_TYPE_LABELS, NotificationsTable } from '@/components/notifications-table';
import { NotificationDetailModal } from '@/components/notification-detail-modal';
import {
  EmptyState,
  ErrorState,
  Button,
  Pagination,
  selectClass,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import {
  NotificationListItem,
  NotificationStatus,
  NotificationType,
  Paginated,
} from '@/lib/types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: NotificationStatus[] = ['pending', 'sent', 'failed'];
const TYPE_OPTIONS = Object.keys(
  NOTIFICATION_TYPE_LABELS,
) as NotificationType[];

interface Filters {
  status: '' | NotificationStatus;
  type: '' | NotificationType;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  status: '',
  type: '',
  dateFrom: '',
  dateTo: '',
};

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();

  const [result, setResult] = useState<Paginated<NotificationListItem> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.dateFrom) {
        params.set('dateFrom', new Date(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        params.set('dateTo', new Date(filters.dateTo).toISOString());
      }
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      setResult(
        await api<Paginated<NotificationListItem>>(`/notifications?${params}`),
      );
    } catch (err) {
      setError(err instanceof ApiError ? resolveError(err) : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [query, filters, page, resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilters(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  const items = result?.data ?? null;
  const total = result?.total ?? 0;
  const hasQueryOrFilters =
    query !== '' || Object.values(filters).some((v) => v !== '');

  return (
    <div>
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
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
          aria-label={t('filters.statusAria')}
          value={filters.status}
          onChange={(e) =>
            updateFilters({ status: e.target.value as Filters['status'] })
          }
          className={selectClass}
        >
          <option value="">{t('filters.allStatuses')}</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>

        <select
          aria-label={t('filters.typeAria')}
          value={filters.type}
          onChange={(e) =>
            updateFilters({ type: e.target.value as Filters['type'] })
          }
          className={selectClass}
        >
          <option value="">{t('filters.allTypes')}</option>
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1 text-xs text-ink-soft">
          {t('filters.from')}
          <input
            type="date"
            aria-label={t('filters.fromAria')}
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className={selectClass}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-soft">
          {t('filters.to')}
          <input
            type="date"
            aria-label={t('filters.toAria')}
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className={selectClass}
          />
        </label>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !items || items.length === 0 ? (
          <EmptyState
            title={
              hasQueryOrFilters ? t('empty.noMatchTitle') : t('empty.emptyTitle')
            }
            hint={
              hasQueryOrFilters ? t('empty.noMatchHint') : t('empty.emptyHint')
            }
          />
        ) : (
          <>
            <NotificationsTable
              items={items}
              onSelect={(item) => setSelectedId(item.id)}
            />
            <Pagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <NotificationDetailModal
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}
