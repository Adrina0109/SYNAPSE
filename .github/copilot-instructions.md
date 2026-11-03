# SYNAPSE Project Instructions

## Project

SYNAPSE is an AI-powered student success platform built as a MERN application. The repository contains the app under `synapse/`:

- `synapse/server/`: Express 4 backend using ES modules, Mongoose 8, Zod, and JWT authentication in an httpOnly cookie. `requireAuth` verifies the cookie and sets `req.user.id`.
- `synapse/client/`: Vite, React 18, Tailwind CSS 3, Axios, react-hook-form, and React Router 6.
- Supported roles are `student`, `mentor`, and `admin`.

Keep JavaScript in ES module style and match the existing formatting and naming patterns.

## Backend

- Keep request handling in the existing flow: routes → controllers → models. Put request schemas in `server/src/validators/`.
- Apply existing authentication and authorization middleware in routes. Use `requireAuth` for authenticated routes and `requireRole(...)` for role restrictions.
- Validate all external input with Zod before using it. Return validation errors in the established JSON shape.
- Pass unexpected controller and middleware errors to `next(err)` so the centralized error handler can respond.
- Keep JSON responses consistent with `{ success, message, ... }`.
- Do not hardcode secrets. Read configuration from `process.env`; reuse existing middleware rather than duplicating it.

## Frontend

- Make HTTP requests through the configured Axios instance in `client/src/lib/api.js`. Its base URL is `/api`, it sends credentials for the auth cookie, and its response interceptor dispatches `auth:unauthorized` on HTTP 401.
- Read and update authentication state through `useAuth()` from `client/src/context/AuthContext.jsx`. It exposes `user`, `loading`, authentication actions, and dashboard-path selection.
- Define page routes in `client/src/App.jsx`. Use `ProtectedRoute` for authenticated pages, `RoleRoute` for role-specific dashboards, and `PublicOnlyRoute` for login/signup; preserve the existing redirect and student-onboarding behavior.
- Use Tailwind utilities and the shared component classes in `client/src/index.css`. The visual system uses warm `paper` backgrounds, dark `ink` text, `signal` orange accents, and `forest` green; use the existing `font-display`, `font-body`, and `font-mono` families. Prefer the shared `btn-primary`, `btn-secondary`, `btn-ghost`, `card-hard`, and tag classes. Cards use compact padding, thin borders, and a hard shadow; layouts commonly use `px-6`, `py-4`/`py-6`, and `gap-4`/`gap-6`.
- Every UI page must provide loading, empty, and error states appropriate to its content.

## Data access and mentor assignment

- `User.mentor` is a reference to one mentor (`ObjectId` referencing `User`), with `null` as its default.
- Treat mentor assignment as an admin-only operation. Students and mentors must never set or change `User.mentor`; keep it out of their writable profile/input schemas.
- A mentor may access only students assigned to that mentor. Scope mentor queries by the authenticated mentor's `req.user.id` and the student's `mentor` reference.
- Scope other user-specific database queries to the authenticated user (`req.user.id`) unless the route is explicitly for a mentor or admin, and apply the appropriate role and ownership checks.
- The current profile update schema does not include `mentor`. Preserve that restriction. Do not assume an assignment route or mentor-data access is already implemented; enforce these rules explicitly when adding such functionality.

## Configuration and dependencies

- Read configuration from environment variables via `process.env`; never hardcode secrets or credentials.
- Server environment variable names currently referenced in source (names only): `CLIENT_ORIGIN`, `MONGODB_URI`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REMEMBER_EXPIRES_IN`, `MENTOR_INVITE_CODE`, `ADMIN_INVITE_CODE`.
- Do not add dependencies unless requested.

## Paths and conventions for new work

- All file paths in prompts are relative to the repo root, so the backend is `synapse/server/src/...` and the frontend is `synapse/client/src/...`. When a prompt says `server/src/...` or `client/src/...`, it means the path under `synapse/`.
- Every new Mongoose model must be imported wherever it is populated, and models referenced by `ref` that do not exist yet must not break server startup.
- All AI calls (Gemini) go through one shared service, `synapse/server/src/services/aiClient.js`, once it exists. Never call the AI SDK directly from controllers. AI environment variable names will be `GEMINI_API_KEY`, `GEMINI_MODEL` and `GEMINI_EMBED_MODEL`.
- AI output is always treated as untrusted: validate it with Zod before saving, and never save AI-generated data without the user's confirmation.
- Any new server environment variable must also be added (name only, no value) to `synapse/server/.env.example`.
