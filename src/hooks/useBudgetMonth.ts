"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getStoredBudgetMonth, setStoredBudgetMonth } from "@/lib/budget-month";
import { currentMonthKey, normalizeMonthKey } from "@/lib/month";

const DEFAULT_TZ = "America/Denver";

type Options = {
  /** Drop category/sub query params when the user changes month (transactions drill-down). */
  clearCategoryFilters?: boolean;
};

function resolveMonth(paramMonth: string): string {
  if (paramMonth) {
    try {
      return normalizeMonthKey(paramMonth);
    } catch {
      /* fall through */
    }
  }
  return getStoredBudgetMonth() ?? currentMonthKey(DEFAULT_TZ);
}

export function useBudgetMonth(options?: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramMonth = searchParams.get("month")?.trim() || "";

  const [monthKey, setMonthKeyState] = useState(() => resolveMonth(paramMonth));
  const [urlSynced, setUrlSynced] = useState(Boolean(paramMonth));

  useEffect(() => {
    const resolved = resolveMonth(paramMonth);
    setMonthKeyState(resolved);
    setStoredBudgetMonth(resolved);

    if (paramMonth) {
      setUrlSynced(true);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("month", resolved);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setUrlSynced(true);
  }, [paramMonth, pathname, router, searchParams]);

  const setMonthKey = useCallback(
    (next: string) => {
      const normalized = normalizeMonthKey(next);
      setMonthKeyState(normalized);
      setStoredBudgetMonth(normalized);
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", normalized);
      if (options?.clearCategoryFilters) {
        params.delete("category");
        params.delete("sub");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [options?.clearCategoryFilters, pathname, router, searchParams],
  );

  return { monthKey, setMonthKey, urlSynced };
}
