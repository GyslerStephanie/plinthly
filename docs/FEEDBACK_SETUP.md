# Feedback storage setup (Google Sheet)

End-of-journey feedback (`FeedbackSection`) is POSTed to `/api/feedback`
([api/feedback.js](api/feedback.js)), which forwards **only** `goal`, `strategy`,
`message`, `lang`, `ts` to a Google Apps Script web app that appends a row to a Sheet.
The user's financial inputs are never sent — the endpoint hard-whitelists those four
fields. Until `FEEDBACK_WEBHOOK_URL` is set, the endpoint is a graceful no-op (the UI
still shows the thank-you).

## 1. Create the Sheet

1. Create a new Google Sheet (e.g. "Plinthly feedback").
2. Row 1 headers, in order: `Timestamp` · `Goal` · `Strategy` · `Message` · `Lang`.

## 2. Add the Apps Script

In the Sheet: **Extensions → Apps Script**, replace the default code with:

```js
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.goal || '',
      data.strategy || '',
      data.message || '',
      data.lang || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. Deploy as a web app

1. **Deploy → New deployment** → type **Web app**.
2. **Execute as:** Me. **Who has access:** **Anyone**.
   (The URL is the secret — it lives only in Vercel, never in the browser.)
3. Authorize when prompted. Copy the **Web app URL**
   (`https://script.google.com/macros/s/…/exec`).

> Re-deploying with **Manage deployments → edit (pencil) → Version: New version**
> keeps the same URL. A brand-new deployment gives a new URL (update the env var).

## 4. Wire the URL into Vercel

```
vercel env add FEEDBACK_WEBHOOK_URL production
vercel env add FEEDBACK_WEBHOOK_URL preview
# paste the /exec URL when prompted
```

Redeploy (or it applies on the next deploy). Done — submissions now land as rows.

## 5. Local testing (optional)

Vite's dev server does **not** serve `/api/*`. To exercise the function locally:

```
vercel dev          # serves the app + /api/feedback
# add FEEDBACK_WEBHOOK_URL to a local .env (gitignored) first
```

Under plain `npm run dev` the POST 404s and the UI silently falls back to the
optimistic thank-you — expected.

## Privacy note

This is consistent with Plinthly's "nothing saved" promise: storage is voluntary,
the form shows a consent line (`feedback.consent`), and **no income/savings/financial
inputs are ever transmitted** — only the three feedback answers + UI language.
