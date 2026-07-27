'use client';

import { ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { AdminUser, MeResponse, Paginated, RoleSummary } from '@/lib/types';

export default function OverviewPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [adminsCount, setAdminsCount] = useState<number | null>(null);
  const [rolesCount, setRolesCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, adminsRes, rolesRes] = await Promise.all([
        api<MeResponse>('/auth/me'),
        api<Paginated<AdminUser>>('/admins?pageSize=1'),
        api<RoleSummary[]>('/roles'),
      ]);
      setMe(meRes);
      setAdminsCount(adminsRes.total);
      setRolesCount(rolesRes.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const cards = [
    {
      href: '/admins',
      label: 'Admins',
      value: adminsCount,
      icon: Users,
      hint: 'Accounts with dashboard access',
    },
    {
      href: '/roles',
      label: 'Roles',
      value: rolesCount,
      icon: ShieldCheck,
      hint: 'Permission sets in use',
    },
  ];

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-gold">
        Overview
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        Welcome back{me ? `, ${me.name}` : ''}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Here is the current state of platform administration.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ href, label, value, icon: Icon, hint }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-line bg-white p-6 transition-colors hover:border-gold"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-soft">{label}</p>
              <Icon size={18} className="text-gold" aria-hidden />
            </div>
            <p className="mt-2 font-display text-4xl font-bold text-ink">
              {value ?? '—'}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
