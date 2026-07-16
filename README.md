# HaH Visit Allocation — Prototype

A browser-based next-day visit allocation tool for Hospital-at-Home coordinators.

## Run locally

1. Keep `index.html`, `styles.css`, and `app.js` in the same folder.
2. Open `index.html` in a modern browser.
3. Use only fictional or de-identified data during prototype testing.

## Current functions

- Bulk input as `Bed, Initials, Postal Code` or postal codes only
- Fixed, ad hoc, and cancelled visit labels
- Multi-select visit purpose plus free text
- 30/45/60/75-minute buttons plus custom duration
- Day, 12–9 PM, and 1–10 PM shifts
- Monday/Wednesday 09:30 first-visit rule
- Lunch and dinner scheduling
- Four-visit normal limit with fifth short-visit warning
- West visits displayed green; other regions yellow
- Manual nurse assignment or automatic suggestion
- Optional OneMap postal-code lookup and routing
- Print / Save as PDF and CSV export
- Local browser storage

## Important prototype limitations

- Browser storage is device-specific and is not suitable as a clinical record.
- Do not enter full patient names, NRIC, unit numbers, diagnoses, or clinical notes.
- A browser-exposed OneMap token is for prototype use only. The Vercel version should use a secure server-side function.
- Suggested allocations require coordinator review and approval.
