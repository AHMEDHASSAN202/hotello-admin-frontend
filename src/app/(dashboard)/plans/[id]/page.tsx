'use client';

import { Archive, ArchiveRestore, ArrowLeft, Check, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PlanFormModal } from '@/components/plan-form-modal';
import { Badge, Button, EmptyState, ErrorState, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import {
  ModuleCatalogEntry,
  PlanDetail,
  PlanSubscriber,
} from '@/lib/types';

const LIMIT_ROWS = [
  { key: 'maxRooms', label: 'Rooms' },
  { key: 'maxStaffUsers', label: 'Staff users' },
  { key: 'maxGuestRequestsPerMonth', label: 'Guest requests / month' },
] as const;

const SUBSCRIBER_STATUS_TONE = {
  active: 'success',
  trial: 'gold',
  past_due: 'warning',
  canceled: 'neutral',
  expired: 'danger',
} as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
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
  const [actionSubscriberCount, setActionSubscriberCount] = useState<number | null>(null);
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
      setError(err instanceof ApiError ? err.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSubscribers = useCallback(async () => {
    setSubscribersError(null);
    setSubscribers(null);
    try {
      setSubscribers(await api<PlanSubscriber[]>(`/plans/${id}/subscribers`));
    } catch (err) {
      setSubscribersError(
        err instanceof ApiError ? err.message : 'Failed to load subscribers',
      );
    }
  }, [id]);

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
        setActionError(err.message);
        const details = err.details as { subscriberCount?: number } | undefined;
        if (err.status === 409 && details?.subscriberCount !== undefined) {
          setActionSubscriberCount(details.subscriberCount);
        }
      } else {
        setActionError('Action failed');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!plan) return <ErrorState message="Plan not found" />;

  const isActive = plan.status === 'active';

  return (
    <div>
      <Link
        href="/plans"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden /> All plans
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            Billing
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-ink">
              {plan.nameEn}
            </h1>
            {isActive ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="neutral">Archived</Badge>
            )}
            {plan.isTrial && (
              <Badge tone="gold">
                {plan.trialDurationDays}-day trial · تجربة
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
              <Pencil size={15} aria-hidden /> Edit
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
                  <Archive size={15} aria-hidden /> Archive
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
                  <ArchiveRestore size={15} aria-hidden /> Restore
                </Button>
              )}
        </div>
      </div>

      <div className="mt-6 flex gap-1 rounded-lg border border-line bg-white p-1 text-sm w-fit">
        <button
          onClick={() => setTab('overview')}
          aria-pressed={tab === 'overview'}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            tab === 'overview' ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Overview
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
            Subscribed hotels ({plan.subscriberCount})
          </button>
        )}
      </div>

      {tab === 'overview' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">Pricing</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Monthly</dt>
                <dd className="font-medium text-ink">
                  {plan.monthlyPrice.toLocaleString()} {plan.currency}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Yearly</dt>
                <dd className="font-medium text-ink">
                  {plan.yearlyPrice === null
                    ? 'Unavailable'
                    : `${plan.yearlyPrice.toLocaleString()} ${plan.currency}`}
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
            <h2 className="font-display font-semibold text-ink">Limits</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {LIMIT_ROWS.map(({ key, label }) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="font-medium text-ink">
                    {plan[key] === null ? 'Unlimited' : plan[key]?.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">Modules</h2>
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
            <h2 className="font-display font-semibold text-ink">Audit</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Created by</dt>
                <dd className="font-medium text-ink">
                  {plan.createdBy?.name ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Created at</dt>
                <dd className="font-medium text-ink">{formatDate(plan.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Last updated</dt>
                <dd className="font-medium text-ink">{formatDate(plan.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {subscribersError ? (
            <ErrorState message={subscribersError} onRetry={loadSubscribers} />
          ) : subscribers === null ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : subscribers.length === 0 ? (
            <EmptyState
              title="No subscribed hotels"
              hint="Hotels appear here once they are put on this plan."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hotel</th>
                    <th className="px-4 py-3 font-medium">Since</th>
                    <th className="px-4 py-3 font-medium">Billing cycle</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {subscribers.map((sub) => (
                    <tr key={sub.hotelId}>
                      <td className="px-4 py-3 font-medium text-ink">
                        {sub.hotelName ?? sub.hotelId}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {formatDate(sub.startDate)}
                      </td>
                      <td className="px-4 py-3 capitalize text-ink-soft">
                        {sub.billingCycle}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={SUBSCRIBER_STATUS_TONE[sub.status]}>
                            {sub.status.replace('_', ' ')}
                          </Badge>
                          {sub.status === 'trial' && sub.daysRemaining !== null && (
                            <span className="text-xs text-ink-soft">
                              {sub.daysRemaining} day
                              {sub.daysRemaining === 1 ? '' : 's'} remaining
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
        title={isActive ? 'Archive plan?' : 'Restore plan?'}
      >
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <p>{actionError}</p>
            {actionSubscriberCount !== null && (
              <p className="mt-1">
                Migrate the {actionSubscriberCount} subscribed hotel
                {actionSubscriberCount === 1 ? '' : 's'} to another plan first.
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-ink-soft">
          {isActive ? (
            <>
              <strong className="text-ink">{plan.nameEn}</strong> stops being
              offered — it disappears from plan-selection dropdowns but stays in
              historical records. There is no delete; archiving is reversible.
            </>
          ) : (
            <>
              <strong className="text-ink">{plan.nameEn}</strong> becomes
              selectable again for new subscriptions.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setArchiving(false)}>
            Cancel
          </Button>
          <Button
            variant={isActive ? 'danger' : 'primary'}
            loading={saving}
            onClick={handleArchiveToggle}
          >
            {isActive ? 'Archive plan' : 'Restore plan'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
