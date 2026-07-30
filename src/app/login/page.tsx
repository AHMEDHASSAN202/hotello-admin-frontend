'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button, Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { tokenStore } from '@/lib/auth';
import { useApiError } from '@/lib/errors';
import { LoginResponse } from '@/lib/types';
import { isLocale } from '@/i18n/config';
import { setLocaleCookie } from '@/i18n/locale';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const resolveError = useApiError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      tokenStore.set(res.accessToken, res.refreshToken);
      // Profile language wins over the browser cookie on login (AC 7.2-2):
      // apply it before navigating so the dashboard renders in it immediately.
      const preferred = res.admin.preferredLanguage;
      if (isLocale(preferred)) setLocaleCookie(preferred);
      router.push('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? resolveError(err) : t('genericError'),
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden flex-1 flex-col justify-between bg-ink-deep p-12 lg:flex">
        <div>
          <p className="font-display text-2xl font-bold text-white">Hotello</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-gold">
            Guest Experience Platform
          </p>
        </div>
        <p className="max-w-sm font-display text-3xl font-semibold leading-snug text-white">
          {t('taglineLead')}
          <span className="text-gold">{t('taglineAccent')}</span>
        </p>
        <p className="text-sm text-white/50">
          {t('copyright', { year: String(new Date().getFullYear()) })}
        </p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-paper p-8">
        <div className="mb-6 flex w-full max-w-sm justify-end">
          {/* Switcher on the pre-login page reads/writes the cookie only. */}
          <LanguageSwitcher persist={false} />
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-ink">
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <Field
            label={t('email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label={t('password')}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            {t('submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
