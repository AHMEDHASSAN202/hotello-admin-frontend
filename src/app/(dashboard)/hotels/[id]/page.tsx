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
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { CopyButton } from '@/components/copy-button';
import { HotelFormModal } from '@/components/hotel-form-modal';
import { HotelSubscriptionTab } from '@/components/hotel-subscription-tab';
import { Badge, Button, ErrorState, Modal } from '@/components/ui';
import { api, ApiError, apiUpload, assetUrl } from '@/lib/api';
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

const REASON_LABELS: Record<SuspensionReason, string> = {
  non_payment: 'Non-payment',
  policy_violation: 'Policy violation',
  hotel_request: 'Hotel request',
  other: 'Other',
};

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type Tab = 'profile' | 'subscription' | 'owner';

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function HotelDetailPage() {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHotel(await api<HotelDetail>(`/hotels/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load hotel');
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      setActionError(err instanceof ApiError ? err.message : 'Suspension failed');
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
      setActionError(err instanceof ApiError ? err.message : 'Reactivation failed');
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
        err instanceof ApiError ? err.message : 'Failed to regenerate link',
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
      setLogoError('Logo must be PNG, JPG, WebP or SVG.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Logo must be 2MB or smaller.');
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiUpload(`/hotels/${id}/logo`, form);
      await load();
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!hotel) return <ErrorState message="Hotel not found" />;

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
        <ArrowLeft size={15} aria-hidden /> All hotels
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {hotel.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(hotel.logoUrl)}
              alt={`${hotel.nameEn} logo`}
              className="h-14 w-14 rounded-xl border border-line object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-paper">
              <Building2 size={22} className="text-ink-soft/50" aria-hidden />
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gold">
              Tenants
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-ink">
                {hotel.nameEn}
              </h1>
              <Badge tone={STATUS_TONE[hotel.status]}>{hotel.status}</Badge>
              {hotel.starRating !== null && (
                <span className="text-sm text-gold" aria-label={`${hotel.starRating} stars`}>
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
              <Pencil size={15} aria-hidden /> Edit
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
                <RotateCcw size={15} aria-hidden /> Reactivate
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  setActionError(null);
                  setSuspending(true);
                }}
              >
                <Ban size={15} aria-hidden /> Suspend
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
              Suspended —{' '}
              {hotel.suspension.reason
                ? REASON_LABELS[hotel.suspension.reason]
                : 'No reason recorded'}
            </p>
            {hotel.suspension.note && (
              <p className="mt-1 text-ink-soft">{hotel.suspension.note}</p>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              Since {formatDate(hotel.suspension.suspendedAt)}
              {hotel.suspension.suspendedBy &&
                ` · by ${hotel.suspension.suspendedBy.name}`}
              . The tenant dashboard and guest app are fully locked; no data is
              deleted and the subscription is unchanged.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex w-fit gap-1 rounded-lg border border-line bg-white p-1 text-sm">
        {tabButton('profile', 'Profile')}
        {canReadSubscription && tabButton('subscription', 'Subscription')}
        {tabButton('owner', 'Owner')}
      </div>

      {tab === 'profile' && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">Identity</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name (EN)" value={hotel.nameEn} />
              <Row label="Name (AR)" value={<span dir="rtl">{hotel.nameAr}</span>} />
              <Row label="Slug" value={<code className="font-mono text-xs">{hotel.slug}</code>} />
              <Row
                label="Star rating"
                value={hotel.starRating === null ? 'Not rated' : '★'.repeat(hotel.starRating)}
              />
              <Row label="Rooms" value={hotel.roomsCount.toLocaleString()} />
            </dl>
            {canUpdate && (
              <div className="mt-4 border-t border-line pt-4">
                <label className="text-sm text-ink-soft">
                  <span className="mb-1 block font-medium text-ink">
                    {hotel.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </span>
                  <input
                    type="file"
                    accept={LOGO_TYPES.join(',')}
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                    className="text-sm text-ink-soft file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-ink"
                  />
                </label>
                {uploadingLogo && (
                  <p className="mt-1 text-xs text-ink-soft">Uploading…</p>
                )}
                {logoError && (
                  <p className="mt-1 text-xs text-danger">{logoError}</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">Contact</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Email" value={hotel.contactEmail} />
              <Row label="Phone" value={hotel.contactPhone} />
              <Row label="Address" value={hotel.address ?? '—'} />
              <Row label="City" value={hotel.city} />
              <Row label="Country" value={hotel.country} />
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">Locale</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Timezone" value={hotel.timezone} />
              <Row
                label="Default language"
                value={hotel.defaultLanguage === 'ar' ? 'Arabic (العربية)' : 'English'}
              />
              <Row label="Currency" value={hotel.currency} />
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display font-semibold text-ink">Audit</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Onboarded by" value={hotel.onboardedBy?.name ?? '—'} />
              <Row label="Onboarded at" value={formatDate(hotel.createdAt)} />
              <Row label="Last updated" value={formatDate(hotel.updatedAt)} />
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
            <h2 className="font-display font-semibold text-ink">Tenant URLs</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Derived from the slug — share these with the hotel.
              {suspended &&
                ' While suspended, both resolve to an "unavailable" page.'}
            </p>
            <div className="mt-3 space-y-2">
              <UrlRow label="Tenant dashboard" value={hotel.urls.tenantDashboard} />
              <UrlRow label="Guest app" value={hotel.urls.guestApp} />
            </div>
          </div>
        </div>
      )}

      {tab === 'subscription' && canReadSubscription && (
        <div className="mt-4">
          <HotelSubscriptionTab hotelId={hotel.id} />
        </div>
      )}

      {tab === 'owner' && (
        <div className="mt-4 max-w-xl rounded-xl border border-line bg-white p-5">
          <h2 className="font-display font-semibold text-ink">Hotel owner</h2>
          {hotel.owner ? (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Name" value={hotel.owner.name} />
                <Row label="Email" value={hotel.owner.email} />
                <Row
                  label="Status"
                  value={
                    <Badge tone={hotel.owner.status === 'active' ? 'success' : 'warning'}>
                      {hotel.owner.status === 'active' ? 'Active' : 'Pending setup'}
                    </Badge>
                  }
                />
                <Row
                  label="Last login"
                  value={
                    hotel.owner.lastLoginAt
                      ? new Date(hotel.owner.lastLoginAt).toLocaleString()
                      : 'Never'
                  }
                />
              </dl>
              <p className="mt-4 text-xs text-ink-soft">
                The owner holds full permissions within this hotel only and
                manages further staff from the tenant dashboard.
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
                    Regenerate setup link
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              No owner account found for this hotel.
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
        title="Suspend hotel?"
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
          Suspending <strong className="text-ink">{hotel.nameEn}</strong> fully
          locks its tenant dashboard and guest app — staff cannot log in and
          guests see an &quot;unavailable&quot; page. No data is deleted and the
          subscription is unchanged. Reactivation restores access immediately.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Reason</span>
            <select
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value as SuspensionReason)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {Object.entries(REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Note <span className="text-ink-soft">(optional)</span>
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
            Cancel
          </Button>
          <Button variant="danger" loading={saving} onClick={handleSuspend}>
            Suspend hotel
          </Button>
        </div>
      </Modal>

      {/* Reactivate confirm */}
      <Modal
        open={reactivating}
        onClose={() => setReactivating(false)}
        title="Reactivate hotel?"
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
          <strong className="text-ink">{hotel.nameEn}</strong> regains access to
          its tenant dashboard and guest app immediately.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReactivating(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleReactivate}>
            Reactivate
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
        title={newLink ? 'New setup link' : 'Regenerate setup link?'}
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
              Shown only once — copy it now and share it with the hotel. It
              expires {new Date(newLink.expiresAt).toLocaleString()}.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-ink">
                {newLink.setupLink}
              </code>
              <CopyButton value={newLink.setupLink} label="Copy setup link" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setRegenerating(false);
                  setNewLink(null);
                }}
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              A new one-time setup link is generated for{' '}
              <strong className="text-ink">{hotel.owner?.email}</strong>. The
              previous link stops working immediately. The action is
              audit-logged.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRegenerating(false)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleRegenerate}>
                Regenerate
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
      <span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <code className="flex-1 truncate font-mono text-xs text-ink">{value}</code>
      <CopyButton value={value} label={`Copy ${label.toLowerCase()} URL`} />
    </div>
  );
}
