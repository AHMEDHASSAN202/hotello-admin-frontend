'use client';

import {
  ArrowLeft,
  Ban,
  Building2,
  Pencil,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChangeEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { HotelFormModal } from '@/components/hotel-form-modal';
import { HotelNotificationsTab } from '@/components/hotel-notifications-tab';
import { HotelSubscriptionTab } from '@/components/hotel-subscription-tab';
import { SetupEmailStatus } from '@/components/setup-email-status';
import { Badge, Bdi, Button, Code, ErrorState, Modal } from '@/components/ui';
import { api, ApiError, apiUpload, assetUrl } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
import { useMe } from '@/lib/use-me';
import {
  HotelDetail,
  HotelStatus,
  RegenerateLinkResponse,
  SuspensionReason,
} from '@/lib/types';

const STATUS_TONE: Record<HotelStatus, 'success' | 'danger' | 'neutral'> = {
  active: 'success',
  suspended: 'danger',
  inactive: 'neutral',
};

const REASON_KEYS: SuspensionReason[] = [
  'non_payment',
  'policy_violation',
  'hotel_request',
  'other',
];

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type Tab = 'profile' | 'subscription' | 'owner' | 'notifications';

export default function HotelDetailPage() {
  const t = useTranslations('hotels');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatDate, formatDateTime } = useFormatters();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useMe();

  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');

  const [editing, setEditing] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [suspendReason, setSuspendReason] = useState<SuspensionReason>('non_payment');
  const [suspendNote, setSuspendNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [regenerating, setRegenerating] = useState(false);
  const [newLink, setNewLink] = useState<RegenerateLinkResponse | null>(null);

  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const canUpdate = hasPermission('hotels.update');
  const canSuspend = hasPermission('hotels.suspend');
  const canReadSubscription = hasPermission('subscriptions.read');
  const canReadNotifications = hasPermission('notifications.read');

  const dash = tCommon('states.notAvailable');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHotel(await api<HotelDetail>(`/hotels/${id}`));
    } catch (err) {
      setError(
        err instanceof ApiError ? resolveError(err) : t('detailLoadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [id, resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSuspend() {
    setSaving(true);
    setActionError(null);
    try {
      await api<HotelDetail>(`/hotels/${id}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: suspendReason,
          ...(suspendNote.trim() ? { note: suspendNote.trim() } : {}),
        }),
      });
      setSuspending(false);
      setSuspendNote('');
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? resolveError(err)
          : t('detail.suspendDialog.failed'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate() {
    setSaving(true);
    setActionError(null);
    try {
      await api<HotelDetail>(`/hotels/${id}/reactivate`, { method: 'PATCH' });
      setReactivating(false);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? resolveError(err)
          : t('detail.reactivateDialog.failed'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setSaving(true);
    setActionError(null);
    try {
      setNewLink(
        await api<RegenerateLinkResponse>(
          `/hotels/${id}/owner/regenerate-setup-link`,
          { method: 'POST' },
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? resolveError(err)
          : t('detail.regenerateDialog.failed'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError(null);
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError(t('detail.profile.logoInvalidType'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(t('detail.profile.logoTooLarge'));
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiUpload(`/hotels/${id}/logo`, form);
      await load();
    } catch (err) {
      setLogoError(
        err instanceof ApiError
          ? resolveError(err)
          : t('detail.profile.uploadFailed'),
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  if (loading)
    return <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!hotel) return <ErrorState message={t('notFound')} />;

  const suspended = hotel.status === 'suspended';

  const tabButton = (value: Tab, label: string) => (
    <button
      onClick={() => setTab(value)}
      aria-pressed={tab === value}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        tab === value ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <Link
        href="/hotels"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        {/* "Back to hotels" link — directional (AC 7.3-4). */}
        <ArrowLeft size={15} aria-hidden className="rtl:-scale-x-100" />{' '}
        {t('detail.backToHotels')}
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {hotel.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(hotel.logoUrl)}
              alt={t('detail.logoAlt', { name: hotel.nameEn })}
              className="h-14 w-14 rounded-xl border border-line object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-paper">
              <Building2 size={22} className="text-ink-soft/50" aria-hidden />
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gold">
              {t('detail.eyebrow')}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-ink">
                {/* Latin hotel name — isolate in RTL (AC 7.3-5). */}
                <Bdi>{hotel.nameEn}</Bdi>
              </h1>
              <Badge tone={STATUS_TONE[hotel.status]}>
                {t(`hotelStatus.${hotel.status}`)}
              </Badge>
              {hotel.starRating !== null && (
                <span
                  className="text-sm text-gold"
                  aria-label={t('detail.starsAria', { count: hotel.starRating })}
                >
                  {'★'.repeat(hotel.starRating)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft" dir="rtl">
              {hotel.nameAr}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              <Pencil size={15} aria-hidden /> {t('detail.edit')}
            </Button>
          )}
          {canSuspend &&
            (suspended ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  setReactivating(true);
                }}
              >
                <RotateCcw size={15} aria-hidden /> {t('detail.reactivate')}
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  setActionError(null);
                  setSuspending(true);
                }}
              >
                <Ban size={15} aria-hidden /> {t('detail.suspend')}
              </Button>
            ))}
        </div>
      </div>

      {suspended && hotel.suspension && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4"
        >
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-danger">
              {t('detail.suspendedBanner.title', {
                reason: hotel.suspension.reason
                  ? t(`reason.${hotel.suspension.reason}`)
                  : t('detail.suspendedBanner.noReason'),
              })}
            </p>
            {hotel.suspension.note && (
              <p className="mt-1 text-ink-soft">{hotel.suspension.note}</p>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              {t('detail.suspendedBanner.since', {
                date: formatDate(hotel.suspension.suspendedAt ?? new Date()),
              })}
              {hotel.suspension.suspendedBy &&
                t('detail.suspendedBanner.byActor', {
                  name: hotel.suspension.suspendedBy.name,
                })}
              {t('detail.suspendedBanner.explainer')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex w-fit gap-1 rounded-lg border border-line bg-white p-1 text-sm">
        {tabButton('profile', t('detail.tabs.profile'))}
        {canReadSubscription &&
          tabButton('subscription', t('detail.tabs.subscription'))}
        {tabButton('owner', t('detail.tabs.owner'))}
        {canReadNotifications &&
          tabButton('notifications', t('detail.tabs.notifications'))}
      </div>

      {tab === 'profile' && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('detail.profile.identity')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label={t('detail.profile.nameEn')}
                value={<Bdi>{hotel.nameEn}</Bdi>}
              />
              <Row
                label={t('detail.profile.nameAr')}
                value={<span dir="rtl">{hotel.nameAr}</span>}
              />
              <Row
                label={t('detail.profile.slug')}
                value={<Code className="text-xs">{hotel.slug}</Code>}
              />
              <Row
                label={t('detail.profile.starRating')}
                value={
                  hotel.starRating === null
                    ? t('detail.profile.notRated')
                    : '★'.repeat(hotel.starRating)
                }
              />
              <Row
                label={t('detail.profile.rooms')}
                value={String(hotel.roomsCount)}
              />
            </dl>
            {canUpdate && (
              <div className="mt-4 border-t border-line pt-4">
                <label className="text-sm text-ink-soft">
                  <span className="mb-1 block font-medium text-ink">
                    {hotel.logoUrl
                      ? t('detail.profile.replaceLogo')
                      : t('detail.profile.uploadLogo')}
                  </span>
                  <input
                    type="file"
                    accept={LOGO_TYPES.join(',')}
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                    className="text-sm text-ink-soft file:me-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-ink"
                  />
                </label>
                {uploadingLogo && (
                  <p className="mt-1 text-xs text-ink-soft">
                    {t('detail.profile.uploading')}
                  </p>
                )}
                {logoError && (
                  <p className="mt-1 text-xs text-danger">{logoError}</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('detail.profile.contact')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label={t('detail.profile.email')}
                value={<Bdi>{hotel.contactEmail}</Bdi>}
              />
              <Row
                label={t('detail.profile.phone')}
                value={<Bdi>{hotel.contactPhone}</Bdi>}
              />
              <Row
                label={t('detail.profile.address')}
                value={hotel.address ?? dash}
              />
              <Row label={t('detail.profile.city')} value={hotel.city} />
              <Row label={t('detail.profile.country')} value={hotel.country} />
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('detail.profile.locale')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label={t('detail.profile.timezone')}
                value={<Bdi>{hotel.timezone}</Bdi>}
              />
              <Row
                label={t('detail.profile.defaultLanguage')}
                value={
                  hotel.defaultLanguage === 'ar'
                    ? t('detail.profile.languageArabic')
                    : t('detail.profile.languageEnglish')
                }
              />
              <Row label={t('detail.profile.currency')} value={hotel.currency} />
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">
              {t('detail.profile.audit')}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label={t('detail.profile.onboardedBy')}
                value={hotel.onboardedBy?.name ?? dash}
              />
              <Row
                label={t('detail.profile.onboardedAt')}
                value={formatDate(hotel.createdAt)}
              />
              <Row
                label={t('detail.profile.lastUpdated')}
                value={formatDate(hotel.updatedAt)}
              />
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
            <h2 className="font-display font-semibold text-ink">
              {t('detail.profile.tenantUrls')}
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              {t('detail.profile.tenantUrlsHint')}
              {suspended && t('detail.profile.tenantUrlsSuspended')}
            </p>
            <div className="mt-3 space-y-2">
              <UrlRow
                label={t('detail.profile.tenantDashboard')}
                value={hotel.urls.tenantDashboard}
              />
              <UrlRow
                label={t('detail.profile.guestApp')}
                value={hotel.urls.guestApp}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'subscription' && canReadSubscription && (
        <div className="mt-4">
          <HotelSubscriptionTab hotelId={hotel.id} />
        </div>
      )}

      {tab === 'notifications' && canReadNotifications && (
        <div className="mt-4">
          <HotelNotificationsTab hotelId={hotel.id} />
        </div>
      )}

      {tab === 'owner' && (
        <div className="mt-4 max-w-xl rounded-xl border border-line bg-white p-5">
          <h2 className="font-display font-semibold text-ink">
            {t('detail.owner.title')}
          </h2>
          {hotel.owner ? (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label={t('detail.owner.name')} value={hotel.owner.name} />
                <Row
                  label={t('detail.owner.email')}
                  value={<Bdi>{hotel.owner.email}</Bdi>}
                />
                <Row
                  label={t('detail.owner.status')}
                  value={
                    <Badge
                      tone={hotel.owner.status === 'active' ? 'success' : 'warning'}
                    >
                      {hotel.owner.status === 'active'
                        ? t('detail.owner.statusActive')
                        : t('detail.owner.statusPending')}
                    </Badge>
                  }
                />
                <Row
                  label={t('detail.owner.lastLogin')}
                  value={
                    hotel.owner.lastLoginAt
                      ? formatDateTime(hotel.owner.lastLoginAt)
                      : t('detail.owner.neverLoggedIn')
                  }
                />
              </dl>
              {/* Story 6.4 AC3 — delivery status beside the manual fallback. */}
              <div className="mt-4 border-t border-line pt-4">
                <SetupEmailStatus hotelId={hotel.id} />
              </div>
              <p className="mt-4 text-xs text-ink-soft">
                {t('detail.owner.scopeNote')}
              </p>
              {canUpdate && (
                <div className="mt-4 border-t border-line pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActionError(null);
                      setNewLink(null);
                      setRegenerating(true);
                    }}
                  >
                    {t('detail.owner.regenerate')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              {t('detail.owner.noOwner')}
            </p>
          )}
        </div>
      )}

      {canUpdate && (
        <HotelFormModal
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={load}
          hotel={hotel}
        />
      )}

      {/* Suspend confirm */}
      <Modal
        open={suspending}
        onClose={() => setSuspending(false)}
        title={t('detail.suspendDialog.title')}
      >
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {actionError}
          </div>
        )}
        <p className="text-sm text-ink-soft">
          {t.rich('detail.suspendDialog.body', {
            name: hotel.nameEn,
            strong: (chunks) => (
              <strong className="text-ink">
                <Bdi>{chunks}</Bdi>
              </strong>
            ),
          })}
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              {t('detail.suspendDialog.reason')}
            </span>
            <select
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value as SuspensionReason)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {REASON_KEYS.map((value) => (
                <option key={value} value={value}>
                  {t(`reason.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              {t('detail.suspendDialog.note')}{' '}
              <span className="text-ink-soft">
                {t('detail.suspendDialog.optional')}
              </span>
            </span>
            <textarea
              value={suspendNote}
              onChange={(e) => setSuspendNote(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setSuspending(false)}>
            {tCommon('actions.cancel')}
          </Button>
          <Button variant="danger" loading={saving} onClick={handleSuspend}>
            {t('detail.suspendDialog.submit')}
          </Button>
        </div>
      </Modal>

      {/* Reactivate confirm */}
      <Modal
        open={reactivating}
        onClose={() => setReactivating(false)}
        title={t('detail.reactivateDialog.title')}
      >
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {actionError}
          </div>
        )}
        <p className="text-sm text-ink-soft">
          {t.rich('detail.reactivateDialog.body', {
            name: hotel.nameEn,
            strong: (chunks) => (
              <strong className="text-ink">
                <Bdi>{chunks}</Bdi>
              </strong>
            ),
          })}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReactivating(false)}>
            {tCommon('actions.cancel')}
          </Button>
          <Button loading={saving} onClick={handleReactivate}>
            {t('detail.reactivateDialog.submit')}
          </Button>
        </div>
      </Modal>

      {/* Regenerate setup link */}
      <Modal
        open={regenerating}
        onClose={() => {
          setRegenerating(false);
          setNewLink(null);
        }}
        title={
          newLink
            ? t('detail.regenerateDialog.titleNew')
            : t('detail.regenerateDialog.titleConfirm')
        }
      >
        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {actionError}
          </div>
        )}
        {newLink ? (
          <>
            <p className="text-sm text-ink-soft">
              {t('detail.regenerateDialog.shownOnce', {
                expires: formatDateTime(newLink.expiresAt),
              })}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
              <Code className="flex-1 truncate text-xs text-ink">
                {newLink.setupLink}
              </Code>
              <CopyButton
                value={newLink.setupLink}
                label={t('detail.regenerateDialog.copySetupLink')}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setRegenerating(false);
                  setNewLink(null);
                }}
              >
                {t('detail.regenerateDialog.done')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              {t.rich('detail.regenerateDialog.confirmBody', {
                email: hotel.owner?.email ?? '',
                strong: (chunks) => (
                  <strong className="text-ink">
                    <Bdi>{chunks}</Bdi>
                  </strong>
                ),
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRegenerating(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button loading={saving} onClick={handleRegenerate}>
                {t('detail.regenerateDialog.submit')}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-end font-medium text-ink">{value}</dd>
    </div>
  );
}

function UrlRow({ label, value }: { label: string; value: string }) {
  const t = useTranslations('hotels');
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
      <span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <Code className="flex-1 truncate text-xs text-ink">{value}</Code>
      <CopyButton value={value} label={t('copy.copyUrl', { label })} />
    </div>
  );
}
