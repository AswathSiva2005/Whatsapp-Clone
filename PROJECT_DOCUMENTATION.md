# PROJECT_DOCUMENTATION.md

## 1. Project Overview

This project is a full-stack WhatsApp Web style clone built with the MERN ecosystem and Socket.IO.

It supports:

- Authentication (register, login, refresh token, logout)
- 1:1 chat and group chat
- Real-time messaging and typing indicators
- Message delivery/read updates
- Message star/unstar and delete
- Poll messages and voting
- Disappearing messages (timed auto-delete)
- Status/stories (24-hour lifecycle)
- Audio/video call signaling with call history
- Profile management, app lock (PIN), and notification controls
- File/image upload with Cloudinary + backend fallback

---

## 2. Tech Stack

### Frontend

- React 18
- Redux Toolkit
- React Router v6
- Axios
- Socket.IO Client
- Tailwind CSS
- simple-peer (WebRTC peer connection)
- react-easy-crop (profile image crop)

### Backend

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT (access + refresh token)
- bcrypt
- express-fileupload
- helmet, cors, express-mongo-sanitize, compression

### Database

- MongoDB Atlas/local MongoDB

---

## 3. Repository Structure

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

---

## 4. Runtime Architecture

## 4.1 Backend startup flow

1. Load env config and validate DB URI.
2. Connect MongoDB.
3. Start Express HTTP server.
4. Attach Socket.IO on same server.
5. Configure CORS and security middleware.
6. Expose REST APIs at `/api/v1`.

## 4.2 Frontend startup flow

1. Redux store initializes (session persistence enabled).
2. App verifies token by calling conversation API.
3. If token valid, app routes to home.
4. Socket connects and user joins personal room.
5. UI listens to real-time events for message/call updates.

---

## 5. Backend Modules

## 5.1 Entry and app configuration

- `backend/src/index.js`
  - Mongo connection
  - HTTP server
  - Socket.IO server setup
  - Origin allowlist + preview domain logic
- `backend/src/app.js`
  - Middleware stack
  - CORS and helmet config
  - `/uploads` static serving
  - health endpoint `/`
  - route binding and error handling

Security-related middleware:

- `helmet`
- `express-mongo-sanitize`
- `cookie-parser`
- `compression`
- `cors`

Important implementation detail:

- `crossOriginResourcePolicy` is set to `cross-origin` to allow uploaded avatars/media to render across frontend-backend origins.

## 5.2 Authentication module

Files:

- `backend/src/routes/auth.route.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/services/auth.service.js`
- `backend/src/services/token.service.js`
- `backend/src/middlewares/authMiddleware.js`

Features:

- Register user
- Login user
- Refresh token using secure cookie
- Logout (clear refresh token cookie)
- Register-time profile image upload

Token strategy:

- Access token: short-lived JWT
- Refresh token: longer-lived JWT in HTTP-only cookie path `/api/v1/auth/refreshtoken`

## 5.3 User module

Files:

- `backend/src/routes/user.route.js`
- `backend/src/controllers/user.controller.js`
- `backend/src/services/user.service.js`

Features:

- Search users by keyword
- Search user by phone number
- Update profile (name, status, picture)
- Block/unblock users
- Upload profile picture
- App lock config and PIN verification
- Notification settings
  - mute all notifications
  - mute login notifications
  - mute per-conversation

Upload behavior:

- Tries Cloudinary if env config exists.
- Falls back to local file storage in `/uploads` if Cloudinary unavailable.

## 5.4 Conversation module

Files:

- `backend/src/routes/conversation.route.js`
- `backend/src/controllers/conversation.controller.js`
- `backend/src/services/conversation.service.js`

Features:

- Create/open 1:1 conversation
- Get all user conversations
- Group chat lifecycle:
  - create group
  - fetch group details
  - update group info
  - add members
  - remove members
  - exit group
- Per-user disappearing message settings (`off` or `timed` with seconds)
- Clear chat (delete all messages in conversation)
- Delete conversation

Group permission rules:

- Only group admin can update group details or add members.
- Admin or self can remove member.
- Admin transfers when current admin exits/removed.

## 5.5 Message module

Files:

- `backend/src/routes/message.route.js`
- `backend/src/controllers/message.controller.js`
- `backend/src/services/message.service.js`

Features:

- Send message with text/files/poll
- Get conversation messages
- Toggle star/unstar
- Delete message for self
- Delete message for everyone
- Get starred messages
- Vote in poll message

Behavior details:

- Validates participant membership before send.
- Applies disappearing-message timer to new message if sender has timed mode enabled.
- Updates conversation `latestMessage` after send.

## 5.6 Status module (stories)

Files:

- `backend/src/routes/status.route.js`
- `backend/src/controllers/status.controller.js`
- `backend/src/services/status.service.js`

Features:

- Create status (text/image)
- Get status feed
- Like/unlike status
- Reply to status
- Mark status as viewed
- Delete own status

Lifecycle:

- Status expires automatically using TTL index (`expiresAt`).

## 5.7 Call module

Files:

- `backend/src/routes/call.route.js`
- `backend/src/controllers/call.controller.js`
- `backend/src/models/callModel.js`

Features:

- Start call (audio/video)
- Accept call
- End call with reason and duration
- Get call history
- Delete call record

Status model:

- `ringing`, `accepted`, `completed`, `rejected`, `missed`, `cancelled`

---

## 6. Socket.IO Real-Time Layer

File:

- `backend/src/SocketServer.js`

Implemented events:

- `join`
- `get-online-users`
- `setup socket`
- `join conversation`
- `send message`
- `receive message`
- `typing`
- `stop typing`
- `message delivered`
- `message read`
- `call user`
- `answer call`
- `call accepted`
- `webrtc signal`
- `end call`
- `switch to video`

Real-time behavior highlights:

- Multi-session user support (same user can have multiple active sockets).
- Blocked-user filtering before message delivery.
- Active call map used to coordinate and clean call state on disconnect.

---

## 7. Data Models

## 7.1 User

Main fields:

- name, email, phone, picture, status, password
- blockedUsers[]
- appLockEnabled, appLockPinHash
- notificationSettings

## 7.2 Conversation

Main fields:

- name, picture, description
- isGroup
- users[]
- admin (group)
- latestMessage
- disappearingSettings[] (per-user mode and seconds)

## 7.3 Message

Main fields:

- sender, message, conversation
- files[]
- poll { question, options, votes, allowMultipleAnswers }
- expiresAt (TTL for disappearing)
- status (`sent|delivered|read`)
- starredBy[]
- deletedFor[]
- isDeletedForEveryone

## 7.4 Status

Main fields:

- user, text, mediaUrl, mediaType
- likes[], viewers[], replies[]
- expiresAt (24-hour TTL)

## 7.5 Call

Main fields:

- conversation, caller, receiver
- type (`audio|video`)
- status
- startedAt, endedAt, durationSeconds

---

## 8. Frontend Modules

## 8.1 App shell and routing

Files:

- `frontend/src/App.js`
- `frontend/src/index.js`
- `frontend/src/app/store.js`

Routes:

- `/` home chat screen (protected)
- `/login`
- `/register`
- `/settings` (protected)
- `/unlock` (protected when app lock enabled)

State architecture:

- Redux Toolkit for `user` + `chat`
- Session persistence with `redux-persist` (session storage)

## 8.2 User/auth state module

File:

- `frontend/src/features/userSlice.js`

Responsibilities:

- register/login async thunks
- store authenticated user and token
- app-lock and notification settings in state
- logout/reset state

## 8.3 Chat state module

File:

- `frontend/src/features/chatSlice.js`

Responsibilities:

- fetch conversations
- open/create conversation
- fetch/send messages
- create/update group
- add/remove/exit group members
- disappearing settings update
- poll voting
- unread tracking
- pinned/archived conversation states
- local message status updates and star toggles

## 8.4 Home page and call integration

File:

- `frontend/src/pages/home.js`

Responsibilities:

- socket registration and event handlers
- online users and typing state
- incoming/outgoing call flow
- call accept/end/switch-to-video flow
- message notification handling
- chat layout orchestration (sidebar + chat container)

## 8.5 Sidebar and panels

Important files:

- `frontend/src/components/sidebar/Sidebar.jsx`
- `frontend/src/components/sidebar/calls/CallHistoryPanel.jsx`
- `frontend/src/components/sidebar/header/StatusPanel` (status feature)

Responsibilities:

- conversations list and search
- archived and pinned handling
- status panel and call history panel
- fetch and delete call history

## 8.6 Settings and unlock pages

Files:

- `frontend/src/pages/settings.js`
- `frontend/src/pages/unlock.js`

Settings features:

- profile update
- profile picture upload + crop
- notification preferences sync with backend
- app lock enable/change/disable via PIN

Unlock features:

- PIN verification API call
- unlock marker in sessionStorage

## 8.7 File upload utility

File:

- `frontend/src/utils/upload.js`

Behavior:

1. Try Cloudinary upload when config is valid.
2. If Cloudinary fails, upload to backend route (`/user/upload`).
3. Normalize response shape for consistent UI usage.

---

## 9. API Documentation (Implemented)

Base URL:

- `/api/v1`

## 9.1 Auth

- `POST /auth/register`
- `POST /auth/upload`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refreshtoken`

## 9.2 User

- `GET /user?search=...`
- `GET /user/phone?phone=...`
- `PUT /user/profile`
- `POST /user/block`
- `POST /user/unblock`
- `POST /user/upload`
- `PATCH /user/app-lock`
- `POST /user/app-lock/verify`
- `GET /user/notification-settings`
- `PATCH /user/notification-settings`
- `PATCH /user/notification-settings/conversation/:conversationId`

## 9.3 Conversation

- `POST /conversation`
- `GET /conversation`
- `POST /conversation/group`
- `GET /conversation/group/:conversationId`
- `PATCH /conversation/group/:conversationId`
- `POST /conversation/group/:conversationId/members`
- `DELETE /conversation/group/:conversationId/members/:memberId`
- `POST /conversation/group/:conversationId/exit`
- `PATCH /conversation/:conversationId/disappearing`
- `POST /conversation/clear`
- `POST /conversation/delete`

## 9.4 Message

- `POST /message`
- `GET /message/starred`
- `PATCH /message/:messageId/poll/vote`
- `PATCH /message/:messageId/star`
- `PATCH /message/:messageId/delete-for-everyone`
- `DELETE /message/:messageId`
- `GET /message/:convo_id`

## 9.5 Status

- `POST /status`
- `GET /status`
- `PATCH /status/:statusId/like`
- `POST /status/:statusId/reply`
- `POST /status/:statusId/view`
- `DELETE /status/:statusId`

## 9.6 Call

- `GET /call`
- `POST /call/start`
- `PATCH /call/:callId/accept`
- `PATCH /call/:callId/end`
- `DELETE /call/:callId`

---

## 10. End-to-End Feature Flows

## 10.1 Register and login

1. User submits register/login form.
2. Backend validates and authenticates credentials.
3. Access token returned in response user object.
4. Refresh token saved as HTTP-only cookie.
5. Frontend stores user in Redux persisted session.

## 10.2 Open chat and send message

1. Frontend loads conversations.
2. User selects conversation and fetches history.
3. User sends message via REST.
4. Backend stores message and updates latest conversation message.
5. Socket event broadcasts to recipient(s).
6. Recipient UI updates instantly.

## 10.3 Typing and read/delivered states

1. Typing state emitted to conversation room.
2. Receiver sees typing indicator.
3. Delivery/read events update message status in DB and sender UI.

## 10.4 Group management

1. Group created with admin and members.
2. Admin updates details or adds members.
3. Admin/self removes members.
4. User can exit group; admin auto-reassignment when needed.

## 10.5 Disappearing messages

1. User sets conversation mode to timed with seconds.
2. New outgoing messages from that user are assigned `expiresAt`.
3. MongoDB TTL index auto-removes expired messages.

## 10.6 Poll messages

1. Sender creates poll with 2+ options.
2. Poll saved inside message document.
3. Members vote through vote API.
4. Votes update option arrays and UI reflects new state.

## 10.7 Status/stories

1. User creates text/image status.
2. Feed displays active statuses.
3. Other users can view, like, reply.
4. TTL removes expired statuses automatically.

## 10.8 Audio/video call

1. Caller creates call record via `/call/start`.
2. Socket `call user` sends signaling offer to receiver.
3. Receiver answers; both peers exchange WebRTC signals.
4. Call accepted state updated via REST.
5. On hangup, `/call/:id/end` stores final status and duration.
6. Call history panel fetches and displays past calls.

---

## 11. Environment Variables

## 11.1 Backend (`backend/.env`)

- `PORT`
- `NODE_ENV`
- `MONGO_URI` or `DATABASE_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CLIENT_ENDPOINT` / `CLIENT_ENDPOINTS`
- `DEFAULT_PICTURE`
- `DEFAULT_STATUS`
- `DEFAULT_GROUP_PICTURE`
- `CLOUDINARY_CLOUD_NAME` (optional)
- `CLOUDINARY_UPLOAD_PRESET` (optional)

## 11.2 Frontend (`frontend/.env`)

- `REACT_APP_API_ENDPOINT`
- optional Cloudinary values used by upload utility:
  - `REACT_APP_CLOUD_NAME2`
  - `REACT_APP_CLOUD_SECRET2`

---

## 12. Build and Run

## 12.1 Backend

```bash
cd backend
npm install
npm run dev
```

## 12.2 Frontend

```bash
cd frontend
npm install
npm start
```

## 12.3 Production build (frontend)

```bash
cd frontend
npm run build
```

---

## 13. Key Implementation Notes

- API compatibility: server mounts routes under both `/api/v1` and root for compatibility.
- Upload reliability: if Cloudinary is unavailable, local upload fallback keeps feature functional.
- Security baseline: JWT-protected routes, request sanitization, and CORS origin controls.
- Multi-session sockets: one user can be connected from multiple browser sessions.
- Message visibility: blocked users are filtered in socket delivery path.

---

## 14. Feature Checklist (Current)

- Auth (register/login/refresh/logout): Implemented
- Profile update + avatar upload: Implemented
- 1:1 messaging: Implemented
- Group chat management: Implemented
- Typing indicator: Implemented
- Message status (sent/delivered/read): Implemented
- Poll messages and voting: Implemented
- Starred messages: Implemented
- Delete message (self/everyone): Implemented
- Disappearing messages: Implemented
- Status/stories: Implemented
- Audio/video calling: Implemented (Socket signaling + call history)
- App lock PIN: Implemented
- Notification settings + per-chat mute: Implemented
- Call history and deletion: Implemented
