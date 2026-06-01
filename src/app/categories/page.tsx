"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoriesTable } from "@/components/CategoriesTable";
import { SetupBanner } from "@/components/SetupBanner";
import type { ReferenceRow } from "@/lib/types";

export default function CategoriesPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (!configured) return;
    setLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setError(data.error || "Could not load categories");
          setRows([]);
          return;
        }
        setRows(data.rows || []);
      })
      .catch(() => setError("Could not load categories"))
      .finally(() => setLoading(false));
  }, [configured]);

  if (configured === false) {
    return (
      <AppShell active="categories" title="Categories">
        <SetupBanner />
      </AppShell>
    );
  }

  return (
    <AppShell
      active="categories"
      title="Categories"
      meta="Keywords and budgets from your Reference tab"
    >
      <div className="content-inner">
        {loading ? (
          <p style={{ color: "var(--gray-5)", fontSize: 14 }}>Loading…</p>
        ) : error ? (
          <p style={{ color: "#b3261e", fontSize: 14 }}>{error}</p>
        ) : (
          <CategoriesTable rows={rows} />
        )}
      </div>
    </AppShell>
  );
}
