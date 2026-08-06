# CBOS — CodeSphere Business Operating System

The internal CRM / sales / project-management platform that powers the CodeSphere website.
The website is the marketing front door; this is the business's internal intelligence layer.

**Read this whole file before deploying.** In particular, read "Known limitation: Prisma
validation" below — one thing genuinely could not be verified in the environment this was built
in, and you should run it yourself before trusting the schema blind.

---

## Module status — what's real vs. scaffolded vs. planned

Every module from the original brief is accounted for. Nothing is silently missing — anything not
fully built has a clear status and a pointer to what's needed to finish it.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | AI Smart CRM | ✅ **Live** | Full lead capture, scoring, auto-assignment, pipeline stage |
| 2 | AI Lead Analyzer | ✅ **Live** | Real heuristic scoring by default; upgrades to Claude if `ANTHROPIC_API_KEY` is set |
| 3 | AI Email Assistant | ✅ **Live** | Real template generation + draft/review/send flow; actual sending needs SMTP configured |
| 4 | Sales Pipeline | ✅ **Live** | Kanban board, drag-and-drop stage changes, backed by real API |
| 5 | Client Management | ✅ **Live** | Convert lead → client, client profile with linked projects/invoices/etc. |
| 6 | Client Portal | 🏗️ **Schema only** | `User.clientId` + `Role.CLIENT` exist for this; no portal UI built yet |
| 7 | Project Management | ✅ **Live** | Full CRUD for projects/tasks/milestones, with a real dashboard page (expandable task management) |
| 8 | Proposal Generator | ✅ **Live** | Generates a real branded PDF from a dedicated frontend form |
| 9 | Quotation Generator | ✅ **Live** | Real line-item calc + PDF from a dedicated frontend form; QR code is a documented future hook |
| 10 | Invoice Management | ✅ **Live** | Real CRUD + financial summary dashboard; payment gateway not integrated |
| 11 | Document Management | ✅ **Live** | Real file upload from a dedicated page; local disk (dev) or Supabase Storage (production) — see "Database & Storage" below |
| 12 | AI Business Assistant | ✅ **Live** | A few question types answered from real data directly; open-ended needs an AI key |
| 13 | Communication Center | ✅ **Live** | Unified chronological feed combining Meetings and Email Logs, plus a meeting-scheduling form |
| 14 | Notification Center | ✅ **Live** | In-app notifications, bell dropdown + full page, auto-created on new leads |
| 15 | Analytics | ✅ **Live** | Dedicated Analytics page with sales funnel, conversion, and financial charts, on top of the Dashboard's lead/revenue charts |
| 16 | Admin Panel | ✅ **Live** | Manage Services and Industries (the lookups behind CRM dropdowns and the website's contact form) directly from the UI |

**Legend:** ✅ Live = built and working end-to-end. 🟡 API live, UI pending = the backend route is
real and callable today (via Postman/curl or Prisma Studio); a dedicated frontend page hasn't been
built. 🏗️ Schema only = the database models anticipate this module; no API or UI yet.

---

## Why so much is "API live, UI pending" rather than fully built

A platform at the scale described in the brief — comparable to HubSpot, Salesforce, Jira — is
realistically months of work for a team, not something any single build pass produces honestly.
The choice made here was: build the **architectural spine completely** (every module has a real,
correct place in the database and a real API contract) and build **full working software, not
mockups**, for the modules that matter most on day one — capturing and converting leads. The
remaining modules are one Prisma query and one React page away, not an architecture rewrite away,
which is exactly what the brief itself asked for ("additional modules can be added in the future
without requiring major architectural changes").

---

## Known limitation: Prisma schema was not runtime-validated

`schema.prisma` was written carefully and manually checked (balanced syntax, every `@relation`
resolves to a real model, no naming collisions) — but `npx prisma generate` / `npx prisma validate`
could not actually be run in the sandbox this was built in, because outbound network access to
Prisma's binary CDN (`binaries.prisma.sh`) was blocked by that environment's network policy. This
is a sandbox restriction, not a known code problem.

**Before you rely on this schema, run:**
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```
in your own environment (which has normal internet access). If there's a typo or subtle relation
issue Prisma's own validator catches something the manual review missed, it'll surface immediately
here, with a clear error pointing at the exact line.

Everything else — the TypeScript backend logic, the React frontend, the build tooling — **was**
verified for real: `tsc` type-checking, ESLint, and full `vite build` / production bundling all ran
successfully with zero errors in both `apps/api` and `apps/web`.

---

## Quick start (Docker — recommended)

```bash
cp .env.example .env
# generate real secrets instead of the placeholders:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # run twice, for both JWT secrets

docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

- API: http://localhost:4000
- Web: http://localhost:8080
- Seeded login: `admin@codesphere.dev` / `ChangeMe123!` (from `prisma/seed.ts` — **change this
  password immediately**, there's no self-serve password reset flow yet)

---

## Database & Storage: Railway vs. Supabase

Railway hosts the running API/dashboard code regardless — nothing hosts custom server code the way
CBOS needs except a platform like Railway, Render, or Fly.io. The choice below is only about where
the **database** and **uploaded files** live; both options plug into the same code without changes.

| | Railway's built-in Postgres + local disk | Supabase Postgres + Supabase Storage |
|---|---|---|
| Setup effort | One click in Railway's dashboard | One extra account, ~5 min setup |
| Database | Standard Postgres — works identically either way | Standard Postgres — works identically either way |
| File uploads (Module 11) | ⚠️ Not guaranteed to survive a redeploy on most hosts | ✅ Persistent, with private time-limited signed links |
| Good fit if... | You want the fewest moving parts to start | You're already using Supabase elsewhere, or need reliable document storage from day one |

**To use Supabase for the database:** copy the connection string from Supabase Dashboard →
Project Settings → Database → Connection string, and set it as `DATABASE_URL`.

**To use Supabase for file storage** (recommended for production regardless of which database
you pick):
1. In Supabase Dashboard → Storage, create a new bucket named `cbos-documents` (or your own name)
   and leave it **private**.
2. In Supabase Dashboard → Project Settings → API, copy the **Project URL** and the
   **`service_role` secret key** (not the `anon` public key — the service role key is what lets
   the server write to the bucket regardless of row-level-security policies, and it must never be
   exposed to a browser).
3. Set these three variables wherever you're deploying (Railway's Variables tab, or your local
   `.env`):
   ```
   STORAGE_DRIVER=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_STORAGE_BUCKET=cbos-documents
   ```
4. Redeploy. Document uploads (`POST /api/documents`) now go to Supabase Storage instead of local
   disk, and each document's `fileUrl` is a signed link that expires after 7 days — the API
   automatically re-signs it on demand via `storageService.ts`'s `refreshUrl()`, which the
   documents-list endpoint will need to call once a frontend page for this module exists (it isn't
   built yet — see the module status table above).

If `STORAGE_DRIVER` is left unset or set to `local`, nothing changes — the original local-disk
behavior is still the default, so this is purely opt-in.

---

## Quick start (local, no Docker)

Requires Node 20+ and a local PostgreSQL instance.

```bash
npm install
cp .env.example apps/api/.env   # edit DATABASE_URL to point at your local Postgres
cd apps/api && npx prisma generate && npx prisma migrate dev --name init && npm run db:seed
cd ../..
npm run dev:api    # terminal 1
npm run dev:web    # terminal 2
```

---

## Wiring up the CodeSphere website

The whole point of this platform is that website enquiries flow into it automatically. The website
project's `ContactForm.jsx` currently does this on submit:

```js
console.info("New lead record (ready for CRM integration):", leadRecord);
```

Replace that with a real call to this API's public intake endpoint:

```js
await fetch("https://api.codesphere.dev/api/public/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: form.name,
    company: form.company,
    email: form.email,
    phone: form.phone,
    country: form.country,
    industry: form.industry,
    budgetRange: form.budget,
    timeline: form.timeline,
    projectType: form.solution,
    servicesInterested: [],
    requirements: form.message,
    website: "", // honeypot field — must stay blank, add a visually-hidden input for it
  }),
});
```

Also add `CORS_ORIGINS` in the API's `.env` to include the website's real deployed origin, or the
browser will block the request.

---

## Security posture

- Refresh-token cookie uses `sameSite: "none"` (with `secure: true`) in production because the
  dashboard and API are typically deployed on two different subdomains (different origins). If
  you ever deploy them under the *same* domain (e.g. `app.yourdomain.com` and
  `api.yourdomain.com` behind one reverse proxy path, or genuinely the same origin), `sameSite:
  "lax"` would be the more restrictive, slightly safer choice — the code checks `NODE_ENV`, not
  the actual domain relationship, so this is a manual judgment call if your topology changes.

- Passwords hashed with bcrypt (12 rounds).
- JWT access tokens (short-lived, 15 min default) + refresh tokens (httpOnly cookie, rotated on
  every use, stored server-side only as a SHA-256 hash — never the raw token).
- RBAC middleware (`requireRole`) on every protected route, using role *groups* (`ROLE_GROUPS` in
  `packages/shared`) rather than hardcoded role lists per route.
- `helmet`, CORS locked to an explicit origin allowlist, rate limiting on the public lead-intake
  endpoint, a honeypot field for basic bot filtering.
- Every meaningful write action is recorded in `AuditLog` (who, what, when, on which entity).
- Zod validation on every request body — both API and web import the *same* schemas from
  `@cbos/shared` so client and server validation can't silently drift apart (the server still
  re-validates independently; never trust client-side validation alone).

## What's explicitly NOT implemented (and why)

- **Payment gateway / "pay invoices"** — the brief itself marks this "future-ready"; no real
  payment provider account exists to integrate against honestly.
- **WhatsApp notifications** — same reasoning; the brief marks this future-ready too. The
  `NotificationType` enum and service layer are structured so adding a WhatsApp channel later means
  adding one new notification dispatcher, not restructuring anything.
- **S3 cloud storage** — not built. `services/storageService.ts` has a working local-disk driver for
  development and a working **Supabase Storage** driver for production (see "Database & Storage"
  below) — that covers the cloud-storage need without also needing a separate AWS account. A raw S3
  driver could still be added later against the same `StorageDriver` interface if a project
  specifically needs it.
- **QR codes on quotations** — needs a real payment/verification URL to encode, which needs the
  payment gateway above to exist first. Documented as a follow-up in `pdfService.ts`.
- **GraphQL** — the brief asked for REST "structured for future GraphQL compatibility." Every
  resource here maps cleanly to REST CRUD, which is the actual prerequisite for a clean GraphQL
  layer later (resolvers over the same Prisma models) — no separate work was needed to keep that
  door open.

## Architecture notes

- **Monorepo** via npm workspaces (`apps/api`, `apps/web`, `packages/shared`) — no extra tooling
  (Turborepo/Nx) pulled in for a project this size; add one if/when build times actually justify it.
- **`packages/shared`** holds role names, pipeline stages, and Zod schemas used by both apps, so the
  public lead form's shape can never drift between what the website sends and what the API expects
  without a compile error.
- **Prisma schema is the single source of truth** for the data model — see the module status table
  above for how directly it maps to the original 16-module brief.
- Route handlers live directly in `apps/api/src/routes/*.ts` rather than a separate
  controller/service split for every single resource — over-separating adds files without real
  benefit at this scale. The `services/` directory is reserved for logic genuinely reused across
  multiple routes (auth, PDF generation, email templates, AI calls, storage) — exactly the parts
  that *do* warrant separation.
