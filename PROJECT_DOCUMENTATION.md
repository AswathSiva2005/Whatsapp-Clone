# Project Documentation

## 1. Overview

This project is a full-stack WhatsApp Web style clone built with React, Node.js, MongoDB, and Socket.IO.

Implemented capabilities include:

- Authentication (register, login, refresh token, logout)
- One-to-one and group messaging
- Real-time messaging, typing, delivery/read updates
- Starred messages, delete for self, delete for everyone
- Poll messages and voting
- Disappearing messages
- Status/stories lifecycle
- Audio/video call signaling with call history
- Profile management, app lock, notification settings
- File and image upload with Cloudinary + backend fallback

## 2. Architecture Summary

### 2.1 Backend runtime flow

1. Load environment variables and validate DB URI.
2. Connect to MongoDB.
3. Start Express HTTP server.
4. Attach Socket.IO to same HTTP server.
5. Mount routes under /api/v1 and compatibility root mount.

### 2.2 Frontend runtime flow

1. Initialize Redux store with session persistence.
2. Verify access token by calling backend API.
3. Connect Socket.IO after auth state is available.
4. Render sidebar/chat panels and live event updates.

## 3. Repository Layout

```text
backend/
  src/
    app.js
    index.js
    SocketServer.js
    configs/
    controllers/
    middlewares/
    models/
    routes/
    services/
    utils/
frontend/
  src/
    App.js
    app/store.js
    components/
    context/
    features/
    pages/
    utils/
```

## 4. Backend Modules

### 4.1 Core app setup

- backend/src/index.js
  - Mongo connection, HTTP boot, Socket.IO setup
- backend/src/app.js
  - middleware stack, CORS, route binding, error handling
  - static /uploads serving

Security middleware:

- helmet
- express-mongo-sanitize
- cookie-parser
- compression
- cors

CORS and Image Serving:

- helmet() configured with crossOriginResourcePolicy: { policy: "cross-origin" }
- Prevents CORS blocking of images between frontend (localhost:3000) and backend (localhost:5001)
- /uploads directory is public and CORS-compatible for avatar and file rendering

### 4.2 Auth module

Files:

- backend/src/routes/auth.route.js
- backend/src/controllers/auth.controller.js
- backend/src/services/auth.service.js
- backend/src/services/token.service.js
- backend/src/middlewares/authMiddleware.js

Token strategy:

- Access token via JWT in Authorization header
- Refresh token via HTTP-only cookie on /api/v1/auth/refreshtoken

### 4.3 User module

Files:

- backend/src/routes/user.route.js
- backend/src/controllers/user.controller.js
- backend/src/services/user.service.js

Features:

- user search by text and phone
- profile update
- block/unblock
- app lock PIN config/verify
- notification settings including per-conversation mute
- profile upload with Cloudinary fallback to local files

### 4.4 Conversation module

Files:

- backend/src/routes/conversation.route.js
- backend/src/controllers/conversation.controller.js
- backend/src/services/conversation.service.js

Features:

- open/create direct conversation
- list conversations
- full group lifecycle (create/update/add/remove/exit)
- disappearing-message per-user settings
- clear/delete conversation

Rules:

- only group admin can update group/add members
- admin or self can remove member
- admin transfer when required

Data consistency:

- picture field optional; defaults to empty string for direct conversations
- orphan direct conversations filtered on fetch (when counterpart user is deleted)
- conversation list excludes deleted-user chats automatically

### 4.5 Message module

Files:

- backend/src/routes/message.route.js
- backend/src/controllers/message.controller.js
- backend/src/services/message.service.js

Features:

- send messages (text/files/poll)
- fetch conversation messages
- star/unstar
- delete for self and everyone
- starred list
- poll vote

### 4.6 Status module

Files:

- backend/src/routes/status.route.js
- backend/src/controllers/status.controller.js
- backend/src/services/status.service.js

Features:

- create/view/like/reply/delete status
- TTL-based expiry

### 4.7 Call module

Files:

- backend/src/routes/call.route.js
- backend/src/controllers/call.controller.js
- backend/src/models/callModel.js

Features:

- start/accept/end calls
- call history list and delete

## 5. Socket.IO Layer

File:

- backend/src/SocketServer.js

Key events:

- user/session setup and online tracking
- join conversation rooms
- send/receive message
- typing/stop typing
- message delivered/read
- call signaling events

## 6. Data Models

### 6.1 User

- identity: name, email, phone
- profile: picture, status
- security/settings: blockedUsers, app lock, notification settings

### 6.2 Conversation

- name, picture, description
- isGroup, users, admin, latestMessage
- disappearingSettings per user

### 6.3 Message

- sender, message, conversation
- files, poll, status
- starredBy, deletedFor, isDeletedForEveryone
- expiresAt for disappearing behavior

### 6.4 Status

- user, text/media, likes/viewers/replies, expiresAt

### 6.5 Call

- participants, type, status, timing metadata

## 7. Frontend Modules

### 7.1 App shell

Files:

- frontend/src/App.js
- frontend/src/index.js
- frontend/src/app/store.js

Features:

- protected routes
- session-persisted Redux state
- startup token validation

### 7.2 User state

File:

- frontend/src/features/userSlice.js

### 7.3 Chat state

File:

- frontend/src/features/chatSlice.js

### 7.4 Sidebar and chat UI

Important files:

- frontend/src/components/sidebar/Sidebar.jsx
- frontend/src/components/sidebar/conversations/Conversations.jsx
- frontend/src/components/Chat/messages/Message.jsx
- frontend/src/components/Chat/header/ContactInfoDrawer.jsx

### 7.5 Upload utility

File:

- frontend/src/utils/upload.js

Behavior:

1. try Cloudinary upload
2. fallback to backend /user/upload
3. normalize payload for UI

### 7.6 Frontend Reliability Patterns

#### Token Refresh and Retry on 401

Implemented across multiple request paths:

- Message component (delete for everyone action)
- Upload utility (group/profile image updates)
- Chat slice thunk (group conversation updates)
- Starred messages panel (fetch starred list)

Pattern:

1. Execute API request with access token
2. On 401 response, POST to /auth/refreshtoken with credentials
3. Update Redux user state with refreshed token
4. Retry original request with new token
5. Fallback token from sessionStorage persist if needed

#### Safe Data Access

- Optional chaining (?.) for nested object access
- Default values for missing/undefined fields
- Guards in utility functions (capitalize, etc.)
- Prevents crashes from incomplete backend responses

#### Session Persistence and Recovery

- Redux persist saves user token to sessionStorage
- Token fallback enables retry even if Redux state temporarily unavailable
- Frontend detects localhost and defaults to port 5001
- Environment variable fallback for custom API endpoints

### 7.7 UI State Coordination

#### Message Menu Single-Open Behavior

- Custom event "message-menu-open" fired when message menu opens
- All other message containers listen and close their active menus
- Data attributes (data-message-container, data-message-id) enable cross-component detection
- Prevents multiple message menus from being open simultaneously

#### Orphan Data Filtering

- Sidebar filters out direct conversations with deleted users
- Matches backend filter to ensure consistency
- Prevents phantom entries in conversation list

## 8. API Index

Base URL: /api/v1

### 8.1 Auth

- POST /auth/register
- POST /auth/upload
- POST /auth/login
- POST /auth/logout
- POST /auth/refreshtoken

### 8.2 User

- GET /user?search=...
- GET /user/phone?phone=...
- GET /user/list
- PUT /user/profile
- POST /user/block
- POST /user/unblock
- POST /user/upload
- PATCH /user/app-lock
- POST /user/app-lock/verify
- GET /user/notification-settings
- PATCH /user/notification-settings
- PATCH /user/notification-settings/conversation/:conversationId
- GET /user/contacts
- POST /user/contacts
- PATCH /user/contacts/:contactId/nickname

### 8.3 Conversation

- POST /conversation
- GET /conversation
- POST /conversation/group
- GET /conversation/group/:conversationId
- PATCH /conversation/group/:conversationId
- POST /conversation/group/:conversationId/members
- DELETE /conversation/group/:conversationId/members/:memberId
- POST /conversation/group/:conversationId/exit
- PATCH /conversation/:conversationId/disappearing
- POST /conversation/clear
- POST /conversation/delete

### 8.4 Message

- POST /message
- GET /message/starred
- PATCH /message/:messageId/poll/vote
- PATCH /message/:messageId/star
- PATCH /message/:messageId/delete-for-everyone
- DELETE /message/:messageId
- GET /message/:convo_id

### 8.5 Status

- POST /status
- GET /status
- PATCH /status/:statusId/like
- POST /status/:statusId/reply
- POST /status/:statusId/view
- DELETE /status/:statusId

### 8.6 Call

- GET /call
- POST /call/start
- PATCH /call/:callId/accept
- PATCH /call/:callId/end
- DELETE /call/:callId

## 9. Recent Fixes and Reliability Improvements

- direct conversation creation supports missing user pictures
- orphan direct chats are filtered from sidebar if counterpart user is deleted
- message action menu UI behavior corrected (single open at a time)
- multiple frontend request paths now support token refresh + retry on 401
- group profile image update flow hardened for expired access token scenarios
- starred messages panel now refreshes token and retries fetch on 401
- safer text formatting utility for undefined values in conversation rendering
- removed New community option from sidebar menu UI
- CORS configuration in helmet prevents image serving blocking
- session persistence enables token recovery after page refresh
- data access patterns use optional chaining and default values
- API endpoint auto-detection on localhost with environment variable fallback

## 10. Environment Variables

### 10.1 Backend (backend/.env)

- PORT (recommended 5001 for local parity)
- NODE_ENV
- MONGO_URI or DATABASE_URL
- ACCESS_TOKEN_SECRET
- REFRESH_TOKEN_SECRET
- CLIENT_ENDPOINT / CLIENT_ENDPOINTS
- DEFAULT_PICTURE
- DEFAULT_STATUS
- DEFAULT_GROUP_PICTURE
- CLOUDINARY_CLOUD_NAME (optional)
- CLOUDINARY_UPLOAD_PRESET (optional)

### 10.2 Frontend (frontend/.env)

- REACT_APP_API_ENDPOINT (example: http://localhost:5001/api/v1)
- REACT_APP_CLOUD_NAME2 (optional)
- REACT_APP_CLOUD_SECRET2 (optional)

## 11. Local Run

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Frontend Production Build

```bash
cd frontend
npm run build
```
