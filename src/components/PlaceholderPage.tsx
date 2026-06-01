import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function PlaceholderPage({
  title,
  active,
  note,
}: {
  title: string;
  active: "transactions" | "summary" | "settings";
  note: string;
}) {
  return (
    <AppShell active={active} title={title}>
      <div className="content-inner">
        <div className="section-card" style={{ padding: 20 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--gray-5)" }}>
            {note}{" "}
            <Link href="/inbox">Inbox</Link> and{" "}
            <Link href="/categories">Categories</Link> are live. Other screens use mock data in{" "}
            <code>web-app-mockups/</code> until wired up.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
