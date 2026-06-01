# Budget App (single user)

Next.js app that reads and writes your existing **Budget Google Sheet**. Same data model as `categorizeTransactions.gs` — your sheet stays the source of truth while you replace daily UI with the web app.

## What's live

| Screen | Status |
|--------|--------|
| **Inbox** | Load uncategorized rows, categorize + save (sets column J = `MANUAL`) |
| **Transactions** | Month list, inline edit, filters, drill-down from Summary |
| **Summary** | KPIs + category breakdown from `YYYY-MM Summary` tab |
| **Categories** | Read-only view of Reference tab |
| **Settings** | Placeholder |

## Setup (one time)

### 1. Google Cloud service account

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. Enable **Google Sheets API**.
3. **IAM → Service Accounts** → Create → Keys → Add key → JSON.
4. From the JSON file, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (keep `\n` newlines)

### 2. Share your spreadsheet

1. Open your Budget Google Sheet → **Share**.
2. Add the service account email as **Editor**.
3. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### 3. Environment

```bash
cd budget-app
cp .env.example .env.local
```

Fill in `.env.local`:

```env
SPREADSHEET_ID=your_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=budget-app@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_TIMEZONE=America/Denver
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Inbox.

Visit `/setup` in the app for the same steps.

## Security (single user)

- **Credentials** live only in `.env.local` (never commit).
- The **service account** can only access sheets you explicitly share with it.
- For a deployed build, set `APP_PASSWORD` to enable HTTP Basic Auth until proper login exists.
- Plaid tokens stay in Apps Script Script Properties for now; Plaid Link in the app comes later.

## Architecture

```
Browser → Next.js API routes → Google Sheets API → Your Budget spreadsheet
```

Logic mirrors `apps-script/uncategorizedWebApp.gs`:

- Inbox: debits with empty Sub-Category (col I), no credit (col G), in the selected month
- Save: writes Category (H), Sub-Category (I), Manual (J)

## Next steps

1. **Categories** save (write Reference tab)
2. Inbox KPI dollar totals from Summary
3. Move Plaid sync behind API routes or keep Apps Script triggers + sheet as sync layer

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
