'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CopyButton } from '@/components/copy-button';
import { Badge, Button, ErrorState, Field } from '@/components/ui';
import { api, ApiError, apiUpload } from '@/lib/api';
import {
  LimitViolation,
  OnboardHotelResponse,
  PlanSummary,
  SlugAvailability,
} from '@/lib/types';

/** Client mirror of the backend rules — the API re-validates everything. */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'www', 'guest', 'mail', 'dashboard', 'portal',
  'auth', 'login', 'static', 'assets', 'cdn', 'docs', 'help', 'support',
  'status', 'staging', 'dev', 'test', 'tenant', 'hotello', 'gxp',
]);
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const STEPS = ['Profile', 'Plan', 'Owner'] as const;

type SlugCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'unavailable'; message: string };

interface ProfileForm {
  nameEn: string;
  nameAr: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  country: string;
  timezone: string;
  defaultLanguage: 'ar' | 'en';
  currency: string;
  starRating: string;
  address: string;
  roomsCount: string;
}

const EMPTY_PROFILE: ProfileForm = {
  nameEn: '',
  nameAr: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  city: '',
  country: 'Egypt',
  timezone: 'Africa/Cairo',
  defaultLanguage: 'ar',
  currency: 'EGP',
  starRating: '',
  address: '',
  roomsCount: '',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function slugProblem(slug: string): string | null {
  if (!SLUG_REGEX.test(slug)) {
    return 'Lowercase letters, numbers and hyphens; 3–40 characters; no leading/trailing hyphen.';
  }
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is a reserved word.`;
  return null;
}

export default function OnboardHotelPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugCheck, setSlugCheck] = useState<SlugCheck>({ state: 'idle' });
  const slugTimer = useRef<ReturnType<typeof setTimeout>>();

  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerEmailError, setOwnerEmailError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploadWarning, setLogoUploadWarning] = useState<string | null>(null);

  const [violations, setViolations] = useState<LimitViolation[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardHotelResponse | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansError(null);
    try {
      const active = await api<PlanSummary[]>('/plans?status=active');
      setPlans(active);
      // Story 5.3 AC4 — Free Trial is pre-selected by default.
      const trial = active.find((p) => p.isTrial);
      setPlanId((current) => current || (trial?.id ?? active[0]?.id ?? ''));
    } catch (err) {
      setPlansError(
        err instanceof ApiError ? err.message : 'Failed to load plans',
      );
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => () => clearTimeout(slugTimer.current), []);

  // Object URLs must be revoked to avoid leaking blobs.
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function updateProfile(patch: Partial<ProfileForm>) {
    setProfile((prev) => ({ ...prev, ...patch }));
  }

  function handleNameEnChange(value: string) {
    const patch: Partial<ProfileForm> = { nameEn: value };
    if (!slugEdited) patch.slug = slugify(value);
    updateProfile(patch);
    if (!slugEdited && patch.slug) scheduleSlugCheck(patch.slug);
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    updateProfile({ slug: value });
    scheduleSlugCheck(value);
  }

  function scheduleSlugCheck(slug: string) {
    clearTimeout(slugTimer.current);
    const problem = slugProblem(slug);
    if (problem) {
      setSlugCheck({ state: 'unavailable', message: problem });
      return;
    }
    setSlugCheck({ state: 'checking' });
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await api<SlugAvailability>(
          `/hotels/slug-availability?slug=${encodeURIComponent(slug)}`,
        );
        if (res.available) setSlugCheck({ state: 'available' });
        else if (res.reason === 'taken') {
          setSlugCheck({ state: 'unavailable', message: 'Already taken.' });
        } else if (res.reason === 'reserved') {
          setSlugCheck({ state: 'unavailable', message: 'Reserved word.' });
        } else {
          setSlugCheck({ state: 'unavailable', message: 'Invalid slug.' });
        }
      } catch {
        // Availability is re-checked on submit — do not block the wizard.
        setSlugCheck({ state: 'idle' });
      }
    }, 400);
  }

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoError(null);
    if (!file) {
      setLogoFile(null);
      return;
    }
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError('Logo must be PNG, JPG, WebP or SVG.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Logo must be 2MB or smaller.');
      return;
    }
    setLogoFile(file);
  }

  const selectedPlan = plans?.find((p) => p.id === planId) ?? null;

  const profileComplete =
    profile.nameEn.trim() !== '' &&
    profile.nameAr.trim() !== '' &&
    profile.contactEmail.trim() !== '' &&
    profile.contactPhone.trim() !== '' &&
    profile.city.trim() !== '' &&
    slugProblem(profile.slug) === null &&
    slugCheck.state !== 'unavailable' &&
    slugCheck.state !== 'checking';

  const stepComplete = [
    profileComplete,
    selectedPlan !== null,
    ownerName.trim() !== '' && /\S+@\S+\.\S+/.test(ownerEmail),
  ];

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setOwnerEmailError(null);
    setViolations([]);
    try {
      const created = await api<OnboardHotelResponse>('/hotels', {
        method: 'POST',
        body: JSON.stringify({
          profile: {
            nameEn: profile.nameEn.trim(),
            nameAr: profile.nameAr.trim(),
            slug: profile.slug,
            contactEmail: profile.contactEmail.trim(),
            contactPhone: profile.contactPhone.trim(),
            city: profile.city.trim(),
            country: profile.country.trim() || undefined,
            timezone: profile.timezone.trim() || undefined,
            defaultLanguage: profile.defaultLanguage,
            currency: profile.currency.trim() || undefined,
            starRating: profile.starRating ? Number(profile.starRating) : undefined,
            address: profile.address.trim() || undefined,
            roomsCount: profile.roomsCount ? Number(profile.roomsCount) : undefined,
          },
          plan: {
            planId,
            ...(selectedPlan && !selectedPlan.isTrial ? { billingCycle } : {}),
          },
          owner: { name: ownerName.trim(), email: ownerEmail.trim() },
        }),
      });

      // Best-effort logo upload after the hotel exists (transaction is JSON-only).
      if (logoFile) {
        const form = new FormData();
        form.append('file', logoFile);
        try {
          await apiUpload(`/hotels/${created.hotel.id}/logo`, form);
        } catch (err) {
          setLogoUploadWarning(
            err instanceof ApiError
              ? `Hotel created, but the logo upload failed: ${err.message}`
              : 'Hotel created, but the logo upload failed.',
          );
        }
      }
      setResult(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as
          | { field?: string; violations?: LimitViolation[] }
          | undefined;
        if (err.status === 422 && details?.field === 'owner.email') {
          // Story 5.6 AC2 — inline on step 3 without losing entered data.
          setStep(2);
          setOwnerEmailError(err.message);
        } else if (err.status === 409 && details?.violations?.length) {
          setStep(1);
          setViolations(details.violations);
          setSubmitError(err.message);
        } else if (err.status === 409) {
          setStep(0);
          setSlugCheck({ state: 'unavailable', message: 'Already taken.' });
          setSubmitError(err.message);
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('Onboarding failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------- Success */
  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-line bg-white p-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} className="text-success" aria-hidden />
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">
                Hotel onboarded
              </h1>
              <p className="text-sm text-ink-soft">
                {result.hotel.nameEn} ·{' '}
                <span dir="rtl">{result.hotel.nameAr}</span> is live on the{' '}
                {result.subscription.status === 'trial'
                  ? `trial (${result.subscription.daysRemaining} days remaining)`
                  : 'platform'}
                .
              </p>
            </div>
          </div>

          {logoUploadWarning && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              {logoUploadWarning} You can retry from the hotel profile.
            </div>
          )}

          <div className="mt-6 space-y-3">
            <UrlRow label="Tenant dashboard" value={result.hotel.urls.tenantDashboard} />
            <UrlRow label="Guest app" value={result.hotel.urls.guestApp} />
          </div>

          <div className="mt-6 rounded-lg border border-gold/40 bg-gold-soft p-4">
            <p className="text-sm font-medium text-ink">
              Owner setup link — shown only once
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Share it with {result.owner.name} ({result.owner.email}) so they
              can set their password. It expires{' '}
              {new Date(result.owner.setupLinkExpiresAt).toLocaleString()} and
              cannot be viewed again — only regenerated.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-ink">
                {result.owner.setupLink}
              </code>
              <CopyButton value={result.owner.setupLink} label="Copy setup link" />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => router.push('/hotels')}>
              All hotels
            </Button>
            <Button onClick={() => router.push(`/hotels/${result.hotel.id}`)}>
              Go to hotel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------- Wizard */
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/hotels"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden /> All hotels
      </Link>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          Tenants
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          Onboard hotel
        </h1>
      </div>

      {/* Stepper */}
      <ol className="mt-6 flex items-center gap-2" aria-label="Onboarding steps">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-8 bg-line" aria-hidden />}
              <span
                aria-current={current ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                  current
                    ? 'bg-ink font-medium text-white'
                    : done
                      ? 'bg-success/10 text-success'
                      : 'bg-paper text-ink-soft'
                }`}
              >
                {done ? (
                  <Check size={14} aria-hidden />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {submitError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {submitError}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-line bg-white p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Name (English)"
                required
                value={profile.nameEn}
                onChange={(e) => handleNameEnChange(e.target.value)}
              />
              <Field
                label="Name (Arabic)"
                required
                dir="rtl"
                value={profile.nameAr}
                onChange={(e) => updateProfile({ nameAr: e.target.value })}
              />
            </div>

            <div>
              <Field
                label="Slug"
                required
                value={profile.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                hint="Lowercase kebab-case. Drives the tenant URLs and cannot be changed later."
                error={
                  slugCheck.state === 'unavailable' ? slugCheck.message : undefined
                }
              />
              {slugCheck.state === 'checking' && (
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                  <Loader2 size={12} className="animate-spin" aria-hidden />
                  Checking availability…
                </p>
              )}
              {slugCheck.state === 'available' && (
                <p className="mt-1 flex items-center gap-1 text-xs text-success">
                  <Check size={12} aria-hidden /> Available
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Contact email"
                type="email"
                required
                value={profile.contactEmail}
                onChange={(e) => updateProfile({ contactEmail: e.target.value })}
              />
              <Field
                label="Contact phone"
                required
                value={profile.contactPhone}
                onChange={(e) => updateProfile({ contactPhone: e.target.value })}
              />
              <Field
                label="City"
                required
                value={profile.city}
                onChange={(e) => updateProfile({ city: e.target.value })}
              />
              <Field
                label="Country"
                value={profile.country}
                onChange={(e) => updateProfile({ country: e.target.value })}
              />
              <Field
                label="Timezone"
                value={profile.timezone}
                onChange={(e) => updateProfile({ timezone: e.target.value })}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Default language
                </span>
                <select
                  value={profile.defaultLanguage}
                  onChange={(e) =>
                    updateProfile({
                      defaultLanguage: e.target.value as 'ar' | 'en',
                    })
                  }
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="ar">Arabic (العربية)</option>
                  <option value="en">English</option>
                </select>
              </label>
              <Field
                label="Currency"
                value={profile.currency}
                onChange={(e) => updateProfile({ currency: e.target.value })}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Star rating <span className="text-ink-soft">(optional)</span>
                </span>
                <select
                  value={profile.starRating}
                  onChange={(e) => updateProfile({ starRating: e.target.value })}
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
                label="Rooms count (optional)"
                type="number"
                min={0}
                value={profile.roomsCount}
                onChange={(e) => updateProfile({ roomsCount: e.target.value })}
                hint="Compared against the plan's room limit."
              />
            </div>

            <Field
              label="Address (optional)"
              value={profile.address}
              onChange={(e) => updateProfile({ address: e.target.value })}
            />

            <div>
              <span className="mb-1 block text-sm font-medium text-ink">
                Logo <span className="text-ink-soft">(optional)</span>
              </span>
              <div className="flex items-center gap-3">
                {logoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-12 w-12 rounded-lg border border-line object-cover"
                  />
                )}
                <input
                  type="file"
                  accept={LOGO_TYPES.join(',')}
                  onChange={handleLogoChange}
                  aria-label="Hotel logo"
                  className="text-sm text-ink-soft file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-ink"
                />
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                PNG, JPG, WebP or SVG — up to 2MB. Uploaded after the hotel is
                created.
              </p>
              {logoError && (
                <p className="mt-1 text-xs text-danger">{logoError}</p>
              )}
            </div>
          </div>
        )}

        {step === 1 &&
          (plansError ? (
            <ErrorState message={plansError} onRetry={loadPlans} />
          ) : plans === null ? (
            <p className="text-sm text-ink-soft">Loading plans…</p>
          ) : (
            <div className="space-y-4">
              {violations.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
                >
                  <p>The selected plan cannot fit this hotel:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {violations.map((v, i) => (
                      <li key={i}>{v.message ?? `${v.field}: ${v.usage} > ${v.limit}`}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {plans.map((plan) => {
                  const selected = plan.id === planId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setPlanId(plan.id);
                        setViolations([]);
                      }}
                      aria-pressed={selected}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? 'border-ink bg-ink/5 ring-1 ring-ink'
                          : 'border-line bg-white hover:border-ink/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ink">{plan.nameEn}</p>
                        {plan.isTrial && (
                          <Badge tone="gold">
                            {plan.trialDurationDays}-day trial
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-soft" dir="rtl">
                        {plan.nameAr}
                      </p>
                      <p className="mt-2 text-sm text-ink">
                        {plan.isTrial
                          ? 'Free'
                          : `${plan.monthlyPrice.toLocaleString()} ${plan.currency}/mo`}
                        {!plan.isTrial && plan.yearlyPrice !== null && (
                          <span className="text-ink-soft">
                            {' '}
                            · {plan.yearlyPrice.toLocaleString()} {plan.currency}/yr
                          </span>
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedPlan && !selectedPlan.isTrial && (
                <fieldset>
                  <legend className="mb-1 text-sm font-medium text-ink">
                    Billing cycle
                  </legend>
                  <div className="flex gap-4 text-sm text-ink">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="billingCycle"
                        checked={billingCycle === 'monthly'}
                        onChange={() => setBillingCycle('monthly')}
                      />
                      Monthly
                    </label>
                    <label
                      className={`flex items-center gap-2 ${
                        selectedPlan.yearlyPrice === null ? 'opacity-40' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingCycle"
                        disabled={selectedPlan.yearlyPrice === null}
                        checked={billingCycle === 'yearly'}
                        onChange={() => setBillingCycle('yearly')}
                      />
                      Yearly
                      {selectedPlan.yearlyPrice === null && ' (unavailable)'}
                    </label>
                  </div>
                </fieldset>
              )}
            </div>
          ))}

        {step === 2 && (
          <div className="space-y-4">
            <Field
              label="Owner name"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            <Field
              label="Owner email"
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                setOwnerEmailError(null);
              }}
              error={ownerEmailError ?? undefined}
              hint="The owner gets full control of this hotel's dashboard."
            />
            <p className="rounded-lg bg-paper px-4 py-3 text-xs text-ink-soft">
              A one-time setup link is generated on completion. It is shown only
              once — copy it and share it with the hotel so the owner can set
              their password.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <Button
          variant="ghost"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft size={15} aria-hidden /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!stepComplete[step]} onClick={() => setStep((s) => s + 1)}>
            Next <ArrowRight size={15} aria-hidden />
          </Button>
        ) : (
          <Button
            disabled={!stepComplete[2]}
            loading={submitting}
            onClick={handleSubmit}
          >
            Onboard hotel
          </Button>
        )}
      </div>
    </div>
  );
}

function UrlRow({ label, value }: { label: string; value: string }): ReactNode {
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
