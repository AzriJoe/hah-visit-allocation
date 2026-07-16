# HaH Visit Allocation

A responsive next-day digital allocation board for Hospital-at-Home coordinators.

## Workflow

1. Tomorrow's Visits
2. Visit Preparation
3. Nurses
4. Allocation Board
5. Finalise

## Local preview without OneMap

Open `index.html`. The app works locally and stores data in the browser, but live postal-code validation and routing require Vercel.

## Deploy with OneMap on Vercel

1. Register for OneMap API access.
2. Import this GitHub repository into Vercel.
3. In Vercel Project Settings → Environment Variables, add:
   - `ONEMAP_EMAIL`
   - `ONEMAP_PASSWORD`
4. Redeploy.
5. Open the Vercel URL and select **Allocate Visits**.

The OneMap credentials remain server-side. They are not stored in browser code.

## Privacy

Use operational identifiers only (bed code, initials, postal code). Do not enter names, NRIC, diagnoses, medication details, unit numbers, or clinical notes. Browser data is device-specific unless a future approved database is added.
