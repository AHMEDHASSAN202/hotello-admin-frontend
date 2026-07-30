'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Badge, Bdi, Button, Code, ErrorState, Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { tokenStore } from '@/lib/auth';
import { MeResponse } from '@/lib/types';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<MeResponse>('/auth/me');
      setMe(res);
      setName(res.name);
      setEmail(res.email);
    } catch (err) {
      setError(err instanceof ApiError ? resolveError(err) : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const updated = await api<MeResponse>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email }),
      });
      setMe(updated);
      setName(updated.name);
      setEmail(updated.email);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(resolveError(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError(t('password.mismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await api<void>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      // All sessions are invalidated server-side — sign in again cleanly.
      tokenStore.clear();
      router.push('/login');
    } catch (err) {
      setPasswordError(resolveError(err));
      setSavingPassword(false);
    }
  }

  if (loading)
    return <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>;
  if (error || !me)
    return <ErrorState message={error ?? t('notFound')} onRetry={load} />;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-gold">
        {t('eyebrow')}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        {t('title')}
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile details */}
        <form
          onSubmit={handleProfileSave}
          className="space-y-4 rounded-xl border border-line bg-white p-6"
        >
          <h2 className="font-display font-semibold text-ink">
            {t('details.heading')}
          </h2>

          {profileError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {profileError}
            </div>
          )}
          {profileSaved && (
            <div
              role="status"
              className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
            >
              {t('details.saved')}
            </div>
          )}

          <Field
            label={t('details.name')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label={t('details.email')}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="border-t border-line pt-4">
            <p className="mb-2 text-sm font-medium text-ink">
              {t('details.role')}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                tone={me.role.permissions.includes('*') ? 'gold' : 'neutral'}
              >
                {me.role.name}
              </Badge>
              {me.role.permissions.includes('*') ? (
                <Badge tone="gold">{t('details.fullAccess')}</Badge>
              ) : (
                me.role.permissions.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs text-ink-soft"
                  >
                    <Code>{p}</Code>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>
              {t('details.save')}
            </Button>
          </div>
        </form>

        {/* Change password */}
        <form
          onSubmit={handlePasswordChange}
          className="h-fit space-y-4 rounded-xl border border-line bg-white p-6"
        >
          <h2 className="font-display font-semibold text-ink">
            {t('password.heading')}
          </h2>
          <p className="text-xs text-ink-soft">{t('password.notice')}</p>

          {passwordError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {passwordError}
            </div>
          )}

          <Field
            label={t('password.current')}
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Field
            label={t('password.new')}
            type="password"
            autoComplete="new-password"
            required
            hint={t('password.newHint')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Field
            label={t('password.confirm')}
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="danger" loading={savingPassword}>
              {t('password.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
