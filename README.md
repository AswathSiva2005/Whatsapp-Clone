## GitHub Repository
Github - https://github.com/AswathSiva2005/Whatsapp-Clone.git

## Live Demo
Demo Link - https://aswath-whatsapp-clone.vercel.app/


## Run Locally
### 1. Start backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on http://localhost:8000

### 2. Start frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on http://localhost:3000


## Tech Stack
- Frontend: React, Redux Toolkit, Socket.IO Client
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB



## Environment Variables
### Backend (.env inside backend folder)

Create backend/.env with:

```env
PORT=8000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db-name>
# OR
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>/<db-name>

# JWT secrets
ACCESS_TOKEN_SECRET=replace_with_secure_random_string
REFRESH_TOKEN_SECRET=replace_with_secure_random_string

# Frontend URL(s) allowed by CORS
CLIENT_ENDPOINT=http://localhost:3000
# Optional comma-separated list
CLIENT_ENDPOINTS=http://localhost:3000,http://localhost:3002

# Optional defaults
DEFAULT_PICTURE=https://example.com/default-avatar.png
DEFAULT_STATUS=Hey there! I am using whatsapp
DEFAULT_GROUP_PICTURE=https://example.com/default-group.png

# Optional profile upload to Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
```


### Frontend (.env inside frontend folder)

Create frontend/.env with:
```env
REACT_APP_API_ENDPOINT=http://localhost:8000/api/v1
```
Frontend runs on http://localhost:3000


# WhatsApp Web Clone (Full Stack)

Simplified WhatsApp Web style chat application built with:

- Frontend: React, Redux Toolkit, React Router, Axios, Socket.IO client
- Backend: Node.js, Express, Mongoose, Socket.IO
- Database: MongoDB

## Implemented Features

### 1. User Setup

- User registration and login with email + password
- Unique user identifier using MongoDB ObjectId
- Additional uniqueness constraints on email and phone
- Authenticated requests with JWT access token
- Supports multiple users chatting with each other

### 2. Chat Interface

- Two-panel layout:
  - Left panel: conversation list
  - Right panel: active chat window
- Active chat highlighting in conversation list
- Message history rendering in chat window
- Message input + send action
- Sent/received message bubble differentiation
- Automatic scroll to latest message

### 3. Messaging Functionality

- Send text messages between users
- MongoDB message persistence
- Fetch messages by selected conversation
- Messages returned in chronological order (oldest to latest)
- Sender, conversation, timestamp, and status tracked per message
- Messages persist after refresh

### 4. Backend APIs

- Auth APIs: register, login, refresh token, logout
- User APIs: search users, search by phone, profile update, block/unblock
- Conversation APIs: create/open conversation, list conversations, group chat creation
- Message APIs: send, list by conversation, star/unstar, delete for self, list starred
- Input validation for invalid requests and empty message submissions
- Proper HTTP status codes for validation and auth failures

### 5. Real-Time Updates

- Socket.IO real-time message delivery
- Live incoming message rendering without page refresh
- Typing indicators
- Message delivered/read status events

### 6. Application Structure

- Clear frontend and backend separation
- Organized controllers/services/routes/models structure
- Reusable React components for sidebar, messages, actions, header, etc.
- Mongoose schemas for users, conversations, messages, statuses

## Project Structure

```text
backend/
	src/
		controllers/
		services/
		routes/
		models/
		middlewares/
		configs/
frontend/
	src/
		components/
		pages/
		features/
		context/
		utils/
```

## Prerequisites

- Node.js 20.x
- npm 10+
- MongoDB instance (local or Atlas)


## Basic Usage

1. Register at least two different users.
2. Login as user A and open/create a chat with user B.
3. Login as user B in another browser/incognito window.
4. Exchange messages and verify:
   - Instant delivery
   - Distinct sender/receiver bubbles
   - Message persistence after refresh

## API Summary

Base URL: /api/v1

- POST /auth/register
- POST /auth/login
- POST /auth/refreshtoken
- POST /auth/logout

- GET /user?search=<keyword>
- GET /user/phone?phone=<phone>
- PUT /user/profile
- POST /user/block
- POST /user/unblock
- POST /user/upload

- POST /conversation
- GET /conversation
- POST /conversation/group
- POST /conversation/clear
- POST /conversation/delete

- POST /message
- GET /message/:convo_id
- PATCH /message/:messageId/star
- DELETE /message/:messageId
- GET /message/starred

## Build

```bash
cd frontend
npm run build
```

## Notes

- If Cloudinary variables are not set, profile uploads are stored in backend/uploads and served as static files.
- Ensure the frontend URL is included in backend CORS config via CLIENT_ENDPOINT or CLIENT_ENDPOINTS.









