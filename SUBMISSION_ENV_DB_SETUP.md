# Environment Variables and Database Setup (Submission Document)

This document is prepared for company project submission and explains exactly how to configure environment variables and database access for this project.

## 1. Environment Files to Create

Create runtime env files from the example templates:

1. Backend env

- Source template: `backend/.env.example`
- Create: `backend/.env`

2. Frontend env

- Source template: `frontend/.env.example`
- Create: `frontend/.env`

Important:

- Do not commit real secrets.
- Keep only placeholder values inside example/template files.

## 2. Backend Environment Variables

Add these variables in `backend/.env`.

| Variable                   | Required | Example                                       | Purpose                                   |
| -------------------------- | -------- | --------------------------------------------- | ----------------------------------------- |
| `PORT`                     | Yes      | `8000`                                        | Backend server port                       |
| `NODE_ENV`                 | Yes      | `development`                                 | Runtime mode (`development`/`production`) |
| `MONGO_URI`                | Yes\*    | `mongodb+srv://<user>:<pass>@<cluster>/<db>`  | Primary MongoDB connection string         |
| `DATABASE_URL`             | Yes\*    | `mongodb://127.0.0.1:27017/whatsapp_clone`    | Fallback MongoDB connection string        |
| `CLIENT_ENDPOINT`          | Yes      | `http://localhost:3000`                       | Frontend origin for CORS                  |
| `CLIENT_ENDPOINTS`         | Optional | `http://localhost:3000,http://localhost:3002` | Extra allowed origins                     |
| `ACCESS_TOKEN_SECRET`      | Yes      | `your_access_token_secret_here`               | JWT access token secret                   |
| `REFRESH_TOKEN_SECRET`     | Yes      | `your_refresh_token_secret_here`              | JWT refresh token secret                  |
| `DEFAULT_PICTURE`          | Optional | `https://example.com/default-avatar.png`      | Default user avatar                       |
| `DEFAULT_STATUS`           | Optional | `Hey there! I am using WhatsApp.`             | Default profile status                    |
| `DEFAULT_GROUP_PICTURE`    | Optional | `https://example.com/default-group.png`       | Default group image                       |
| `CLOUDINARY_CLOUD_NAME`    | Optional | `your_cloud_name`                             | Cloudinary cloud name for uploads         |
| `CLOUDINARY_UPLOAD_PRESET` | Optional | `your_unsigned_preset`                        | Cloudinary upload preset                  |

Notes:

- `MONGO_URI` or `DATABASE_URL` must be set. At least one is required.
- Image upload can still work with backend local upload fallback when Cloudinary is not configured.

## 3. Frontend Environment Variables

Add these variables in `frontend/.env`.

| Variable                  | Required          | Example                        | Purpose                               |
| ------------------------- | ----------------- | ------------------------------ | ------------------------------------- |
| `REACT_APP_API_ENDPOINT`  | Yes               | `http://localhost:8000/api/v1` | Base URL for frontend API calls       |
| `REACT_APP_CLOUD_NAME2`   | Optional          | `your_cloud_name`              | Cloudinary config used by upload flow |
| `REACT_APP_CLOUD_SECRET2` | Optional          | `your_upload_preset`           | Cloudinary config used by upload flow |
| `REACT_APP_CLOUD_NAME`    | Optional (legacy) | `your_cloud_name`              | Backward-compat fallback              |
| `REACT_APP_CLOUD_SECRET`  | Optional (legacy) | `your_upload_preset`           | Backward-compat fallback              |

## 4. Database Setup

This project uses MongoDB through Mongoose.

### Option A: MongoDB Atlas (recommended)

1. Create MongoDB Atlas account and cluster.
2. Create a DB user with username/password.
3. Add your IP in Network Access (or temporary `0.0.0.0/0` for development).
4. Copy the connection string and place it in `MONGO_URI` (or `DATABASE_URL`) in `backend/.env`.
5. Example Atlas URI:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
```

### Option B: Local MongoDB

1. Install MongoDB Community Server.
2. Start MongoDB service.
3. Use local URI in `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/whatsapp_clone
```

## 5. Run and Verify Configuration

1. Start backend:

```bash
cd backend
npm install
npm run dev
```

2. Start frontend:

```bash
cd frontend
npm install
npm start
```

3. Verification checklist:

- Backend starts without missing env variable errors.
- Backend logs show MongoDB connected.
- Frontend can register/login and fetch conversations.
- API calls target `REACT_APP_API_ENDPOINT` correctly.

## 6. Submission Safety Checklist

Before submitting:

- `.env` files are excluded from version control.
- No real tokens/passwords are present in any tracked file.
- Example/template files contain placeholders only.
- Documented values match the currently deployed/local setup.

## 7. Minimal Example Files (Safe Placeholders)

### backend/.env (example values)

```env
PORT=8000
NODE_ENV=development
CLIENT_ENDPOINT=http://localhost:3000
CLIENT_ENDPOINTS=http://localhost:3000,http://localhost:3002
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db-name>
DATABASE_URL=
ACCESS_TOKEN_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
DEFAULT_GROUP_PICTURE=https://example.com/default-group.png
DEFAULT_PICTURE=https://example.com/default-avatar.png
DEFAULT_STATUS=Hey there! I am using WhatsApp.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
```

### frontend/.env (example values)

```env
REACT_APP_API_ENDPOINT=http://localhost:8000/api/v1
REACT_APP_CLOUD_NAME2=
REACT_APP_CLOUD_SECRET2=
REACT_APP_CLOUD_NAME=
REACT_APP_CLOUD_SECRET=
```
