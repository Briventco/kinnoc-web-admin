# Kinnoc Admin Portal

The web admin portal for [Kinnoc](https://kinnoc-api.onrender.com). Administrators sign in, then create, edit, publish, cancel, archive and restore **events**.

The portal is a frontend only. The backend is the existing **Kinnoc API** (`kinnoc-api` repository), and sign-in uses that API's **Supabase Auth** project. This repo does not contain a backend, a database, or any secrets.

- **Stack:** React 19, TypeScript, Vite, React Router, Tailwind CSS 4, Lucide icons, `@supabase/supabase-js`
- **API:** `https://kinnoc-api.onrender.com/api/v1`. The contract is in `kinnoc-api/docs/events.md` and `kinnoc-api/docs/admin-access.md`.

## Quick start

Requires Node.js 22.12 or newer (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values (see below)
npm run dev                  # http://localhost:5173
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
| `VITE_API_BASE_URL` | yes | `https://kinnoc-api.onrender.com/api/v1` |
| `VITE_SUPABASE_URL` | yes | The Supabase project URL the API uses: `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | That project's public **anon** key, or its `sb_publishable_…` key |
| `VITE_SUPABASE_EVENT_MEDIA_BUCKET` | no | Defaults to `event-media`. Must match the API's `SUPABASE_EVENT_MEDIA_BUCKET` |

> ⚠️ Never put the Supabase **service-role** key (or `sb_secret_…`), database URLs or JWT secrets in this project. The portal doesn't need them.

If the Supabase values are missing, the sign-in page says which variables to set.

### Backend requirements

1. **CORS:** the API only accepts browser requests from origins in its `CORS_ORIGINS` setting. Add the portal's origin(s) on Render, for example `http://localhost:5173` for local development plus the deployed portal URL. Without this, every API call from the browser fails with "Could not reach the Kinnoc API". (In our check on 2026-10-29, the deployed API did not allow `http://localhost:5173`.)
2. **Migrations:** the events and admin-access migrations (`20261029150000_events`, `20261029160000_admin_access`) must be applied to the API's database. They create the `event-media` bucket and its admin-only upload policies.
3. **An administrator account:** the portal has no sign-up. An authorized developer creates admins with the API's operator script (`npm run admin:bootstrap` in `kinnoc-api`; see `docs/admin-access.md`). The portal never creates admins.

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
│   └── storage.ts  #   Image checks, upload and delete in Supabase Storage
├── auth/           # Supabase client, AuthProvider (session + admin check), useAuth, RequireAdmin
├── components/
│   ├── ui/         # Reusable building blocks: Button, FormField, Alert, Card, ConfirmDialog, …
│   └── events/     # Event-specific pieces: EventForm, EventTable, EventFilters, ImagePicker, …
├── hooks/          # useAsync: loading, error and reload for API calls
├── layouts/        # AdminLayout: sidebar, top bar, content area
├── pages/          # One component per route
├── types/          # TypeScript types mirroring the API's requests and responses
├── utils/          # Env config, date and time zone helpers, form ↔ payload conversion and validation
├── App.tsx         # Routes
└── main.tsx        # Entry point
```

Routes: `/login`, `/` (overview), `/events`, `/events/new`, `/events/:id`, `/events/:id/edit`, `/settings`.

## Conventions for contributors

- Work on your own branch and open a pull request into `main`.
- Style with Tailwind utility classes. Reuse `components/ui` before adding new building blocks.
- Keep API calls in `src/api/` and request/response types in `src/types/`. When the API changes, update the types to match `kinnoc-api` first.
- Only build features the API supports. Check `kinnoc-api/docs/` before adding a screen.
- Every data view needs loading, empty and error states (`Spinner`, `EmptyState`, `ErrorAlert`).
- Run `npm run lint && npm run build` before pushing.

## Deployment

`npm run build` produces a static site in `dist/`. Because routing happens in the browser, configure the host to serve `index.html` for unknown paths (for example a Netlify `/* /index.html 200` rewrite, or a Vercel SPA rewrite). Set the `VITE_*` variables in the host's build settings and add the deployed origin to the API's `CORS_ORIGINS`.

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
| Error parsing (`VALIDATION_FAILED`, `INVALID_CURSOR`, `EVENT_NOT_FOUND`, `401`) | Tested against the **live** API with read-only public requests |
| Real Supabase sign-in, `/admin/me` as a real admin, create/update/lifecycle, Storage uploads | **Not yet verified live**: needs Supabase config, an admin account and CORS (see "Backend requirements") |
