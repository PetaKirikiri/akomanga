import { type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { isHrAdminRole, isStaffRole } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { ecosystemProductDisplayLabel } from '@/lib/ecosystemBrand';
import { purakauAppUrl } from '@/lib/mataLaunch';
import placeholderLogo from '@/assets/placeholder-logo.png';
import { EcosystemAppSwitcher } from './EcosystemAppSwitcher';
import type { DevPersona } from '@/lib/devPersona';

export type PortalIconName =
  | 'home'
  | 'notes'
  | 'structures'
  | 'courses'
  | 'homework'
  | 'overview'
  | 'classes'
  | 'students'
  | 'progress'
  | 'schedule';

export type PortalTab = {
  /** In-app route (React Router). */
  to?: string;
  /** Same-origin satellite app — use full navigation so Vercel can route to the other SPA. */
  href?: string;
  label: string;
  icon: PortalIconName;
  section: string;
  disabled?: boolean;
  disabledLabel?: string;
};

/** Learner/staff sidebar, or HR-only tabs — HR does not see vocab / sentence structures / my courses. */
export function portalNavForRole(
  role: string | undefined,
  opts: { adminIfStaff?: boolean } = {},
): PortalTab[] {
  if (isHrAdminRole(role)) {
    return hrNavTabs();
  }
  if (opts.adminIfStaff && isStaffRole(role)) {
    if (role === 'super_admin') return adminNavTabs();
    return teacherNavTabs();
  }
  return studentNavTabs();
}

/** Home + learner areas + optional admin / HR link for the classic sidebar. */
export function portalNavTabs(opts: { admin?: boolean; hr?: boolean; includeHome?: boolean } = {}): PortalTab[] {
  if (opts.hr) {
    return hrNavTabs();
  }
  if (opts.admin) {
    return adminNavTabs();
  }
  const tabs = studentNavTabs();
  if (opts.includeHome === false) {
    return tabs.filter((tab) => tab.to !== '/home');
  }
  return tabs;
}

/** Student sidebar: learning areas + Pānui (full page to sibling SPA). */
export function studentNavTabs(): PortalTab[] {
  return [
    { to: '/vocab', label: 'Course', icon: 'notes', section: 'Student Actions' },
    { to: '/student', label: 'Progress', icon: 'courses', section: 'Student Actions' },
    {
      href: purakauAppUrl(),
      label: 'Pānui',
      icon: 'homework',
      section: 'Student Actions',
    },
  ];
}

/** Staff sidebar: UI label is Teacher while database roles stay unchanged. */
export function teacherNavTabs(): PortalTab[] {
  return [
    { to: '/admin', label: 'My Classes', icon: 'classes', section: 'Teacher Actions' },
    {
      label: 'Student Tracking',
      icon: 'students',
      section: 'Teacher Actions',
      disabled: true,
      disabledLabel: 'Student tracking coming soon',
    },
    {
      to: '/vocab',
      label: 'Teaching Resources',
      icon: 'notes',
      section: 'Teacher Actions',
    },
    {
      href: purakauAppUrl(),
      label: 'Pānui',
      icon: 'homework',
      section: 'Teacher Actions',
    },
  ];
}

/** Admin sidebar: platform-wide tables and resources. */
export function adminNavTabs(): PortalTab[] {
  return [
    { to: '/admin', label: 'All Classes', icon: 'classes', section: 'Admin Actions' },
    { to: '/admin/students', label: 'Users', icon: 'students', section: 'Admin Actions' },
    {
      to: '/vocab',
      label: 'Teaching Resources',
      icon: 'notes',
      section: 'Admin Actions',
    },
    {
      href: purakauAppUrl(),
      label: 'Pānui',
      icon: 'homework',
      section: 'Admin Actions',
    },
  ];
}

/** HR-only sidebar (company training coordinator). */
export function hrNavTabs(): PortalTab[] {
  return [
    { to: '/hr/classes', label: 'Class Planning', icon: 'classes', section: 'Coordinator Actions' },
    { to: '/hr/students', label: 'Student Management', icon: 'students', section: 'Coordinator Actions' },
    { to: '/hr/progress', label: 'Progress Monitoring', icon: 'progress', section: 'Coordinator Actions' },
  ];
}

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:gap-3 ${
    isActive
      ? 'bg-portal-bg text-portal-ink shadow-sm ring-1 ring-portal-border/60'
      : 'text-portal-muted hover:bg-portal-bg/70 hover:text-portal-ink'
  }`;

const sidebarDisabledClass =
  'flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-portal-muted/60 md:gap-3';

function PortalIcon({ name }: { name: PortalIconName }) {
  const common = 'h-4 w-4 shrink-0';
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      );
    case 'notes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case 'structures':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M4 7h16M4 12h10M4 17h16" />
        </svg>
      );
    case 'courses':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M5 5.5h11a3 3 0 0 1 3 3V19H8a3 3 0 0 1-3-3z" />
          <path d="M8 5.5V16a3 3 0 0 0 3 3" />
        </svg>
      );
    case 'homework':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M6 4h9l3 3v13H6z" />
          <path d="M14 4v4h4M9 13l2 2 4-5" />
        </svg>
      );
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-3H4z" />
        </svg>
      );
    case 'classes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M4 6h16v12H4z" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case 'students':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 11a2.5 2.5 0 1 0 0-5M15.5 14.5A4.5 4.5 0 0 1 20.5 19" />
        </svg>
      );
    case 'progress':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M5 19V5M5 19h15" />
          <path d="M9 16v-4M13 16V8M17 16v-6" />
        </svg>
      );
    case 'schedule':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
          <path d="M5 5h14v15H5zM8 3v4M16 3v4M5 10h14" />
        </svg>
      );
  }
}

function groupTabs(tabs: PortalTab[]): { section: string; tabs: PortalTab[] }[] {
  const sections = new Map<string, PortalTab[]>();
  for (const tab of tabs) {
    const key = tab.section;
    sections.set(key, [...(sections.get(key) ?? []), tab]);
  }
  return [...sections.entries()].map(([section, sectionTabs]) => ({ section, tabs: sectionTabs }));
}

function pathPrefixForTab(tab: PortalTab, origin: string): string | null {
  if (tab.to) return tab.to;
  if (tab.href) {
    try {
      const path = new URL(tab.href, origin).pathname;
      return path.length > 1 ? path.replace(/\/$/, '') : path;
    } catch {
      return tab.href.replace(/\/$/, '') || '/';
    }
  }
  return null;
}

function tabMatchesPath(tab: PortalTab, pathname: string, origin: string): boolean {
  const p = pathPrefixForTab(tab, origin);
  if (!p) return false;
  return pathname === p || pathname.startsWith(`${p}/`);
}

/** Matches the sidebar brand strip height for the main-column top bar. */
const portalShellTopBarClass =
  'flex h-14 shrink-0 items-center justify-between gap-3 border-b border-portal-border bg-portal-surface px-4 md:px-6';

const portalHeaderSearchClass =
  'h-9 w-40 rounded-full border border-portal-border bg-white px-4 text-sm text-portal-ink shadow-sm outline-none transition-[width] duration-200 placeholder:text-portal-muted/80 focus:w-full focus:border-portal-accent focus:ring-2 focus:ring-portal-ring/20 sm:w-52 md:w-72 lg:w-80';

const portalHeaderIconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-portal-muted hover:bg-portal-bg hover:text-portal-ink';

/** Current product title beside the logo (dropdown lives top-right). */
function PortalEcosystemTitle({ className, brandSuffix }: { className: string; brandSuffix?: string }) {
  const { pathname } = useLocation();
  const base = ecosystemProductDisplayLabel(pathname);
  const label =
    brandSuffix != null && brandSuffix !== '' ? `${base} · ${brandSuffix}` : base;
  return <span className={className}>{label}</span>;
}

function PortalHeaderIcon({ type }: { type: 'settings' | 'notifications' }) {
  if (type === 'settings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M12 3.75a1.5 1.5 0 0 1 1.46 1.18l.2.9a6.8 6.8 0 0 1 1.5.87l.86-.3a1.5 1.5 0 0 1 1.83.64l.75 1.3a1.5 1.5 0 0 1-.24 1.93l-.67.63c.06.37.1.74.1 1.12s-.04.75-.1 1.12l.67.63a1.5 1.5 0 0 1 .24 1.93l-.75 1.3a1.5 1.5 0 0 1-1.83.64l-.86-.3a6.8 6.8 0 0 1-1.5.87l-.2.9a1.5 1.5 0 0 1-1.46 1.18h-1.5a1.5 1.5 0 0 1-1.46-1.18l-.2-.9a6.8 6.8 0 0 1-1.5-.87l-.86.3a1.5 1.5 0 0 1-1.83-.64l-.75-1.3a1.5 1.5 0 0 1 .24-1.93l.67-.63A7.2 7.2 0 0 1 6 12c0-.38.04-.75.1-1.12l-.67-.63a1.5 1.5 0 0 1-.24-1.93l.75-1.3a1.5 1.5 0 0 1 1.83-.64l.86.3c.46-.35.96-.65 1.5-.87l.2-.9a1.5 1.5 0 0 1 1.46-1.18h1.5Z" />
        <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d="M15 17h5l-1.7-2.1a2 2 0 0 1-.45-1.27V10a5.85 5.85 0 0 0-11.7 0v3.63c0 .46-.16.9-.45 1.27L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

type PortalShellProps = {
  /** Left rail (e.g. `PortalSidebar`). */
  sidebar: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  /** Left side heading in the top strip, same height as sidebar brand row. */
  headerTitle?: string;
  /** Email + sign out (etc.): top strip in the main column, same height as the sidebar brand row. */
  headerTrailing?: ReactNode;
  /** Compact top-line nav used on skinny/mobile layouts. */
  mobileTabs?: PortalTab[];
};

function PortalMobileNavSelect({ tabs }: { tabs: PortalTab[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const currentTab = [...tabs]
    .filter((tab) => tabMatchesPath(tab, location.pathname, origin))
    .sort((a, b) => (pathPrefixForTab(b, origin)?.length ?? 0) - (pathPrefixForTab(a, origin)?.length ?? 0))[0];

  return (
    <select
      aria-label="Section"
      className="max-w-[8.5rem] rounded-full border border-portal-border bg-portal-bg px-3 py-1.5 text-sm font-medium text-portal-ink outline-none"
      value={currentTab?.to ?? currentTab?.href ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        const tab = tabs.find((t) => t.to === v || t.href === v);
        if (tab?.href) {
          window.location.href = tab.href;
        } else if (v) {
          navigate(v);
        }
      }}
    >
      {tabs.map((tab) => (
        <option
          key={`${tab.section}-${tab.label}-${tab.href ?? tab.to ?? ''}`}
          value={tab.to ?? tab.href ?? ''}
          disabled={tab.disabled || (!tab.to && !tab.href)}
        >
          {tab.label}
        </option>
      ))}
    </select>
  );
}

/** App chrome: fixed sidebar + top account bar + scrollable main (classic LMS layout). */
export function PortalShell({
  sidebar,
  children,
  mainClassName,
  headerTitle,
  headerTrailing,
  mobileTabs,
}: PortalShellProps) {
  const showTopBar = Boolean(headerTitle || headerTrailing);
  return (
    <div className="flex min-h-screen flex-col bg-portal-bg text-portal-ink antialiased md:flex-row">
      {showTopBar ? (
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-portal-border bg-portal-surface px-3 md:hidden">
          <div className="flex shrink-0 items-center gap-2">
            <img src={placeholderLogo} alt="" aria-hidden className="h-6 w-6 rounded-sm object-cover" />
            <PortalEcosystemTitle className="text-lg font-semibold tracking-tight text-portal-ink" />
          </div>
          {mobileTabs && mobileTabs.length > 0 ? <PortalMobileNavSelect tabs={mobileTabs} /> : null}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            <label className="hidden min-w-0 shrink sm:block">
              <span className="sr-only">Search dashboard</span>
              <input
                type="search"
                placeholder="Search for students, classes, groups etc."
                className={portalHeaderSearchClass}
              />
            </label>
            <EcosystemAppSwitcher />
            <button type="button" className={portalHeaderIconBtnClass} aria-label="Settings">
              <PortalHeaderIcon type="settings" />
            </button>
            <button type="button" className={portalHeaderIconBtnClass} aria-label="Notifications">
              <PortalHeaderIcon type="notifications" />
            </button>
            {headerTrailing ? <div className="ml-1">{headerTrailing}</div> : null}
          </div>
        </div>
      ) : null}
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showTopBar ? (
          <div className={`${portalShellTopBarClass} max-md:hidden`} aria-label="Dashboard header">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Search dashboard</span>
                <input
                  type="search"
                  placeholder="Search for students, classes, groups etc."
                  className={portalHeaderSearchClass}
                />
              </label>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1">
              <EcosystemAppSwitcher />
              <button type="button" className={portalHeaderIconBtnClass} aria-label="Settings">
                <PortalHeaderIcon type="settings" />
              </button>
              <button type="button" className={portalHeaderIconBtnClass} aria-label="Notifications">
                <PortalHeaderIcon type="notifications" />
              </button>
              {headerTrailing ? <div className="ml-1">{headerTrailing}</div> : null}
            </div>
          </div>
        ) : null}
        <main
          className={`min-h-0 flex-1 overflow-y-auto ${mainClassName ?? 'mx-auto w-full max-w-4xl px-6 py-8'}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

type PortalSidebarProps = {
  tabs: PortalTab[];
  /** Shown after the app name, e.g. "HR" or "Admin". */
  brandSuffix?: string;
  footer?: ReactNode;
};

/** Vertical nav on md+; stacks as a top strip on small screens. */
export function PortalSidebar({ tabs, brandSuffix, footer }: PortalSidebarProps) {
  const groupedTabs = groupTabs(tabs);

  return (
    <aside
      className="hidden w-64 shrink-0 flex-col border-portal-border bg-portal-surface shadow-sm md:flex md:min-h-screen md:border-r"
      aria-label="Main navigation"
    >
      <div className="hidden h-14 items-center border-b border-portal-border px-3 md:flex">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img src={placeholderLogo} alt="" aria-hidden className="h-7 w-7 rounded-sm object-cover" />
          <PortalEcosystemTitle
            brandSuffix={brandSuffix}
            className="truncate text-lg font-semibold tracking-tight text-portal-ink"
          />
        </div>
      </div>
      <nav
        className="flex flex-row gap-2 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-5 md:overflow-visible md:p-3"
        aria-label="Sections"
      >
        {groupedTabs.map((group) => (
          <section key={group.section} className="flex shrink-0 gap-2 md:block md:min-w-0 md:flex-none">
            <p className="hidden px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wide text-portal-muted md:block">
              {group.section}
            </p>
            <div className="flex gap-2 md:block md:space-y-1">
              {group.tabs.map((t) =>
                t.disabled || (!t.to && !t.href) ? (
                  <span
                    key={`${group.section}-${t.label}-${t.href ?? t.to ?? ''}`}
                    className={`${sidebarDisabledClass} whitespace-nowrap`}
                    title={t.disabledLabel}
                  >
                    <PortalIcon name={t.icon} />
                    <span className="truncate">{t.label}</span>
                  </span>
                ) : t.href ? (
                  <a
                    key={t.href}
                    href={t.href}
                    className={`${sidebarLinkClass({ isActive: false })} whitespace-nowrap`}
                  >
                    <PortalIcon name={t.icon} />
                    <span className="truncate">{t.label}</span>
                  </a>
                ) : (
                  <NavLink
                    key={t.to}
                    to={t.to!}
                    end={t.to === '/admin' || t.to === '/hr'}
                    className={({ isActive }) =>
                      `${sidebarLinkClass({ isActive })} whitespace-nowrap`
                    }
                  >
                    <PortalIcon name={t.icon} />
                    <span className="truncate">{t.label}</span>
                  </NavLink>
                ),
              )}
            </div>
          </section>
        ))}
      </nav>
      {footer ? <div className="border-t border-portal-border p-3">{footer}</div> : null}
    </aside>
  );
}

/** Secondary outline button (sign out, etc.) */
export const portalBtnSecondaryClass =
  'rounded-lg border border-portal-border bg-portal-surface px-3 py-1.5 text-sm text-portal-ink shadow-sm hover:bg-portal-bg focus:outline-none focus:ring-2 focus:ring-portal-ring/25';

export function PortalAccountFooter({
  email,
  roleLabel,
  onSignOut,
  extra,
}: {
  email?: string | null;
  roleLabel: string;
  onSignOut: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {extra}
      <button type="button" onClick={onSignOut} className={`${portalBtnSecondaryClass} w-full`}>
        Sign out
      </button>
    </div>
  );
}

export function PortalHeaderProfile({
  name,
  roleLabel,
}: {
  name: string;
  roleLabel: string;
}) {
  const { devPersona, setDevPersona } = useAuth();
  const baseName = name.includes('@') ? name.split('@')[0] : name;
  const firstName = baseName.trim().split(/\s+/)[0] || 'User';
  const initial = firstName.charAt(0).toUpperCase() || 'U';
  const showDevPersona = import.meta.env.DEV;
  const rolePersona: DevPersona =
    roleLabel === 'Admin' ? 'admin' : roleLabel === 'Coordinator' ? 'hr_admin' : roleLabel === 'Teacher' ? 'staff' : 'learner';
  const selectedPersona: DevPersona = devPersona === 'live' ? rolePersona : devPersona;
  const devOptions: { value: DevPersona; label: string }[] = [
    { value: 'learner', label: 'Student' },
    { value: 'hr_admin', label: 'Coordinator' },
    { value: 'staff', label: 'Teacher' },
    { value: 'admin', label: 'Admin' },
  ];
  return (
    <div className="flex items-center gap-2 rounded-full pl-1 pr-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-portal-ink text-xs font-semibold text-white">
        {initial}
      </div>
      <div className="hidden leading-tight sm:block">
        <p className="max-w-[10rem] truncate text-xs font-semibold text-portal-ink">{firstName}</p>
        {showDevPersona ? (
          <div className="relative -ml-0.5 inline-flex items-center">
            <select
              aria-label="Dev persona"
              title="Developer persona switcher"
              className="appearance-none bg-transparent pr-3 text-[10px] text-portal-muted outline-none"
              value={selectedPersona}
              onChange={(e) => setDevPersona(e.target.value as DevPersona)}
            >
              {devOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-0 text-[9px] text-portal-muted/70" aria-hidden>
              ▾
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-portal-muted">{roleLabel}</p>
        )}
      </div>
    </div>
  );
}

type PortalLayoutProps = {
  /** Single top bar (brand + tabs + user). Required unless using bare page. */
  header: ReactNode;
  children: ReactNode;
  mainClassName?: string;
};

export function PortalLayout({ header, children, mainClassName }: PortalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-portal-bg text-portal-ink antialiased">
      {header}
      <main className={mainClassName ?? 'mx-auto w-full max-w-4xl flex-1 px-6 py-8'}>{children}</main>
    </div>
  );
}

type PortalTopBarProps = {
  /** Left: shown after the app name. Use `NavLink` tabs for main areas. */
  tabs?: PortalTab[];
  /** Right: typically email + sign out */
  trailing?: ReactNode;
};

/**
 * One row: akomanga + tab buttons (left) · user/actions (right). No second strip.
 */
export function PortalTopBar({ tabs, trailing }: PortalTopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-portal-border bg-portal-surface px-4 py-3 shadow-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <img src={placeholderLogo} alt="" aria-hidden className="h-7 w-7 rounded-sm object-cover" />
          <PortalEcosystemTitle className="text-lg font-semibold tracking-tight text-portal-ink" />
        </div>
        {tabs != null && tabs.length > 0 ? (
          <nav className="flex flex-wrap gap-1" aria-label="Sections">
            {tabs.map((t) =>
              t.disabled || (!t.to && !t.href) ? null : t.href ? (
                <a
                  key={t.href}
                  href={t.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-portal-muted transition-colors hover:bg-portal-bg/70 hover:text-portal-ink"
                >
                  {t.label}
                </a>
              ) : (
                <NavLink
                  key={t.to}
                  to={t.to!}
                  end
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-portal-bg text-portal-ink shadow-sm'
                        : 'text-portal-muted hover:bg-portal-bg/70 hover:text-portal-ink'
                    }`
                  }
                >
                  {t.label}
                </NavLink>
              ),
            )}
          </nav>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <EcosystemAppSwitcher />
        {trailing}
      </div>
    </header>
  );
}

export function PortalCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-portal-border bg-portal-surface shadow-sm ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
