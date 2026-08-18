'use client';

import { Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Button, Code, Field, Modal, SelectField } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { citiesFor, COUNTRIES, findCountry, locationLabel } from '@/lib/locations';
import { useMe } from '@/lib/use-me';
import { HotelDetail } from '@/lib/types';

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
  latitude: number | null;
  longitude: number | null;
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
    latitude: hotel.latitude,
    longitude: hotel.longitude,
  };
}

/**
 * Story 5.4 — edit modal. Slug is locked except for Super Admin (*), whose
 * edits go through an explicit URL-change confirm (5.3 AC3). Rooms count is
 * no longer editable here — it is derived from the hotel's actual rooms
 * (Story 11.6); see the Rooms tab for that management surface.
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
  const t = useTranslations('hotels');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const resolveError = useApiError();
  const { hasPermission } = useMe();
  const isWildcard = hasPermission('*');

  const [form, setForm] = useState<HotelFormState>(() => fromHotel(hotel));
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'slug' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromHotel(hotel));
    setFormError(null);
    setConfirming(null);
  }, [open, hotel]);

  const slugChanged = form.slug !== hotel.slug;

  function update(patch: Partial<HotelFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function submit() {
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
          // Coordinates only travel with a Places-selected address (the DTO
          // rejects null).
          ...(form.latitude !== null && form.longitude !== null
            ? { latitude: form.latitude, longitude: form.longitude }
            : {}),
        }),
      });
      setConfirming(null);
      onClose();
      onSaved();
    } catch (err) {
      setConfirming(null);
      if (err instanceof ApiError) {
        setFormError(resolveError(err));
      } else {
        setFormError(t('form.saveFailed'));
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
        title={t('form.editTitle')}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              <p>{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('form.nameEn')}
              required
              value={form.nameEn}
              onChange={(e) => update({ nameEn: e.target.value })}
            />
            <Field
              label={t('form.nameAr')}
              required
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => update({ nameAr: e.target.value })}
            />
          </div>

          <div>
            <Field
              label={t('form.slug')}
              value={form.slug}
              disabled={!isWildcard}
              onChange={(e) => update({ slug: e.target.value })}
              hint={isWildcard ? t('form.slugHintWildcard') : undefined}
            />
            {!isWildcard && (
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                <Lock size={12} aria-hidden />
                {t('form.slugLocked')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('form.contactEmail')}
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => update({ contactEmail: e.target.value })}
            />
            <Field
              label={t('form.contactPhone')}
              required
              value={form.contactPhone}
              onChange={(e) => update({ contactPhone: e.target.value })}
            />
            <SelectField
              label={t('form.country')}
              required
              value={form.country}
              onChange={(e) => update({ country: e.target.value, city: '' })}
            >
              {/* Legacy free-text values stay selectable so old rows load intact. */}
              {form.country && !findCountry(form.country) && (
                <option value={form.country}>{form.country}</option>
              )}
              {COUNTRIES.map((c) => (
                <option key={c.nameEn} value={c.nameEn}>
                  {locationLabel(c, locale)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t('form.city')}
              required
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
            >
              <option value="">{t('form.selectCity')}</option>
              {form.city &&
                !citiesFor(form.country).some((c) => c.nameEn === form.city) && (
                  <option value={form.city}>{form.city}</option>
                )}
              {citiesFor(form.country).map((c) => (
                <option key={c.nameEn} value={c.nameEn}>
                  {locationLabel(c, locale)}
                </option>
              ))}
            </SelectField>
            <Field
              label={t('form.timezone')}
              value={form.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                {t('form.defaultLanguage')}
              </span>
              <select
                value={form.defaultLanguage}
                onChange={(e) => update({ defaultLanguage: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="ar">{t('form.languageArabic')}</option>
                <option value="en">{t('form.languageEnglish')}</option>
              </select>
            </label>
            <Field
              label={t('form.currency')}
              value={form.currency}
              onChange={(e) => update({ currency: e.target.value })}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                {t('form.starRating')}
              </span>
              <select
                value={form.starRating}
                onChange={(e) => update({ starRating: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="">{t('form.notRated')}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <AddressAutocomplete
            label={t('form.addressSearch')}
            hint={t('form.addressSearchHint')}
            locale={locale}
            onPlace={({ address, latitude, longitude, country, city }) => {
              const patch: Partial<HotelFormState> = {
                address,
                latitude,
                longitude,
              };
              if (country) {
                patch.country = country;
                patch.city = city ?? '';
              }
              update(patch);
            }}
          />
          <Field
            label={t('form.address')}
            value={form.address}
            readOnly
            hint={t('form.addressHint')}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {tCommon('actions.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Slug-change confirm (wildcard only) */}
      <Modal
        open={open && confirming === 'slug'}
        onClose={() => setConfirming(null)}
        title={t('form.slugConfirm.title')}
      >
        <p className="text-sm text-ink-soft">
          {t.rich('form.slugConfirm.body', {
            slug: form.slug,
            slugTag: (chunks) => <Code className="text-ink">{chunks}</Code>,
          })}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            {tCommon('actions.back')}
          </Button>
          <Button variant="danger" loading={saving} onClick={() => submit()}>
            {t('form.slugConfirm.submit')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
