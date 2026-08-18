'use client';

import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Mail,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { tokenStore } from '@/lib/auth';
import { useMe } from '@/lib/use-me';

/** Items with a `permission` are hidden until /auth/me confirms the key.
 *  UX only — the backend guards every route regardless. `labelKey` resolves
 *  against the `common.nav` namespace. */
type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'overview', icon: LayoutDashboard },
  { href: '/admins', labelKey: 'admins', icon: Users },
  { href: '/roles', labelKey: 'roles', icon: ShieldCheck },
  { href: '/hotels', labelKey: 'hotels', icon: Building2, permission: 'hotels.read' },
  { href: '/plans', labelKey: 'plans', icon: CreditCard, permission: 'plans.read' },
  {
    href: '/notifications',
    labelKey: 'notifications',
    icon: Mail,
    permission: 'notifications.read',
  },
  { href: '/profile', labelKey: 'profile', icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission } = useMe();
  const t = useTranslations('common');
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Local logout still proceeds if the API call fails.
    }
    tokenStore.clear();
    router.push('/login');
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-ink-deep text-white">
      <div className="px-6 py-7">
        <p className="font-display text-xl font-bold tracking-wide">
          {t('brand.name')}
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-gold">
          {t('brand.superAdmin')}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label={t('nav.main')}>
        {visibleItems.map(({ href, labelKey, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {/* Gold key-tag rail on the inline-start edge — mirrors in RTL
                  via logical properties (AC 7.3-3). */}
              {active && (
                <span
                  aria-hidden
                  className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e bg-gold"
                />
              )}
              <Icon size={17} aria-hidden />
              {t(`nav.${labelKey}`)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <LogOut size={17} aria-hidden />
          {loggingOut ? t('userMenu.signingOut') : t('userMenu.signOut')}
        </button>
      </div>
    </aside>
  );
}
