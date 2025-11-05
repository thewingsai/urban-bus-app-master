# UrbanBus Admin Platform (Next-Gen)

Scope
- Centralized admin: fleets, drivers, routes, schedules, seats, bookings, payments, customers, offers, pricing, notifications, roles.
- Tech: Node.js (Express) API + PostgreSQL; JWT auth + RBAC; React (can be upgraded from this vanilla shell) admin SPA; integrations for payments/SMS/GPS.

Monorepo layout
- server/  Node.js API (Express) — JWT, RBAC, PG
- web/     Admin SPA (vanilla prototype; can migrate to React/Vite)

Quick start
1) cd server && cp .env.example .env && npm i && npm start
2) cd ../web and serve with any static server (or `npx serve`)

Roadmap (phased)
- P1: Auth (JWT), RBAC, KPIs, Buses, Routes, Schedules, Bookings (read-only), Pricing/Offers, Customers
- P2: Payments, Seat inventory, Drivers, Notifications (email/SMS), CSV import/export, audit logs
- P3: GPS tracking, operator portal, advanced reporting, SLA alerts, webhooks
