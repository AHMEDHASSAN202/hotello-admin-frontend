'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { tokenStore } from '@/lib/auth';
import { LoginResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
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
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
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
          One platform for every stay,
          <span className="text-gold"> from check-in to checkout.</span>
        </p>
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} Hotello
        </p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center bg-paper p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-ink">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Access the Super Admin dashboard
            </p>
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
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
