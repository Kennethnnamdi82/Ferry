# Ferry Backend

## Render deploy settings

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

## Required environment variables

Set these in Render's **Environment** tab:

```txt
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
MONGO_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_long_random_access_secret
JWT_REFRESH_SECRET=your_long_random_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

`MONGODB_URI` or `DATABASE_URL` can be used instead of `MONGO_URI`.

Health checks:

- `/`
- `/api/health`

If MongoDB keeps logging connection failures on Render, check your MongoDB Atlas
Network Access settings and allow Render connections, commonly `0.0.0.0/0`
for a simple deployment.
