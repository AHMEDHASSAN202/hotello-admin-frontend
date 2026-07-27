'use client';

import { Lock } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Button, Field, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/use-me';
import { HotelDetail, LimitViolation } from '@/lib/types';

interface HotelFormState {
  nameEn: string;
  nameAr: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  country: string;
  timezone: string;
  defaultLanguage: string;
  currency: string;
  starRating: string;
  address: string;
  roomsCount: string;
}

function fromHotel(hotel: HotelDetail): HotelFormState {
  return {
    nameEn: hotel.nameEn,
    nameAr: hotel.nameAr,
    slug: hotel.slug,
    contactEmail: hotel.contactEmail,
    contactPhone: hotel.contactPhone,
    city: hotel.city,
    country: hotel.country,
    timezone: hotel.timezone,
    defaultLanguage: hotel.defaultLanguage,
    currency: hotel.currency,
    starRating: hotel.starRating === null ? '' : String(hotel.starRating),
    address: hotel.address ?? '',
    roomsCount: String(hotel.roomsCount),
  };
}

/**
 * Story 5.4 — edit modal. Slug is locked except for Super Admin (*), whose
 * edits go through an explicit URL-change confirm (5.3 AC3). A 409 rooms
 * conflict renders the violations with a wildcard-only force override.
 */
export function HotelFormModal({
  open,
  onClose,
  onSaved,
  hotel,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  hotel: HotelDetail;
}) {
  const { hasPermission } = useMe();
  const isWildcard = hasPermission('*');

  const [form, setForm] = useState<HotelFormState>(() => fromHotel(hotel));
  const [formError, setFormError] = useState<string | null>(null);
  const [violations, setViolations] = useState<LimitViolation[]>([]);
  const [confirming, setConfirming] = useState<'slug' | 'force' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromHotel(hotel));
    setFormError(null);
    setViolations([]);
    setConfirming(null);
  }, [open, hotel]);

  const slugChanged = form.slug !== hotel.slug;

  function update(patch: Partial<HotelFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function submit(force = false) {
    setSaving(true);
    setFormError(null);
    try {
      await api<HotelDetail>(`/hotels/${hotel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          ...(slugChanged ? { slug: form.slug.trim() } : {}),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          timezone: form.timezone.trim(),
          defaultLanguage: form.defaultLanguage,
          currency: form.currency.trim(),
          ...(form.starRating ? { starRating: Number(form.starRating) } : {}),
          address: form.address.trim(),
          roomsCount: Number(form.roomsCount) || 0,
          ...(force ? { force: true } : {}),
        }),
      });
      setConfirming(null);
      onClose();
      onSaved();
    } catch (err) {
      setConfirming(null);
      if (err instanceof ApiError) {
        setFormError(err.message);
        const details = err.details as { violations?: LimitViolation[] } | undefined;
        setViolations(err.status === 409 ? (details?.violations ?? []) : []);
      } else {
        setFormError('Save failed');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (slugChanged) {
      // Extra friction: slug edits change the tenant URLs.
      setConfirming('slug');
      return;
    }
    submit();
  }

  return (
    <>
      <Modal
        open={open && confirming === null}
        onClose={onClose}
        title="Edit hotel"
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              <p>{formError}</p>
              {violations.length > 0 && (
                <ul className="mt-1 list-inside list-disc">
                  {violations.map((v, i) => (
                    <li key={i}>
                      {v.message ?? `${v.field}: usage ${v.usage}, limit ${v.limit}`}
                    </li>
                  ))}
                </ul>
              )}
              {violations.length > 0 && isWildcard && (
                <Button
                  type="button"
                  variant="danger"
                  className="mt-2"
                  onClick={() => setConfirming('force')}
                >
                  Force past the limit
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Name (English)"
              required
              value={form.nameEn}
              onChange={(e) => update({ nameEn: e.target.value })}
            />
            <Field
              label="Name (Arabic)"
              required
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => update({ nameAr: e.target.value })}
            />
          </div>

          <div>
            <Field
              label="Slug"
              value={form.slug}
              disabled={!isWildcard}
              onChange={(e) => update({ slug: e.target.value })}
              hint={
                isWildcard
                  ? 'Changing the slug changes the tenant URLs — the change is audit-logged.'
                  : undefined
              }
            />
            {!isWildcard && (
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                <Lock size={12} aria-hidden />
                Immutable — only Super Admin (*) can change a slug.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Contact email"
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => update({ contactEmail: e.target.value })}
            />
            <Field
              label="Contact phone"
              required
              value={form.contactPhone}
              onChange={(e) => update({ contactPhone: e.target.value })}
            />
            <Field
              label="City"
              required
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
            />
            <Field
              label="Country"
              value={form.country}
              onChange={(e) => update({ country: e.target.value })}
            />
            <Field
              label="Timezone"
              value={form.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Default language
              </span>
              <select
                value={form.defaultLanguage}
                onChange={(e) => update({ defaultLanguage: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="ar">Arabic (العربية)</option>
                <option value="en">English</option>
              </select>
            </label>
            <Field
              label="Currency"
              value={form.currency}
              onChange={(e) => update({ currency: e.target.value })}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Star rating
              </span>
              <select
                value={form.starRating}
                onChange={(e) => update({ starRating: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Rooms count"
              type="number"
              min={0}
              value={form.roomsCount}
              onChange={(e) => {
                update({ roomsCount: e.target.value });
                setViolations([]);
              }}
              hint="Checked against the current plan's room limit."
            />
          </div>

          <Field
            label="Address"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Slug-change confirm (wildcard only) */}
      <Modal
        open={open && confirming === 'slug'}
        onClose={() => setConfirming(null)}
        title="Change the slug?"
      >
        <p className="text-sm text-ink-soft">
          The slug becomes <strong className="font-mono text-ink">{form.slug}</strong>,
          which changes the tenant dashboard and guest app URLs immediately.
          Links shared with the hotel stop working. The change is audit-logged
          with old and new values.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Back
          </Button>
          <Button variant="danger" loading={saving} onClick={() => submit()}>
            Change slug
          </Button>
        </div>
      </Modal>

      {/* Rooms-limit force confirm (wildcard only) */}
      <Modal
        open={open && confirming === 'force'}
        onClose={() => setConfirming(null)}
        title="Force past the plan limit?"
      >
        <p className="text-sm text-ink-soft">
          The rooms count exceeds the current plan&apos;s limit. Forcing the
          update puts the hotel over its plan immediately — the override is
          audit-logged.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Back
          </Button>
          <Button variant="danger" loading={saving} onClick={() => submit(true)}>
            Force update
          </Button>
        </div>
      </Modal>
    </>
  );
}
