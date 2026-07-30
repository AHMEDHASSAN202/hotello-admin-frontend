'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useMe } from '@/lib/use-me';
import { BillingCycle, LimitViolation, PlanSummary } from '@/lib/types';

/**
 * Story 4.7 change-plan action, opened from the hotel Subscription tab.
 * On a 409 limit conflict, wildcard admins get a force-override confirm.
 */
export function ChangePlanModal({
  open,
  onClose,
  onSaved,
  hotelId,
  currentPlanId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  hotelId: string;
  currentPlanId: string | null;
}) {
  const t = useTranslations('hotels');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { hasPermission } = useMe();
  const isWildcard = hasPermission('*');

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [formError, setFormError] = useState<string | null>(null);
  const [violations, setViolations] = useState<LimitViolation[]>([]);
  const [confirmingForce, setConfirmingForce] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setViolations([]);
    setConfirmingForce(false);
    api<PlanSummary[]>('/plans?status=active')
      .then((active) => {
        setPlans(active);
        setPlanId((cur) => cur || active.find((p) => p.id !== currentPlanId)?.id || '');
      })
      .catch((err) =>
        setFormError(
          err instanceof ApiError
            ? resolveError(err)
            : t('changePlan.plansLoadError'),
        ),
      );
  }, [open, currentPlanId, resolveError, t]);

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;

  async function submit(force = false) {
    setSaving(true);
    setFormError(null);
    try {
      await api(`/hotels/${hotelId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          planId,
          billingCycle,
          ...(force ? { force: true } : {}),
        }),
      });
      setConfirmingForce(false);
      onClose();
      onSaved();
    } catch (err) {
      setConfirmingForce(false);
      if (err instanceof ApiError) {
        setFormError(resolveError(err));
        const details = err.details as { violations?: LimitViolation[] } | undefined;
        setViolations(err.status === 409 ? (details?.violations ?? []) : []);
      } else {
        setFormError(t('changePlan.failed'));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <>
      <Modal
        open={open && !confirmingForce}
        onClose={onClose}
        title={t('changePlan.title')}
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
                      {v.message ??
                        t('changePlan.violationLine', {
                          field: v.field,
                          usage: v.usage,
                          limit: v.limit,
                        })}
                    </li>
                  ))}
                </ul>
              )}
              {violations.length > 0 && isWildcard && (
                <Button
                  type="button"
                  variant="danger"
                  className="mt-2"
                  onClick={() => setConfirmingForce(true)}
                >
                  {t('changePlan.forceChange')}
                </Button>
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              {t('changePlan.plan')}
            </span>
            <select
              required
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                setViolations([]);
              }}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nameEn}
                  {plan.isTrial
                    ? t('changePlan.planOptionTrial', {
                        count: plan.trialDurationDays ?? 0,
                      })
                    : ''}
                  {plan.id === currentPlanId
                    ? t('changePlan.planOptionCurrent')
                    : ''}
                </option>
              ))}
            </select>
          </label>

          {selectedPlan && !selectedPlan.isTrial && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-ink">
                {t('changePlan.billingCycle')}
              </legend>
              <div className="flex gap-4 text-sm text-ink">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="changeBillingCycle"
                    checked={billingCycle === 'monthly'}
                    onChange={() => setBillingCycle('monthly')}
                  />
                  {t('changePlan.monthly')}
                </label>
                <label
                  className={`flex items-center gap-2 ${
                    selectedPlan.yearlyPrice === null ? 'opacity-40' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="changeBillingCycle"
                    disabled={selectedPlan.yearlyPrice === null}
                    checked={billingCycle === 'yearly'}
                    onChange={() => setBillingCycle('yearly')}
                  />
                  {t('changePlan.yearly')}
                  {selectedPlan.yearlyPrice === null &&
                    t('changePlan.yearlyUnavailable')}
                </label>
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" loading={saving} disabled={!planId}>
              {t('changePlan.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Wildcard force-override confirm */}
      <Modal
        open={open && confirmingForce}
        onClose={() => setConfirmingForce(false)}
        title={t('changePlan.forceConfirm.title')}
      >
        <p className="text-sm text-ink-soft">
          {t('changePlan.forceConfirm.body')}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingForce(false)}>
            {tCommon('actions.back')}
          </Button>
          <Button variant="danger" loading={saving} onClick={() => submit(true)}>
            {t('changePlan.forceConfirm.submit')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
