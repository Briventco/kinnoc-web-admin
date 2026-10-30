# Kinnoc Admin Portal

The web admin portal for [Kinnoc](https://kinnoc-api.onrender.com). Administrators sign in, then manage **events** (create, edit, publish, cancel, archive, restore) and **verification** (the Kinnoc blue tick: review applications, grant, edit and revoke).

The portal is a frontend only. The backend is the existing **Kinnoc API** (`kinnoc-api` repository), and sign-in uses that API's **Supabase Auth** project. This repo does not contain a backend, a database, or any secrets.

- **Stack:** React 19, TypeScript, Vite, React Router, Tailwind CSS 4, Lucide icons, `@supabase/supabase-js`
- **API:** `https://kinnoc-api.onrender.com/api/v1`. The contract is in `kinnoc-api/docs/events.md`, `docs/verification.md` and `docs/admin-access.md`.

## Quick start

Requires Node.js 22.12 or newer (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase publishable key (see below)
npm run dev                  # http://localhost:5173 (see "Local development against production")
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | TypeScript checks |
| `npm run lint` | ESLint |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Configuration

All configuration comes from `VITE_*` environment variables (`.env.local` locally, or the hosting provider's settings). **Everything in a `VITE_*` variable is bundled into the browser app and is public.**

| Variable | Required | Value |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | Production: `https://kinnoc-api.onrender.com/api/v1` |
| `VITE_SUPABASE_URL` | yes | Production: `https://dswtmdossvubkzrkabjx.supabase.co` (the project the API trusts) |
| `VITE_SUPABASE_ANON_KEY` | yes | That project's `sb_publishable_…` key (or legacy anon JWT), from Supabase → Project Settings → API Keys |
| `VITE_SUPABASE_EVENT_MEDIA_BUCKET` | no | Defaults to `event-media`. Must match the API's `SUPABASE_EVENT_MEDIA_BUCKET` |
| `VITE_DEV_API_PROXY` | dev only | API host for the local dev proxy, e.g. `https://kinnoc-api.onrender.com` (see below) |

> ⚠️ Never put the Supabase **service-role** key (or `sb_secret_…`), database URLs or JWT secrets in this project. The portal doesn't need them.

If the Supabase values are missing, the sign-in page says which variables to set.

### Local development against production

The production API only accepts **https** CORS origins, and it refuses to start with an `http://` origin configured. So `http://localhost:5173` can never call it directly. For `npm run dev`, add these lines to `.env.development.local` (dev-only overrides, git-ignored):

```bash
VITE_API_BASE_URL=/api/v1
VITE_DEV_API_PROXY=https://kinnoc-api.onrender.com
```

The browser then calls `/api/v1/...` on the dev server, which forwards to the API (`vite.config.ts`), so CORS isn't involved. `npm run build` ignores this file and uses the full URL from `.env` or the host's settings. Supabase Auth and Storage are called directly and need no proxy.

### Backend requirements

1. **CORS:** the API only accepts browser requests from origins in its `CORS_ORIGINS` setting (https only in production). Add the deployed portal's origin on Render, for example `https://<your-project>.vercel.app` or a custom domain. Without this, every API call from the deployed portal fails with "Could not reach the Kinnoc API". For local development, use the dev proxy above instead.
2. **Migrations:** the events and admin-access migrations (`20261029150000_events`, `20261029160000_admin_access`) must be applied to the API's database. They create the `event-media` bucket and its admin-only upload policies.
3. **An administrator account:** see "Administrator access" below. The portal never creates admins.

### Administrator access

A Supabase Auth user is **not** an administrator by itself. The API grants access only when the Kinnoc database row `users.role = 'ADMIN'` and `users.status = 'ACTIVE'`, read on every request. Nothing in the token, the browser or the portal counts. To create the first admin, an operator runs the API's script against the **production** database from a trusted machine (`kinnoc-api/docs/admin-access.md`):

```bash
# in kinnoc-api, with the production SUPABASE_URL and DIRECT_URL (or DATABASE_URL) exported
npm run admin:bootstrap -- --email admin@example.com        # dry run: prints the target project and the plan
npm run admin:bootstrap -- --email admin@example.com --yes  # apply
```

- If the Supabase user already exists, it must have a **confirmed email**. The script only creates or updates the Kinnoc account row with role `ADMIN` and never changes the password.
- To have the script create the Auth user too, also set `ADMIN_BOOTSTRAP_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` for that one run, in the operator's shell only. Alternatively, create the user in the Supabase dashboard (Add user, "Auto Confirm User") and run the script without them.
- Suspended or deactivated accounts are refused. Revoke access with `npm run user:set-role -- --email … --role USER`.
- Admins can't verify themselves, so verifying the first admin needs a second admin.

## How it works

### Sign-in and access control

1. The admin signs in with email and password through Supabase Auth (`signInWithPassword`).
2. The portal calls `GET /admin/me` with the access token. **Only a 200 from the API grants access.** The role is never read from local storage, the token's metadata or other frontend state.
3. `403` (not an admin, suspended, deactivated): the portal signs out and the sign-in page shows "This account does not have admin access." `401`: the portal signs out and asks the admin to sign in again.
4. Every admin request sends `Authorization: Bearer <access token>`. The Supabase client keeps the session and refreshes the token. If any later request returns `401`, or `403` because access was revoked, the portal signs out with a message ([`src/api/client.ts`](src/api/client.ts), [`src/auth/AuthProvider.tsx`](src/auth/AuthProvider.tsx)).

Admin pages render only inside [`RequireAdmin`](src/auth/RequireAdmin.tsx). The API checks the role on every request too, so hiding pages is a convenience, not the security boundary.

### API endpoints used

| Endpoint | Used for |
| --- | --- |
| `GET /admin/me` | Sign-in check; Settings page |
| `GET /admin/events?status&category&q&city&from&to&archived&limit&cursor` | Events list, overview stats and recent events |
| `GET /admin/events/:id` | Event detail and edit form |
| `POST /admin/events` | Create (draft, or `publish: true` for "Publish now") |
| `PATCH /admin/events/:id` | Edit. Only changed fields are sent; `null` clears an optional field |
| `POST /admin/events/:id/publish` | Draft → Published |
| `POST /admin/events/:id/cancel` | Published → Cancelled, with an optional reason |
| `DELETE /admin/events/:id` | Archive (soft delete) |
| `POST /admin/events/:id/restore` | Restore from the archive |
| `GET /admin/verifications?status&category&limit&cursor` | Verified users list and overview counts |
| `GET /admin/verifications/applications?status&category&limit&cursor` | Applications list, review queue and overview counts |
| `GET /admin/verifications/applications/:id` | Application detail |
| `POST /admin/verifications/applications/:id/approve` | Approve, with optional `expiresAt` and internal `notes` |
| `POST /admin/verifications/applications/:id/reject` | Reject, with an internal reason (`notes`) |
| `GET /admin/verifications/users/:userRef` | User lookup (exact username or ID), verification record and audit history |
| `POST /admin/verifications/users/:userRef/grant` | Direct grant: `category`, `organisation`, `position`, optional `expiresAt`, `note` |
| `POST /admin/verifications/users/:userRef/revoke` | Revoke, with an internal `reason` |
| `PATCH /admin/verifications/users/:userRef` | Edit category, organisation, position or expiry (renewal), with an optional `note` |

Responses use the API's envelopes: `{ data }` on success and `{ error: { code, message, details?, requestId } }` on failure. `ApiError` exposes `status`, `code`, `requestId` and `fieldErrors`. The forms show `details` from `VALIDATION_FAILED` and `INVALID_EVENT` next to the matching field.

**Things the API doesn't provide** (so the portal doesn't fake them):
- **No totals.** Overview counts come from paging through the list (up to 200 per count). Larger numbers show as "200+".
- **No sort parameter** on the admin list. It is always newest created first.
- **Cursor pagination only.** "Previous" replays cursors the portal has already seen.

### Event lifecycle in the UI

| Event state | Actions shown |
| --- | --- |
| Draft | Edit, Publish, Archive |
| Published | Edit, Cancel, Archive |
| Cancelled | Edit, Archive |
| Archived (any status) | Restore |

Publish, cancel, archive and restore each ask for confirmation first. After a successful action the page shows the event the API returned. The slug can only change while the event is a draft.

### Verification

Under **Verification** in the sidebar (`/verification`):

- **Overview:** pending and rejected applications, active and revoked verifications, and the review queue.
- **Applications:** filter by status (Pending is the default and is listed oldest first) and category. The detail page shows the applicant, the requested category, position, organisation, reason and submission date, and the applicant's verification history. **Approve** (with optional expiry and internal notes) and **Reject** (with a reason) each ask for confirmation.
- **Verified users:** active, expired, revoked or all records. Each user's page shows the record, an edit form (changing the expiry renews an expired verification), **Revoke** (with a reason, confirmed first), **Grant again** after a revocation, and the audit history.
- **Grant verification:** look up a user by exact username or ID, then grant with a category, position, organisation, reason and optional expiry. You confirm before it is sent.

Rules from the API that the UI follows:
- Administrators can't act on **their own** application or verification. The UI explains this and hides the actions.
- Grants need an active account with a profile, and a user who isn't already verified.
- The portal **requires** a reason to reject, revoke and grant. The API accepts these without one, but the portal enforces it so the audit log always says why. All of these notes are internal and never shown to the user.

API limitations:
- **No user search:** lookup needs the exact username or user ID.
- **No global audit log:** history is per user (the latest 50 entries), shown on each user's page and on application pages.
- **No totals:** counts are lower bounds above 200, like the events overview.
- **No embedded badge** in profile, post and other responses yet (an API limitation).

### Dates and time zones

The API stores instants plus an IANA time zone (for example `Africa/Lagos`). The form edits local date and time in the event's chosen zone, then sends it with that zone's offset (`2026-11-21T09:00:00+01:00`). Dates are always displayed in the event's own zone ([`src/utils/dates.ts`](src/utils/dates.ts)).

### Poster and logo uploads

This follows `kinnoc-api/docs/events.md` §4:

1. The admin chooses an image. The portal checks the type (JPEG, PNG or WebP) and size (5 MB or less) and shows a preview.
2. When the form is saved, the portal uploads the file **directly to Supabase Storage with the admin's own session**, to `event-media/<admin user id>/<random uuid>.<ext>`. Storage policies allow this only for active admins, and only in their own folder.
3. The object key is sent as `coverImageKey` / `organizerLogoKey`. The API then verifies that the object exists, that this admin uploaded it, and its type and size.
4. If the save fails, the portal deletes the file it just uploaded. When an edit replaces or removes an image, the portal deletes the old file if it is in this admin's folder (the API can't delete Storage files).

`supabase-js` doesn't report upload progress, so the Save button shows a spinner while files upload.

## Project structure

```
src/
├── api/            # All HTTP and Storage calls. Pages call these, never fetch() directly.
│   ├── client.ts   #   apiRequest(): base URL, bearer token, envelopes, ApiError, auth failures
│   ├── admin.ts    #   GET /admin/me
│   ├── events.ts   #   Admin event endpoints and countEvents()
│   ├── verification.ts # Admin verification endpoints and counts
│   ├── pagination.ts #   countPages(): counts by paging (the API has no totals)
│   └── storage.ts  #   Image checks, upload and delete in Supabase Storage
├── auth/           # Supabase client, AuthProvider (session + admin check), useAuth, RequireAdmin
├── components/
│   ├── ui/         # Reusable building blocks: Button, FormField, Alert, Card, ConfirmDialog, …
│   ├── events/     # Event-specific pieces: EventForm, EventTable, EventFilters, ImagePicker, …
│   └── verification/ # Verification pieces: tables, badges, grant/edit forms, AuditHistory, …
├── hooks/          # useAsync (loading/error/reload), useCursorPaging (Previous/Next over cursors)
├── layouts/        # AdminLayout: sidebar, top bar, content area
├── pages/          # One component per route (verification pages in pages/verification/)
├── types/          # TypeScript types mirroring the API's requests and responses
├── utils/          # Env config, date and time zone helpers, form ↔ payload conversion and validation
├── App.tsx         # Routes
└── main.tsx        # Entry point
```

Routes: `/login`, `/` (overview), `/events`, `/events/new`, `/events/:id`, `/events/:id/edit`, `/verification`, `/verification/applications`, `/verification/applications/:id`, `/verification/verified`, `/verification/users/:userRef`, `/verification/grant`, `/settings`.

## Conventions for contributors

- Work on your own branch and open a pull request into `main`.
- Style with Tailwind utility classes. Reuse `components/ui` before adding new building blocks.
- Keep API calls in `src/api/` and request/response types in `src/types/`. When the API changes, update the types to match `kinnoc-api` first.
- Only build features the API supports. Check `kinnoc-api/docs/` before adding a screen.
- Every data view needs loading, empty and error states (`Spinner`, `EmptyState`, `ErrorAlert`).
- Run `npm run lint && npm run build` before pushing.

## Deployment

`npm run build` produces a static site in `dist/`. Routing happens in the browser, so the host must serve `index.html` for unknown paths. `vercel.json` does this on Vercel (framework preset Vite, output `dist`). In the host's build settings, set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and optionally `VITE_SUPABASE_EVENT_MEDIA_BUCKET`. **Don't** set `VITE_DEV_API_PROXY` or a relative `VITE_API_BASE_URL` there. Then add the deployed https origin to the API's `CORS_ORIGINS` on Render.

## Known limitations

- No live end-to-end test with a real admin account yet. Sign-in, the admin endpoints and uploads have only been tested against a local mock; see "Verification status" below.
- Latitude/longitude, MFA, and password reset in the portal are not implemented. Password changes go through Supabase recovery.
- The overview counts are lower bounds above 200 events.

## Verification status

| Area | Status |
| --- | --- |
| Type check, lint, production build | Passing |
| Route guards (signed out / not configured) | Tested in headless Chrome |
| Admin, access-denied and API-error flows; list, detail, form validation | Tested in headless Chrome against a **local mock** of the API |
| Verification: lists, filters, approve, reject, grant, grant again, edit, revoke, self-account and ineligible-user blocks, not-found states | Tested in headless Chrome against a **local stateful mock** that rejects unknown request fields like the API |
| Error parsing (`VALIDATION_FAILED`, `INVALID_CURSOR`, `EVENT_NOT_FOUND`, `401`) | Tested against the **live** API with read-only public requests |
| Real Supabase sign-in, `/admin/me` as a real admin, event create/update/lifecycle, verification actions, Storage uploads | **Not yet verified live**: needs Supabase config, an admin account and CORS (see "Backend requirements") |
