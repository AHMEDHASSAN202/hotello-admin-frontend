'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Field, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import {
  LimitViolation,
  ModuleCatalogEntry,
  PlanDetail,
} from '@/lib/types';

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
  { key: 'maxRooms', label: 'Max rooms' },
  { key: 'maxStaffUsers', label: 'Max staff users' },
  { key: 'maxGuestRequestsPerMonth', label: 'Max guest requests / month' },
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
        setFormError(err.message);
        const details = err.details as { violations?: LimitViolation[] } | undefined;
        if (err.status === 409 && details?.violations) {
          setViolations(details.violations);
        }
      } else {
        setFormError('Save failed');
      }
      setConfirmingImpact(false);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.enabledModules.length === 0) {
      setFormError('Select at least one module.');
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
        title={plan ? 'Edit plan' : 'New plan'}
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
                      <strong>{v.hotelName}</strong>: {v.field} — usage {v.usage},
                      new limit {v.limit}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Name (English)"
              required
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
            <Field
              label="Name (Arabic)"
              required
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
            <Field
              label="Description (English)"
              value={form.descriptionEn}
              onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            />
            <Field
              label="Description (Arabic)"
              dir="rtl"
              value={form.descriptionAr}
              onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Monthly price"
              required
              type="number"
              min={0}
              step="0.01"
              value={form.monthlyPrice}
              onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
            />
            <Field
              label="Yearly price"
              type="number"
              min={0}
              step="0.01"
              hint="Leave empty to disable yearly billing."
              value={form.yearlyPrice}
              onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })}
            />
            <Field
              label="Currency"
              required
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Limits</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {LIMIT_FIELDS.map(({ key, label }) => (
                <Field
                  key={key}
                  label={label}
                  type="number"
                  min={1}
                  hint="Empty = unlimited."
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              Enabled modules
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
              Trial plan
            </label>
            {form.isTrial && (
              <div className="mt-3 max-w-xs">
                <Field
                  label="Trial duration (days)"
                  required
                  type="number"
                  min={1}
                  hint="Applies to new trials only — running trials keep their end date."
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
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {plan ? 'Save changes' : 'Create plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Impact warning (SA-PLAN-4 AC2) */}
      <Modal
        open={open && confirmingImpact}
        onClose={() => setConfirmingImpact(false)}
        title="Apply changes to subscribed hotels?"
      >
        <p className="text-sm text-ink-soft">
          Changing limits or modules affects{' '}
          <strong className="text-ink">
            {plan?.subscriberCount} subscribed hotel
            {plan?.subscriberCount === 1 ? '' : 's'}
          </strong>{' '}
          immediately on save. Modules that are disabled become unavailable in
          those hotels&apos; dashboards.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingImpact(false)}>
            Back
          </Button>
          <Button loading={saving} onClick={submit}>
            Apply changes
          </Button>
        </div>
      </Modal>
    </>
  );
}
