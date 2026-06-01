import Link from "next/link";

export function SetupBanner({ message }: { message?: string }) {
  return (
    <div
      className="section-card"
      style={{ margin: "16px", padding: "16px", borderColor: "#b3261e", background: "#fce8e6" }}
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        <strong>Sheet not connected.</strong>{" "}
        {message || "Add Google credentials to .env.local and share your Budget spreadsheet with the service account."}{" "}
        <Link href="/setup">View setup steps →</Link>
      </p>
    </div>
  );
}
