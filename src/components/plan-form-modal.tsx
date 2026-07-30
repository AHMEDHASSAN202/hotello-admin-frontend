'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { Bdi, Button, Code, Field, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
import { LimitViolation, ModuleCatalogEntry, PlanDetail } from '@/lib/types';

interface PlanFormState {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  monthlyPrice: string;
  yearlyPrice: string;
  currency: string;
  maxRooms: string; // '' = unlimited
  maxStaffUsers: string;
  maxGuestRequestsPerMonth: string;
  enabledModules: string[];
  isTrial: boolean;
  trialDurationDays: string;
}

const EMPTY_FORM: PlanFormState = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  monthlyPrice: '',
  yearlyPrice: '',
  currency: 'EGP',
  maxRooms: '',
  maxStaffUsers: '',
  maxGuestRequestsPerMonth: '',
  enabledModules: [],
  isTrial: false,
  trialDurationDays: '14',
};

const LIMIT_FIELDS = [
  { key: 'maxRooms', labelKey: 'maxRooms' },
  { key: 'maxStaffUsers', labelKey: 'maxStaffUsers' },
  { key: 'maxGuestRequestsPerMonth', labelKey: 'maxGuestRequests' },
] as const;

function toFormState(plan: PlanDetail): PlanFormState {
  return {
    nameEn: plan.nameEn,
    nameAr: plan.nameAr,
    descriptionEn: plan.descriptionEn ?? '',
    descriptionAr: plan.descriptionAr ?? '',
    monthlyPrice: String(plan.monthlyPrice),
    yearlyPrice: plan.yearlyPrice === null ? '' : String(plan.yearlyPrice),
    currency: plan.currency,
    maxRooms: plan.maxRooms === null ? '' : String(plan.maxRooms),
    maxStaffUsers: plan.maxStaffUsers === null ? '' : String(plan.maxStaffUsers),
    maxGuestRequestsPerMonth:
      plan.maxGuestRequestsPerMonth === null
        ? ''
        : String(plan.maxGuestRequestsPerMonth),
    enabledModules: [...plan.enabledModules],
    isTrial: plan.isTrial,
    trialDurationDays:
      plan.trialDurationDays === null ? '14' : String(plan.trialDurationDays),
  };
}

function limitValue(raw: string): number | null {
  return raw.trim() === '' ? null : Number(raw);
}

function buildPayload(form: PlanFormState) {
  return {
    nameEn: form.nameEn,
    nameAr: form.nameAr,
    descriptionEn: form.descriptionEn || null,
    descriptionAr: form.descriptionAr || null,
    monthlyPrice: Number(form.monthlyPrice),
    yearlyPrice: form.yearlyPrice.trim() === '' ? null : Number(form.yearlyPrice),
    currency: form.currency || 'EGP',
    maxRooms: limitValue(form.maxRooms),
    maxStaffUsers: limitValue(form.maxStaffUsers),
    maxGuestRequestsPerMonth: limitValue(form.maxGuestRequestsPerMonth),
    enabledModules: form.enabledModules,
    isTrial: form.isTrial,
    trialDurationDays: form.isTrial ? Number(form.trialDurationDays) : null,
  };
}

/** Shared by the list (create) and detail (edit) pages. */
export function PlanFormModal({
  open,
  onClose,
  onSaved,
  catalog,
  plan,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  catalog: ModuleCatalogEntry[];
  /** Null = create mode. */
  plan: PlanDetail | null;
}) {
  const t = useTranslations('plans');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatNumber } = useFormatters();

  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [violations, setViolations] = useState<LimitViolation[]>([]);
  const [confirmingImpact, setConfirmingImpact] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(plan ? toFormState(plan) : EMPTY_FORM);
      setFormError(null);
      setViolations([]);
      setConfirmingImpact(false);
    }
  }, [open, plan]);

  function toggleModule(key: string) {
    setForm((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(key)
        ? prev.enabledModules.filter((m) => m !== key)
        : [...prev.enabledModules, key],
    }));
  }

  /** SA-PLAN-4 AC2 — warn when limits/modules change on a subscribed plan. */
  function impactRequiresConfirmation(): boolean {
    if (!plan || plan.subscriberCount === 0) return false;
    const payload = buildPayload(form);
    const limitsChanged = LIMIT_FIELDS.some(
      ({ key }) => payload[key] !== plan[key],
    );
    const modulesChanged =
      [...payload.enabledModules].sort().join(',') !==
      [...plan.enabledModules].sort().join(',');
    return limitsChanged || modulesChanged;
  }

  async function submit() {
    setSaving(true);
    setFormError(null);
    setViolations([]);
    try {
      const payload = buildPayload(form);
      if (plan) {
        await api<PlanDetail>(`/plans/${plan.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api<PlanDetail>('/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(resolveError(err));
        const details = err.details as
          | { violations?: LimitViolation[] }
          | undefined;
        if ((err.status === 409 || err.status === 422) && details?.violations) {
          setViolations(details.violations);
        }
      } else {
        setFormError(t('form.saveError'));
      }
      setConfirmingImpact(false);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.enabledModules.length === 0) {
      setFormError(t('form.selectModule'));
      return;
    }
    if (impactRequiresConfirmation()) {
      setConfirmingImpact(true);
      return;
    }
    submit();
  }

  return (
    <>
      <Modal
        open={open && !confirmingImpact}
        onClose={onClose}
        title={plan ? t('form.editTitle') : t('form.createTitle')}
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
                <ul className="mt-2 list-inside list-disc space-y-0.5">
                  {violations.map((v, i) => (
                    <li key={i}>
                      {t.rich('form.violation', {
                        usage: formatNumber(v.usage),
                        limit: formatNumber(v.limit),
                        name: () => (
                          <Bdi className="font-medium">{v.hotelName}</Bdi>
                        ),
                        field: () => <Code>{v.field}</Code>,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('form.nameEn')}
              required
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
            <Field
              label={t('form.nameAr')}
              required
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
            <Field
              label={t('form.descriptionEn')}
              value={form.descriptionEn}
              onChange={(e) =>
                setForm({ ...form, descriptionEn: e.target.value })
              }
            />
            <Field
              label={t('form.descriptionAr')}
              dir="rtl"
              value={form.descriptionAr}
              onChange={(e) =>
                setForm({ ...form, descriptionAr: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label={t('form.monthlyPrice')}
              required
              type="number"
              min={0}
              step="0.01"
              value={form.monthlyPrice}
              onChange={(e) =>
                setForm({ ...form, monthlyPrice: e.target.value })
              }
            />
            <Field
              label={t('form.yearlyPrice')}
              type="number"
              min={0}
              step="0.01"
              hint={t('form.yearlyHint')}
              value={form.yearlyPrice}
              onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })}
            />
            <Field
              label={t('form.currency')}
              required
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              {t('form.limitsLegend')}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {LIMIT_FIELDS.map(({ key, labelKey }) => (
                <Field
                  key={key}
                  label={t(`form.${labelKey}`)}
                  type="number"
                  min={1}
                  hint={t('form.limitHint')}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              {t('form.modulesLegend')}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {catalog.map((mod) => {
                const selected = form.enabledModules.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleModule(mod.key)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      selected
                        ? 'border-gold/60 bg-gold-soft text-ink'
                        : 'border-line bg-white text-ink-soft hover:border-gold/40'
                    }`}
                  >
                    {mod.labelEn} · {mod.labelAr}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="rounded-lg border border-line p-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isTrial}
                onChange={(e) => setForm({ ...form, isTrial: e.target.checked })}
              />
              {t('form.trial')}
            </label>
            {form.isTrial && (
              <div className="mt-3 max-w-xs">
                <Field
                  label={t('form.trialDuration')}
                  required
                  type="number"
                  min={1}
                  hint={t('form.trialHint')}
                  value={form.trialDurationDays}
                  onChange={(e) =>
                    setForm({ ...form, trialDurationDays: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {plan ? t('form.saveSubmit') : t('form.createSubmit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Impact warning (SA-PLAN-4 AC2) */}
      <Modal
        open={open && confirmingImpact}
        onClose={() => setConfirmingImpact(false)}
        title={t('impactDialog.title')}
      >
        <p className="text-sm text-ink-soft">
          {t.rich('impactDialog.body', {
            count: plan?.subscriberCount ?? 0,
            strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
          })}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingImpact(false)}>
            {tCommon('actions.back')}
          </Button>
          <Button loading={saving} onClick={submit}>
            {t('impactDialog.apply')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
