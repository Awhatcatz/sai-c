// 학생·교사 화면의 틀. 휴대폰: 위에 워드마크, 아래 탭 막대. 넓은 화면: 위 막대 안에 탭.
import type { LucideIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Logo } from "../brand/Logo";
import { useAuth } from "../lib/auth";

/** also: 이 경로로 시작하는 화면에서도 이 탭을 켠다(예: 학급 탭 ← /t/classes/3). */
export type ShellTab = { to: string; label: string; icon: LucideIcon; end?: boolean; also?: string };

export function RoleShell({ tabs, sub }: { tabs: ShellTab[]; sub?: string }) {
  const { me } = useAuth();
  const { pathname } = useLocation();
  const on = (t: ShellTab, isActive: boolean) => isActive || (!!t.also && pathname.startsWith(t.also));
  return (
    <div className="min-h-dvh bg-ivory pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ivory/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-5 md:h-16 md:px-8">
          <Logo size="sm" />
          <nav aria-label="주 메뉴" className="ml-6 hidden gap-1 md:flex">
            {tabs.map(t => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `rounded-xl px-3.5 py-2 text-[15px] font-semibold transition-colors ${on(t, isActive) ? "bg-beige text-ink" : "text-ink-3 hover:text-ink"}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <p className="ml-auto max-w-[50%] truncate text-right text-[13px] text-ink-3">{sub ?? me?.user.name}</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pt-5 md:px-8 md:pt-8">
        <Outlet />
      </main>
      <nav aria-label="주 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map(t => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end} className={({ isActive }) => `flex h-[62px] flex-col items-center justify-center gap-1 text-[12px] font-semibold ${on(t, isActive) ? "text-ink" : "text-ink-3"}`}>
                {({ isActive }) => (
                  <>
                    <t.icon size={22} strokeWidth={on(t, isActive) ? 2.3 : 1.8} aria-hidden />
                    {t.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
