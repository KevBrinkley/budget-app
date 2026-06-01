"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getStoredBudgetMonth, withBudgetMonth } from "@/lib/budget-month";
import { normalizeMonthKey } from "@/lib/month";

const NAV = [
  { id: "inbox", label: "Inbox", short: "Inbox", href: "/inbox" },
  { id: "transactions", label: "Transactions", short: "Txns", href: "/transactions" },
  { id: "summary", label: "Summary", short: "Summary", href: "/summary" },
  { id: "categories", label: "Categories", short: "Cats", href: "/categories" },
  { id: "settings", label: "Settings", short: "Settings", href: "/settings" },
] as const;

const ICONS: Record<string, string> = {
  inbox:
    '<path d="M22 12H16L14 15H10L8 12H2"/><path d="M5.45 5.11L2 12V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V12L18.55 5.11C18.04 4.11 17.01 3.5 15.89 3.5H8.11C6.99 3.5 5.96 4.11 5.45 5.11Z"/>',
  transactions:
    '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
  summary:
    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  categories:
    '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="18" y2="18"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"/>',
};

function readMonthFromLocation(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const param = new URLSearchParams(window.location.search).get("month")?.trim();
  if (param) {
    try {
      return normalizeMonthKey(param);
    } catch {
      /* fall through */
    }
  }
  return getStoredBudgetMonth() ?? undefined;
}

function useNavMonth(override?: string): string | undefined {
  const [navMonth, setNavMonth] = useState<string | undefined>(override);

  useEffect(() => {
    setNavMonth(override ?? readMonthFromLocation());
  }, [override]);

  return navMonth;
}

function NavLink({
  id,
  label,
  short,
  href,
  active,
  mobile,
  navMonth,
}: {
  id: string;
  label: string;
  short: string;
  href: string;
  active: boolean;
  mobile?: boolean;
  navMonth?: string;
}) {
  const dest = navMonth ? withBudgetMonth(href, navMonth) : href;
  return (
    <Link className={active ? "on" : ""} href={dest}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: ICONS[id] }}
      />
      {mobile ? short : label}
    </Link>
  );
}

export function AppShell({
  active,
  title,
  meta,
  headerActions,
  filterBar,
  children,
  monthKey,
}: {
  active: (typeof NAV)[number]["id"];
  title: string;
  meta?: ReactNode;
  headerActions?: ReactNode;
  filterBar?: ReactNode;
  children: ReactNode;
  monthKey?: string;
}) {
  const pathname = usePathname();
  const navMonth = useNavMonth(monthKey);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" href={navMonth ? withBudgetMonth("/inbox", navMonth) : "/inbox"}>
          <span className="sidebar-brand-mark">B</span>
          <span>Budget</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.id}
              {...n}
              active={n.id === active || pathname === n.href}
              navMonth={navMonth}
            />
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href="/setup">Setup</a>
        </div>
      </aside>

      <div className="app-main">
        <div className="mobile-topbar">
          <div className="mobile-topbar-brand">
            <span className="mark">B</span> Budget
          </div>
        </div>

        <header className="app-header">
          <div className="app-header-inner">
            <div>
              <h1>{title}</h1>
              {meta ? <p className="app-meta">{meta}</p> : null}
            </div>
            {headerActions ? <div className="header-actions">{headerActions}</div> : null}
          </div>
        </header>

        {filterBar}
        <div className="page-body">{children}</div>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {NAV.map((n) => (
          <NavLink key={n.id} {...n} active={n.id === active} mobile navMonth={navMonth} />
        ))}
      </nav>
    </div>
  );
}
