import type { TransactionSource } from "@/lib/types";

export function SourceBadge({ source }: { source: TransactionSource }) {
  if (source === "manual") {
    return <span className="badge badge-man">Manual</span>;
  }
  if (source === "uncategorized") {
    return (
      <span className="badge" style={{ background: "var(--gray-2)", color: "var(--gray-6)" }}>
        Uncategorized
      </span>
    );
  }
  return <span className="badge badge-kw">Keyword</span>;
}
