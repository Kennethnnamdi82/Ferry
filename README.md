# 🚢 Ferry - Secure Digital Document Vault

Ferry is a secure document vault for uploading, organizing, sharing, exporting, and managing sensitive files with a clean workspace UI and a protected admin dashboard.

It combines a modern React frontend with a hardened Express + MongoDB backend, Cloudinary-backed file storage, JWT authentication, role-based access control, vault collaboration, public share links, activity tracking, and admin-level visibility.

## ✨ Highlights

- 🔐 JWT Authentication with access + refresh token support
- 🛡️ Protected User Routes and Admin-Only Dashboard
- 📁 Secure Document Uploads with Cloudinary storage
- 🗂️ Vaults for organizing files and managing members
- 🤝 Share Links for controlled public document access
- 🧾 Activity Logs for user and admin audit trails
- 🗑️ Trash, Restore, and Permanent Purge flows
- 📦 Export Documents as ZIP or PDF bundles
- 📊 Admin tools for users, vaults, documents, shares, and logs
- ⚡ Tech Stack: React + TypeScript + Vite + TailwindCSS + Express + MongoDB
- 🎨 UI Stack: shadcn/ui + Radix UI + Lucide Icons + TanStack Query
- 🌍 Ready for local development and cloud deployment

---

## 🧰 Tech Stack

### Frontend (`/ferry`)

- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui + Radix UI
- TanStack Query
- Axios
- React Router
- Vitest

### Backend (`/server`)

- Node.js
- Express
- MongoDB + Mongoose
- JWT
- Cloudinary
- Multer
- Helmet
- Express Rate Limit
- Zod
- Archiver
- PDF tooling

---

## 🔑 `.env` Setup

### Backend (`/server`)

Create a `.env` file inside the `server` folder:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:8080

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/secure_vault

# JWT
JWT_ACCESS_SECRET=replace_me_with_long_random_string
JWT_REFRESH_SECRET=replace_me_with_another_long_random_string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin seed account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
ADMIN_NAME=Ferry Admin
RESET_ADMIN_PASSWORD=false
```

### Frontend (`/ferry`)

Create a `.env` file inside the `ferry` folder:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

> After changing environment variables, restart both development servers.

---

## 🚀 Run the Backend

From the project root:

```bash
cd server
npm install
npm run dev
```

The API will run at:

```txt
http://localhost:5000
```

Seed an admin account after filling the admin values in `server/.env`:

```bash
npm run seed:admin
```

Run the backend in production mode:

```bash
npm start
```

---

## 💻 Run the Frontend

From the project root:

```bash
cd ferry
npm install
npm run dev
```

The frontend will run on the Vite dev server, usually:

```txt
http://localhost:8080
```

Build the frontend for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### SPA refresh fallback

Ferry uses React Router, so the frontend host must rewrite deep links back to
`index.html`. Without this, refreshing `/dashboard`, `/admin/users`, or any
other client route can show a Not Found page.

For Render Static Sites, add this Redirect/Rewrite rule:

```txt
Source Path: /*
Destination Path: /index.html
Action: Rewrite
```

The repo also includes deployment configs for common static hosts:

- `vercel.json`
- `netlify.toml`
- `render.yaml`
- `ferry/public/_redirects`

---

## 🧪 Useful Commands

### Backend

```bash
npm run dev          # Start Express with nodemon
npm start            # Start Express with Node
npm run seed:admin   # Create or update the admin account
```

### Frontend

```bash
npm run dev          # Start Vite
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run Vitest
npm run preview      # Preview production build
```

---

## 🧭 App Routes

### Public Routes

- `/` - Landing page
- `/login` - User login
- `/admin/login` - Admin login entry
- `/register` - Create account
- `/s/:token` - Public shared file view

### User Workspace

- `/dashboard` - All files
- `/upload` - Upload document
- `/documents/:id` - Document details
- `/vaults` - Vault list
- `/vaults/:id` - Vault details
- `/shared` - Shared with me
- `/trash` - Deleted files
- `/activity` - User activity

### Admin Dashboard

- `/admin` - Overview
- `/admin/users` - User management
- `/admin/vaults` - Vault management
- `/admin/documents` - Document management
- `/admin/shares` - Share monitoring
- `/admin/logs` - Activity logs

---

## 📡 API Overview

All authenticated endpoints require a valid bearer token.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Documents

- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `GET /api/documents/:id/preview`
- `GET /api/documents/:id/download`
- `PUT /api/documents/:id`
- `POST /api/documents/:id/restore`
- `DELETE /api/documents/:id`
- `DELETE /api/documents/:id/purge`

### Vaults

- `GET /api/vaults`
- `POST /api/vaults`
- `GET /api/vaults/:id`
- `PUT /api/vaults/:id`
- `DELETE /api/vaults/:id`
- `GET /api/vaults/:id/members`
- `POST /api/vaults/:id/members`
- `DELETE /api/vaults/:id/members/:memberId`

### Shares

- `POST /api/shares`
- `GET /api/shares/document/:documentId`
- `DELETE /api/shares/:id`
- `GET /api/shares/:token`
- `POST /api/shares/:token/file`
- `POST /api/shares/:token/content`

### Export

- `POST /api/export/zip`
- `POST /api/export/pdf`

### Activity

- `GET /api/activity`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/vaults`
- `GET /api/admin/documents`
- `DELETE /api/admin/documents/:id`
- `GET /api/admin/shares`
- `GET /api/admin/logs`

---

## 📁 Project Structure

```txt
FERRY/
├── ferry/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
└── server/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── scripts/
    │   ├── utils/
    │   └── index.js
    ├── postman_collection.json
    ├── package.json
    └── README.md
```

---

## 🧱 Backend Architecture

- `config/` - Database, Cloudinary, and upload limit configuration
- `controllers/` - Request handling and business logic
- `middleware/` - Authentication, admin authorization, uploads, and error handling
- `models/` - Mongoose schemas for users, documents, vaults, shares, and logs
- `routes/` - Express route definitions
- `scripts/` - Utility scripts such as admin seeding
- `utils/` - Shared backend helpers

---

## 📬 Postman Collection

Import this file into Postman to test the backend quickly:

```txt
server/postman_collection.json
```

Recommended flow:

1. Register or log in.
2. Copy the returned access token.
3. Add it as a bearer token for protected requests.
4. Test documents, vaults, shares, exports, and admin routes.

---

## 🔒 Security Notes

- Keep `.env` files private and never commit real secrets.
- Use long, random JWT secrets in production.
- Restrict Cloudinary credentials to the correct project.
- Set `CLIENT_URL` to your deployed frontend URL in production.
- Rotate credentials immediately if they are exposed.

---

## 🌟 Project Status

Ferry is designed as a polished secure-file workspace: fast enough for daily document workflows, structured enough for team vaults, and protected enough for admin-level oversight.

Built with care for secure uploads, clean collaboration, and a dashboard experience that feels sharp from the first click.
