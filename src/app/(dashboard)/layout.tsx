import { LanguageSwitcher } from '@/components/language-switcher';
import { Sidebar } from '@/components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Sidebar is the first flex child, so dir="rtl" moves it to the right
    // automatically (AC 7.3-2) — no per-direction overrides needed.
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-line bg-white px-8">
          <LanguageSwitcher />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
