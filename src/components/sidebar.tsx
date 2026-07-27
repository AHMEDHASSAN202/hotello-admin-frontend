'use client';

import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { tokenStore } from '@/lib/auth';
import { useMe } from '@/lib/use-me';

/** Items with a `permission` are hidden until /auth/me confirms the key.
 *  UX only — the backend guards every route regardless. */
const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/admins', label: 'Admins', icon: Users },
  { href: '/roles', label: 'Roles', icon: ShieldCheck },
  { href: '/hotels', label: 'Hotels', icon: Building2, permission: 'hotels.read' },
  { href: '/plans', label: 'Plans', icon: CreditCard, permission: 'plans.read' },
  { href: '/profile', label: 'My profile', icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission } = useMe();
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
    <aside className="flex h-screen w-60 flex-col bg-ink-deep text-white">
      <div className="px-6 py-7">
        <p className="font-display text-xl font-bold tracking-wide">Hotello</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-gold">
          Super Admin
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {visibleItems.map(({ href, label, icon: Icon }) => {
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
              {/* Gold key-tag rail marking the active section */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-gold"
                />
              )}
              <Icon size={17} aria-hidden />
              {label}
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
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
