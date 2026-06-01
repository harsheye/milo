# VehicleLog Pro

An offline-first personal vehicle management dashboard built with React, Vite, Dexie, and IndexedDB.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Copy `.env.example` to `.env` and set the IndianAPI base URL and API key. The local `.env` file is excluded from Git.

## Build

```bash
npm run build
```

## Included in this MVP

- Responsive overview dashboard with fuel, mileage, distance, spend, maintenance, schedule, and activity widgets
- Navigable vehicles, fuel, maintenance, trips, expenses, analytics, schedule, and settings sections
- Quick-add flow for fuel, trips, service records, and expenses
- Odometer-based distance and mileage calculations with refill liters derived from amount and INR-per-liter price
- IndianAPI live fuel-price lookup with a once-per-day local cache, saved refill rates, and manual offline fallback
- Local IndexedDB persistence through Dexie
- Dark mode and mobile sidebar
- Installable PWA manifest and offline service-worker caching

The specification is intentionally broader than this first release. Reporting exports, advanced recurrence editing, draggable layouts, and configurable fuel-price API integrations are ready to be built on top of this foundation.
