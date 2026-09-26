"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { InboxList } from "@/components/InboxList";
import { MonthPicker } from "@/components/MonthPicker";
import { SetupBanner } from "@/components/SetupBanner";
import { useBudgetMonth } from "@/hooks/useBudgetMonth";
import type { CategoryRef, InboxRow, ReconciledMatch, SummaryKpis } from "@/lib/types";

function InboxPageInner() {
  const { monthKey, setMonthKey, urlSynced } = useBudgetMonth();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [ref, setRef] = useState<CategoryRef>({});
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [summaryKpis, setSummaryKpis] = useState<SummaryKpis | null>(null);
  const [matched, setMatched] = useState<ReconciledMatch[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inboxRes, sumRes] = await Promise.all([
        fetch(`/api/inbox?month=${encodeURIComponent(monthKey)}`),
        fetch(`/api/summary?month=${encodeURIComponent(monthKey)}`),
      ]);
      const data = await inboxRes.json();
      const sumData = await sumRes.json();
      if (!data.ok) {
        setError(data.error || "Could not load inbox");
        setRef({});
        setRows([]);
        setSummaryKpis(null);
        setMatched([]);
        if (data.monthKey && data.monthKey !== monthKey) setMonthKey(data.monthKey);
        return;
      }
      if (data.monthKey && data.monthKey !== monthKey) setMonthKey(data.monthKey);
      setRef(data.ref || {});
      setRows(data.rows || []);
      setMatched(data.matched || []);
      setSummaryKpis(sumData.ok ? sumData.kpis ?? null : null);
      setError(data.notice || "");
    } catch {
      setError("Could not load inbox");
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
      <AppShell active="inbox" title="Inbox">
        <SetupBanner />
      </AppShell>
    );
  }

  return (
    <AppShell
      active="inbox"
      title="Inbox"
      monthKey={monthKey}
      meta={`Uncategorized transactions · ${loading ? "…" : `${rows.length} open`}`}
      headerActions={<MonthPicker monthKey={monthKey} onChange={setMonthKey} />}
    >
      {error ? (
        <div className="content-inner">
          <p
            style={{
              color: error.includes("Showing") ? "var(--gray-5)" : "#b3261e",
              fontSize: 14,
            }}
          >
            {error}
          </p>
        </div>
      ) : null}
      {!loading ? (
        <InboxList
          monthKey={monthKey}
          initialRef={ref}
          initialRows={rows}
          summaryKpis={summaryKpis}
          matched={matched}
          onReload={load}
        />
      ) : (
        <div className="content-inner">
          <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
        </div>
      )}
    </AppShell>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="inbox" title="Inbox">
          <div className="content-inner">
            <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
          </div>
        </AppShell>
      }
    >
      <InboxPageInner />
    </Suspense>
  );
}
