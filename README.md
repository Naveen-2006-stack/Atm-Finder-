# Crowdsourced ATM Money Checker

A local, mobile-responsive Next.js + MySQL application for tracking ATM cash availability and operational status in real time.

## Tech Stack

- Next.js App Router (JavaScript)
- React
- Tailwind CSS
- Next.js API Routes (Node.js)
- MySQL 8+
- `mysql2` connection pooling
- Google Geocoding API + Places API

## Environment Setup

1. Copy `.env.local.example` to `.env.local`.
2. Fill in the variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ATM_MoneyChecker
GOOGLE_MAPS_API_KEY=your_key
```

## Database Setup

1. Start local MySQL 8 server.
2. Run schema:

```sql
SOURCE db/schema.sql;
```

3. Run trigger:

```sql
SOURCE db/triggers.sql;
```

4. If your database was created before Google columns were added, run migration:

```sql
SOURCE db/migrations/001_legacy_schema_fix.sql;
```

## Install and Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## API Endpoints

- `POST /api/atm/search`
  - Body: `{ "pincode": "560001" }`
  - Flow: Geocode pincode -> Places nearby ATM search -> Upsert into `ATM` by `PlaceID` -> Return card payload.

- `GET /api/atm/list?pincode=560001`
  - Lists ATMs joined with status, latest report, and service metadata.

- `POST /api/reports`
  - Body: `{ "atmId": 1, "userId": 1, "cashLevel": "Partial" }`
  - Inserts into `REPORT` and trigger increments user reliability score.

## UI Features Delivered

- Premium dark-mode UI with toggle
- Card-based ATM results
- Expand/collapse details with smooth slide
- High-contrast status colors
  - Emerald: working
  - Amber: partial/low cash
  - Crimson: out of service/empty
- Skeleton loaders during fetch
- Live pulsing indicator for reports fresher than 15 minutes
- Gamified toast on report submission

## Notes

- `create-next-app` scaffolding was blocked by folder naming restrictions (`ATM Finder`), so the equivalent Next.js project structure was scaffolded manually in-place.
- Ensure your Google API key has Geocoding API and Places API enabled.
