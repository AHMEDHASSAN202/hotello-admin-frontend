'use client';

import { ShieldCheck, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bdi, ErrorState } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { useFormatters } from '@/i18n/use-format';
import { AdminUser, MeResponse, Paginated, RoleSummary } from '@/lib/types';

export default function OverviewPage() {
  const t = useTranslations('overview');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();
  const { formatNumber } = useFormatters();

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
      setError(err instanceof ApiError ? resolveError(err) : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const cards = [
    {
      href: '/admins',
      label: t('cards.admins.label'),
      value: adminsCount,
      icon: Users,
      hint: t('cards.admins.hint'),
    },
    {
      href: '/roles',
      label: t('cards.roles.label'),
      value: rolesCount,
      icon: ShieldCheck,
      hint: t('cards.roles.hint'),
    },
  ];

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-gold">
        {t('eyebrow')}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        {me ? (
          // Name may be a Latin value — isolate it in RTL (AC 7.3-5).
          t.rich('welcomeNamed', {
            name: me.name,
            bdi: (chunks) => <Bdi>{chunks}</Bdi>,
          })
        ) : (
          t('welcome')
        )}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>

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
              {value === null ? tCommon('states.notAvailable') : formatNumber(value)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
