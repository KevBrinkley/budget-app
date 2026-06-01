"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MonthPicker } from "@/components/MonthPicker";
import { SetupBanner } from "@/components/SetupBanner";
import { SummaryView, summaryPageTitle } from "@/components/SummaryView";
import { useBudgetMonth } from "@/hooks/useBudgetMonth";
import type { SummaryData } from "@/lib/types";

function SummaryPageInner() {
  const { monthKey, setMonthKey, urlSynced } = useBudgetMonth();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);
  const [inboxOpen, setInboxOpen] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sumRes, inboxRes] = await Promise.all([
        fetch(`/api/summary?month=${encodeURIComponent(monthKey)}`),
        fetch(`/api/inbox?month=${encodeURIComponent(monthKey)}`),
      ]);
      const sumData = await sumRes.json();
      const inboxData = await inboxRes.json();
      if (!sumData.ok) {
        setError(sumData.error || "Could not load summary");
        setData(null);
        if (sumData.monthKey && sumData.monthKey !== monthKey) setMonthKey(sumData.monthKey);
        return;
      }
      if (sumData.monthKey && sumData.monthKey !== monthKey) setMonthKey(sumData.monthKey);
      setData(sumData);
      setInboxOpen(inboxData.ok ? (inboxData.rows?.length ?? 0) : undefined);
    } catch {
      setError("Could not load summary");
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
      <AppShell active="summary" title="Summary">
        <SetupBanner />
      </AppShell>
    );
  }

  return (
    <AppShell
      active="summary"
      title={loading ? "Summary" : summaryPageTitle(monthKey)}
      monthKey={monthKey}
      meta="Spend vs. budget from your Summary tab"
      headerActions={<MonthPicker monthKey={monthKey} onChange={setMonthKey} />}
    >
      {error ? (
        <div className="content-inner">
          <p style={{ color: "#b3261e", fontSize: 14 }}>{error}</p>
        </div>
      ) : null}
      {!loading && data ? (
        <SummaryView data={data} inboxOpen={inboxOpen} />
      ) : loading ? (
        <div className="content-inner">
          <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="summary" title="Summary">
          <div className="content-inner">
            <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
          </div>
        </AppShell>
      }
    >
      <SummaryPageInner />
    </Suspense>
  );
}
