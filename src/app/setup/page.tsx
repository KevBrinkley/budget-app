import { AppShell } from "@/components/AppShell";

export default function SetupPage() {
  return (
    <AppShell active="settings" title="Setup" meta="Connect the app to your Budget spreadsheet">
      <div className="content-inner">
        <div className="section-card" style={{ padding: 20 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>1. Google Cloud service account</h2>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: "var(--gray-6)" }}>
            <li>
              In{" "}
              <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
                Google Cloud Console
              </a>
              , create a project and enable the <strong>Google Sheets API</strong>.
            </li>
            <li>Create a <strong>Service account</strong> and download the JSON key.</li>
            <li>
              Copy <code>client_email</code> and <code>private_key</code> into{" "}
              <code>budget-app/.env.local</code> (see <code>.env.example</code>).
            </li>
          </ol>

          <h2 style={{ margin: "24px 0 12px", fontSize: 16 }}>2. Share your spreadsheet</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--gray-6)" }}>
            Open your Budget Google Sheet → Share → add the service account email as{" "}
            <strong>Editor</strong>. Copy the spreadsheet ID from the URL into{" "}
            <code>SPREADSHEET_ID</code>.
          </p>

          <h2 style={{ margin: "24px 0 12px", fontSize: 16 }}>3. Run locally</h2>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: "var(--gray-1)",
              borderRadius: 8,
              fontSize: 13,
              overflow: "auto",
            }}
          >
            {`cd budget-app
cp .env.example .env.local
# fill in values
npm run dev`}
          </pre>

          <h2 style={{ margin: "24px 0 12px", fontSize: 16 }}>4. Optional: password when deployed</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--gray-6)" }}>
            Set <code>APP_PASSWORD</code> in production for HTTP Basic Auth until multi-user login
            exists.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
