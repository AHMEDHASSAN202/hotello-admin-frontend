'use client';

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Pencil,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { PlanFormModal } from '@/components/plan-form-modal';
import {
  Badge,
  Bdi,
  Button,
  EmptyState,
  ErrorState,
  Modal,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
import { useMe } from '@/lib/use-me';
import {
  ModuleCatalogEntry,
  PlanDetail,
  PlanSubscriber,
  SubscriptionStatus,
} from '@/lib/types';

const LIMIT_ROWS = [
  { key: 'maxRooms', labelKey: 'rooms' },
  { key: 'maxStaffUsers', labelKey: 'staffUsers' },
  { key: 'maxGuestRequestsPerMonth', labelKey: 'guestRequests' },
] as const;

const SUBSCRIBER_STATUS_TONE: Record<
  SubscriptionStatus,
  'success' | 'gold' | 'warning' | 'neutral' | 'danger'
> = {
  active: 'success',
  trial: 'gold',
  past_due: 'warning',
  canceled: 'neutral',
  expired: 'danger',
};

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('plans');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatCurrency, formatDate, formatNumber } = useFormatters();
  const { hasPermission } = useMe();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [catalog, setCatalog] = useState<ModuleCatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'overview' | 'subscribers'>('overview');
  const [subscribers, setSubscribers] = useState<PlanSubscriber[] | null>(null);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubscriberCount, setActionSubscriberCount] = useState<
    number | null
  >(null);
  const [saving, setSaving] = useState(false);

  const canReadSubscribers = hasPermission('subscriptions.read');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, catalogRes] = await Promise.all([
        api<PlanDetail>(`/plans/${id}`),
        api<ModuleCatalogEntry[]>('/plans/modules/catalog'),
      ]);
      setPlan(planRes);
      setCatalog(catalogRes);
    } catch (err) {
      setError(
        err instanceof ApiError ? resolveError(err) : t('details.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [id, resolveError, t]);

  const loadSubscribers = useCallback(async () => {
    setSubscribersError(null);
    setSubscribers(null);
    try {
      setSubscribers(await api<PlanSubscriber[]>(`/plans/${id}/subscribers`));
    } catch (err) {
      setSubscribersError(
        err instanceof ApiError ? resolveError(err) : t('subscribers.loadError'),
      );
    }
  }, [id, resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === 'subscribers' && canReadSubscribers) loadSubscribers();
  }, [tab, canReadSubscribers, loadSubscribers]);

  async function handleArchiveToggle() {
    if (!plan) return;
    setSaving(true);
    setActionError(null);
    setActionSubscriberCount(null);
    try {
      const action = plan.status === 'active' ? 'archive' : 'restore';
      await api<PlanDetail>(`/plans/${plan.id}/${action}`, { method: 'PATCH' });
      setArchiving(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(resolveError(err));
        const details = err.details as { subscriberCount?: number } | undefined;
        if (err.status === 409 && details?.subscriberCount !== undefined) {
          setActionSubscriberCount(details.subscriberCount);
        }
      } else {
        setActionError(t('archiveDialog.actionError'));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!plan) return <ErrorState message={t('details.notFound')} />;

  const isActive = plan.status === 'active';

  return (
    <div>
      <Link
        href="/plans"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        {/* Directional chevron mirrors in RTL (AC 7.3-4). */}
        <ArrowLeft size={15} aria-hidden className="rtl:-scale-x-100" />{' '}
        {t('details.back')}
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            {t('eyebrow')}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-ink">
              {plan.nameEn}
            </h1>
            {isActive ? (
              <Badge tone="success">{t('status.active')}</Badge>
            ) : (
              <Badge tone="neutral">{t('status.archived')}</Badge>
            )}
            {plan.isTrial && (
              <Badge tone="gold">
                {t('trialBadge', { days: plan.trialDurationDays ?? 0 })}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-soft" dir="rtl">
            {plan.nameAr}
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission('plans.update') && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              <Pencil size={15} aria-hidden /> {t('details.actions.edit')}
            </Button>
          )}
          {isActive
            ? hasPermission('plans.archive') && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setActionError(null);
                    setActionSubscriberCount(null);
                    setArchiving(true);
                  }}
                >
                  <Archive size={15} aria-hidden />{' '}
                  {t('details.actions.archive')}
                </Button>
              )
            : hasPermission('plans.update') && (
                <Button
                  onClick={() => {
                    setActionError(null);
                    setActionSubscriberCount(null);
                    setArchiving(true);
                  }}
                >
                  <ArchiveRestore size={15} aria-hidden />{' '}
                  {t('details.actions.restore')}
                </Button>
              )}
        </div>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-lg border border-line bg-white p-1 text-sm">
        <button
          onClick={() => setTab('overview')}
          aria-pressed={tab === 'overview'}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            tab === 'overview'
              ? 'bg-ink text-white'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {t('details.tabs.overview')}
        </button>
        {canReadSubscribers && (
          <button
            onClick={() => setTab('subscribers')}
            aria-pressed={tab === 'subscribers'}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              tab === 'subscribers'
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t('details.tabs.subscribers', {
              count: formatNumber(plan.subscriberCount),
            })}
          </button>
        )}
      </div>

      {tab === 'overview' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('details.pricing.title')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  {t('details.pricing.monthly')}
                </dt>
                <dd className="font-medium text-ink">
                  {formatCurrency(plan.monthlyPrice, plan.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t('details.pricing.yearly')}</dt>
                <dd className="font-medium text-ink">
                  {plan.yearlyPrice === null
                    ? t('details.pricing.yearlyUnavailable')
                    : formatCurrency(plan.yearlyPrice, plan.currency)}
                </dd>
              </div>
            </dl>
            {(plan.descriptionEn || plan.descriptionAr) && (
              <div className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
                {plan.descriptionEn && <p>{plan.descriptionEn}</p>}
                {plan.descriptionAr && (
                  <p className="mt-1" dir="rtl">
                    {plan.descriptionAr}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('details.limits.title')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {LIMIT_ROWS.map(({ key, labelKey }) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-ink-soft">
                    {t(`details.limits.${labelKey}`)}
                  </dt>
                  <dd className="font-medium text-ink">
                    {plan[key] === null
                      ? t('details.limits.unlimited')
                      : formatNumber(plan[key] as number)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('details.modules.title')}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {catalog.map((mod) => {
                const enabled = plan.enabledModules.includes(mod.key);
                return (
                  <li key={mod.key} className="flex items-center gap-2">
                    {enabled ? (
                      <Check size={15} className="text-success" aria-hidden />
                    ) : (
                      <X size={15} className="text-ink-soft/40" aria-hidden />
                    )}
                    <span className={enabled ? 'text-ink' : 'text-ink-soft/60'}>
                      {mod.labelEn} · {mod.labelAr}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('details.audit.title')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  {t('details.audit.createdBy')}
                </dt>
                <dd className="font-medium text-ink">
                  {plan.createdBy?.name ?? tCommon('states.notAvailable')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  {t('details.audit.createdAt')}
                </dt>
                <dd className="font-medium text-ink">
                  {formatDate(plan.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  {t('details.audit.updatedAt')}
                </dt>
                <dd className="font-medium text-ink">
                  {formatDate(plan.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {subscribersError ? (
            <ErrorState message={subscribersError} onRetry={loadSubscribers} />
          ) : subscribers === null ? (
            <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>
          ) : subscribers.length === 0 ? (
            <EmptyState
              title={t('subscribers.emptyTitle')}
              hint={t('subscribers.emptyHint')}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t('subscribers.table.hotel')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('subscribers.table.since')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('subscribers.table.billingCycle')}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t('subscribers.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {subscribers.map((sub) => (
                    <tr key={sub.hotelId}>
                      <td className="px-4 py-3 font-medium text-ink">
                        {sub.hotelName ? (
                          <Bdi>{sub.hotelName}</Bdi>
                        ) : (
                          <Bdi className="font-mono text-xs text-ink-soft">
                            {sub.hotelId}
                          </Bdi>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {formatDate(sub.startDate)}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {t(`subscribers.billingCycle.${sub.billingCycle}`)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={SUBSCRIBER_STATUS_TONE[sub.status]}>
                            {t(`subscribers.status.${sub.status}`)}
                          </Badge>
                          {sub.status === 'trial' &&
                            sub.daysRemaining !== null && (
                              <span className="text-xs text-ink-soft">
                                {t('subscribers.daysRemaining', {
                                  count: sub.daysRemaining,
                                })}
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <PlanFormModal
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={load}
        catalog={catalog}
        plan={plan}
      />

      {/* Archive / restore confirm */}
      <Modal
        open={archiving}
        onClose={() => setArchiving(false)}
        title={
          isActive
            ? t('archiveDialog.archiveTitle')
            : t('archiveDialog.restoreTitle')
        }
      >
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <p>{actionError}</p>
            {actionSubscriberCount !== null && (
              <p className="mt-1">
                {t('archiveDialog.migrateHint', {
                  count: actionSubscriberCount,
                })}
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-ink-soft">
          {t.rich(
            isActive ? 'archiveDialog.archiveBody' : 'archiveDialog.restoreBody',
            {
              name: plan.nameEn,
              strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
            },
          )}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setArchiving(false)}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            variant={isActive ? 'danger' : 'primary'}
            loading={saving}
            onClick={handleArchiveToggle}
          >
            {isActive
              ? t('archiveDialog.archiveConfirm')
              : t('archiveDialog.restoreConfirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
