# Ferry backend

## Authentication behavior

Public signup and password login are available by default, including when Resend
is absent, rejects a recipient, or cannot send email. Signup creates a user with a
bcrypt password hash and a personal `My Documents` vault, then returns access and
refresh tokens. The frontend stores the session and opens the dashboard.
`emailVerified` stays false until a valid verification link is used; it is never
set true just to bypass email delivery.

Duplicate registration returns 409 and never changes an existing account's name,
password, or verification token. If the old signup implementation deleted an
account after a failed email, that person needs to register again. Existing
unverified accounts can log in with their original password.

Email-based vault invitations require the recipient to have a verified address.
This prevents someone from claiming another person's email at signup and receiving
their confidential files. Unverified users can use their own personal workspace.

Logout revokes all existing sessions for the user. Password resets and admin
status/role updates also invalidate existing sessions. Sessions issued before
this authentication update require a fresh login.

## Render deployment

- Root directory: `server`
- Build command: `npm install --legacy-peer-deps`
- Start command: `npm start`

Set these in Render's Environment tab:

```env
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
MONGO_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_long_random_access_secret
JWT_REFRESH_SECRET=your_different_long_random_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
REQUIRE_EMAIL_VERIFICATION=false
TRUST_PROXY_HOPS=1
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Use independent random JWT secrets, each at least 32 bytes. `MONGODB_URI` or
`DATABASE_URL` may replace `MONGO_URI`. `TRUST_PROXY_HOPS=1` assumes Render's single
trusted reverse proxy; use 0 for a directly exposed local server and configure the
actual number of trusted hops for other infrastructure.

Set the frontend's `VITE_API_BASE_URL` to the public backend URL ending in `/api`
and rebuild the frontend. Never use localhost or a private LAN address for a
separately hosted production backend. If frontend and backend share an origin,
the production frontend defaults to `/api`. Deploy both backend and frontend.

## Optional verification and password reset emails

```env
APP_URL=https://your-frontend-domain.com
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Ferry <noreply@your-verified-domain.com>
```

`APP_URL` is the trusted frontend address used to build email links. Missing email
configuration does not prevent signup or login. Password recovery still requires
working email delivery; email tokens are never exposed through API responses or
logs as a fallback.

Resend's shared `resend.dev` sender only delivers to the Resend account owner's
address. To deliver to external recipients, add a domain you own in Resend, add its
required DNS records, wait for verification, and use that domain in `EMAIL_FROM`.
See https://resend.com/docs/knowledge-base/403-error-resend-dev-domain.

Leave `REQUIRE_EMAIL_VERIFICATION=false` to allow immediate account access. Only
set it to true after confirming delivery to external recipients. Required mode
enforces verification on login, token refresh, and protected requests. Email
failures still preserve the account so verification can be retried later.

Verification links expire after 24 hours. Password reset links expire after one
hour. Both are stored as SHA-256 hashes and consumed atomically once.

## Validation

```sh
npm install --legacy-peer-deps
npm test
```

The integration suite uses `mongodb-memory-server-core` and a temporary local
MongoDB instance. It never connects to the configured production database and
mocks Resend's transport, so it does not send real emails. The first run downloads
a MongoDB binary; `MONGOMS_SYSTEM_BINARY` can point to a local `mongod` executable.

The suite covers external signup without email, Resend rejection, persisted
password hashes and personal vaults, login, duplicate and concurrent signup,
verification policy, token expiry/reuse/type confusion, password resets, logout,
suspended users, malformed input, failed provisioning, and vault invitation safety.

Health checks: `/` and `/api/health`.
