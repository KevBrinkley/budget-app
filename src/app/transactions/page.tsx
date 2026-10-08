"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MonthPicker } from "@/components/MonthPicker";
import { SetupBanner } from "@/components/SetupBanner";
import { TransactionsTable } from "@/components/TransactionsTable";
import { IncomeSection } from "@/components/IncomeSection";
import { useBudgetMonth } from "@/hooks/useBudgetMonth";
import { formatMonthLabel } from "@/lib/month";
import type { CategoryRef, SummaryKpis, TransactionRow } from "@/lib/types";

function TransactionsPageInner() {
  const searchParams = useSearchParams();
  const filterCategory = searchParams.get("category")?.trim() || "";
  const filterSub = searchParams.get("sub")?.trim() || "";
  const { monthKey, setMonthKey, urlSynced } = useBudgetMonth({ clearCategoryFilters: true });

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [ref, setRef] = useState<CategoryRef>({});
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [summaryKpis, setSummaryKpis] = useState<SummaryKpis | null>(null);
  const [inboxOpen, setInboxOpen] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ month: monthKey });
    try {
      const [txnRes, sumRes, inboxRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch(`/api/summary?month=${encodeURIComponent(monthKey)}`),
        fetch(`/api/inbox?month=${encodeURIComponent(monthKey)}`),
      ]);
      const data = await txnRes.json();
      const sumData = await sumRes.json();
      const inboxData = await inboxRes.json();
      if (!data.ok) {
        setError(data.error || "Could not load transactions");
        setRef({});
        setRows([]);
        setSummaryKpis(null);
        setInboxOpen(undefined);
        if (data.monthKey && data.monthKey !== monthKey) setMonthKey(data.monthKey);
        return;
      }
      if (data.monthKey && data.monthKey !== monthKey) setMonthKey(data.monthKey);
      setRef(data.ref || {});
      setRows(data.rows || []);
      setSummaryKpis(sumData.ok ? sumData.kpis ?? null : null);
      setInboxOpen(inboxData.ok ? (inboxData.rows?.length ?? 0) : undefined);
    } catch {
      setError("Could not load transactions");
    } finally {
      setLoading(false);
    }
  }, [monthKey, setMonthKey]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (configured && urlSynced) load();
  }, [configured, urlSynced, load]);

  if (configured === false) {
    return (
      <AppShell active="transactions" title="Transactions">
        <SetupBanner />
      </AppShell>
    );
  }

  return (
    <AppShell
      active="transactions"
      title="Transactions"
      monthKey={monthKey}
      meta={
        loading
          ? "…"
          : `${formatMonthLabel(monthKey)} · ${rows.length} transactions`
      }
      headerActions={<MonthPicker monthKey={monthKey} onChange={setMonthKey} />}
    >
      {error ? (
        <div className="content-inner">
          <p style={{ color: "#b3261e", fontSize: 14 }}>{error}</p>
        </div>
      ) : null}
      {!loading ? (
        <>
          <div className="content-inner">
            <IncomeSection monthKey={monthKey} onChanged={load} />
          </div>
          <TransactionsTable
            monthKey={monthKey}
            initialRef={ref}
            initialRows={rows}
            filterCategory={filterCategory}
            filterSub={filterSub}
            summaryKpis={summaryKpis}
            inboxOpen={inboxOpen}
          />
        </>
      ) : (
        <div className="content-inner">
          <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
        </div>
      )}
    </AppShell>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="transactions" title="Transactions">
          <div className="content-inner">
            <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
          </div>
        </AppShell>
      }
    >
      <TransactionsPageInner />
    </Suspense>
  );
}
