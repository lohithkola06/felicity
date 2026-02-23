# Felicity — Fest Event Management System

A full-stack event management platform built for IIIT Hyderabad's fest ecosystem. Supports participant registration, merchandise sales, team-based hackathon events, real-time team chat, QR-based attendance, anonymous feedback, and administrative controls.

**Live Demo:** [https://felicity-olive.vercel.app](https://felicity-olive.vercel.app)

---

## Tech Stack Overview

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | React 19, Vite 6 |
| Styling | Tailwind CSS | 3.4 |
| Backend | Node.js + Express | Express 5 |
| Database | MongoDB (Mongoose ODM) | Mongoose 9 |
| Authentication | JWT + bcrypt | jsonwebtoken 9, bcrypt 6 |
| Real-time | Socket.IO | 4.8 |
| Email | Nodemailer | 8.0 |
| QR Codes | qrcode + html5-qrcode | 1.5 / 2.3 |

---

## Libraries & Justifications

### Backend Dependencies

| Library | Version | Purpose & Justification |
|---------|---------|------------------------|
| `express` | 5.2 | Industry-standard HTTP framework for building RESTful APIs. Chosen for its minimalist design, excellent middleware ecosystem, and extensive community support. |
| `mongoose` | 9.2 | Schema-based MongoDB ODM. Provides built-in validation, pre/post hooks (used for password hashing), population (used for joining user/event data), and indexing. Chosen over raw MongoDB driver for developer productivity via schema enforcement. |
| `jsonwebtoken` | 9.0 | Stateless JWT-based authentication. Tokens encode user ID and role, enabling role-based access control (RBAC) without server-side session storage. Persists across browser restarts via localStorage. |
| `bcrypt` | 6.0 | Secure password hashing with automatic salting. Used in the User model's pre-save hook to ensure plaintext passwords are never stored. Industry standard for password security. |
| `bcryptjs` | 3.0 | Pure JavaScript fallback for bcrypt. Ensures compatibility on environments where native bcrypt compilation fails (e.g., some cloud deployment platforms). |
| `nodemailer` | 8.0 | Email delivery for registration confirmations, merchandise purchase receipts, and waitlist notifications. Uses Ethereal in development (generates preview URLs for testing) and real SMTP in production. Emails include embedded QR codes. |
| `qrcode` | 1.5 | Server-side QR code generation. Creates data-URL encoded QR images containing ticket metadata (ticket ID, event name, participant email). Embedded in confirmation emails and displayed in the participant dashboard. |
| `uuid` | 13.0 | Generates unique ticket IDs (format: `TKT-XXXXXXXX`). Ensures each registration/purchase gets a globally unique, collision-free identifier. |
| `socket.io` | 4.8 | Bi-directional real-time communication. Powers the team chat feature — messages are broadcast to all team members in a room. Also used for real-time attendance dashboard updates. |
| `cors` | 2.8 | Enables Cross-Origin Resource Sharing between the frontend (Vercel) and backend (Render). Configured to accept requests from the deployed frontend URL. |
| `dotenv` | 17.3 | Loads environment variables from `.env` files. Separates configuration (MongoDB URI, JWT secret, SMTP credentials) from code for security and portability. |
| `axios` | 1.13 | Used in backend for outbound HTTP requests (Discord webhook notifications). Chosen for its clean promise-based API and automatic JSON handling. |
| `nodemon` | 3.1 (dev) | Auto-restarts the server on file changes during development. Improves developer experience significantly. |
| `cloudinary` | 1.41 | Cloudinary SDK for robust media management. Chosen to solve the problem of persistent scalable file storage for user uploads (payment proofs, custom forms) directly from Base64 payloads, bypassing local disk storage constraints. |

### Frontend Dependencies

| Library | Version | Purpose & Justification |
|---------|---------|------------------------|
| `react` | 19.1 | Component-based UI library. Chosen for its mature ecosystem, hooks-based state management, and excellent developer tooling. React 19 provides improved performance and concurrent features. |
| `react-dom` | 19.1 | React's DOM rendering engine. Required for mounting React components in the browser. |
| `react-router-dom` | 7.13 | Client-side routing with support for nested routes, route parameters, and navigation guards. Used to implement role-based protected routes (participant, organizer, admin dashboards). |
| `axios` | 1.13 | Promise-based HTTP client with request/response interceptors. Interceptors automatically attach JWT tokens to every API request and handle 401 responses. Chosen over fetch() for built-in error handling and request cancellation. |
| `html5-qrcode` | 2.3 | Browser-based QR code scanning using device camera. Powers the organizer's QR attendance scanner with real-time camera feed and file upload fallback. Works on both desktop and mobile browsers. |
| `socket.io-client` | 4.8 | Client-side Socket.IO for real-time team chat. Pairs with the backend Socket.IO server for instant message delivery. |
| `tailwindcss` | 3.4 (dev) | Utility-first UI framework for rapid UI development. Chosen because it solves the problem of writing and maintaining complex global CSS files by allowing styles to be applied directly within components, ensuring styling consistency and seamless responsive design without UI library bloating. |
| `vite` | 6.3 (dev) | Next-generation frontend build tool. Provides near-instant hot module replacement (HMR) during development and optimized production builds with code splitting. Chosen over Create React App for significantly faster build times. |

---

## Advanced Features Implemented

### Tier A Features (8 marks each)

#### 1. Hackathon Team Registration
**Selection Justification:** Team-based events are central to hackathons and coding competitions at IIIT. This feature enables the core collaborative workflow that distinguishes hackathons from regular events.

**Design Choices & Implementation:**
- **Team creation from event page:** Participants create teams directly from an event's detail page by providing a team name, size (2-10), and comma-separated member emails.
- **Invite-based workflow:** Team members are looked up by email. Each receives a pending invite visible on their "My Teams" page.
- **Status progression:** Teams follow a clear lifecycle: `pending` → `ready` (all members accepted) → `registered` (leader registers the team). Registration is blocked until all invites are accepted.
- **Automatic ticket generation:** Upon team registration, the system generates individual tickets (with unique IDs and QR codes) for every team member, including the leader.
- **Team management dashboard (`/teams`):** Shows pending invites with accept/decline, active teams with member statuses, team registration button (leader-only), and disband option.

**Technical Decisions:**
- Used a unique compound index on `(event, leader)` to prevent duplicate teams per event.
- Member status tracking uses an embedded subdocument array rather than a separate collection, keeping team queries efficient.
- Registration atomically creates all member registrations in a loop and updates the event's registration count.

#### 2. QR Code Scanner & Attendance Tracking
**Selection Justification:** Physical event attendance verification is a core operational need. QR-based scanning provides a fast, accurate, and contactless solution that replaces manual roll calls.

**Design Choices & Implementation:**
- **Dual input modes:** Camera-based scanning via `html5-qrcode` library (works on mobile and desktop) and manual ticket ID entry for edge cases.
- **Duplicate scan rejection:** Backend checks `registration.attended` flag — already-scanned tickets return an error with the participant's details.
- **Timestamp recording:** Each scan records `attendedAt` with the exact timestamp for audit purposes.
- **Live attendance dashboard:** Shows real-time stats (total registered, present, absent, attendance rate %), searchable participant table, and filter by status.
- **CSV export:** One-click download of attendance data with columns: Name, Email, Contact, College, TicketID, Attended, AttendedAt.
- **Manual override:** Organizers can mark attendance by manually entering a ticket ID (for exceptional cases like damaged QR codes).
- **Auto-refresh:** Dashboard polls the backend every 10 seconds for live updates during events.

**Technical Decisions:**
- QR data is JSON-encoded containing `{ticketId, event, participant}` — sufficient for server-side validation.
- Attendance marking verifies the organizer owns the event before allowing the scan, preventing cross-event tampering.
- Used `html5-qrcode` over ZXing for better browser compatibility and built-in camera permission handling.

---

### Tier B Features (6 marks each)

#### 3. Organizer Password Reset System
**Selection Justification:** Since organizer accounts are admin-provisioned (no self-registration), a secure admin-mediated password reset flow is essential. This matches the real-world workflow where club credentials are managed centrally.

**Design Choices & Implementation:**
- **Organizer-side:** Organizers submit reset requests with a reason via their password reset page. They see a history of all their requests with status badges (Pending/Approved/Rejected) and admin notes.
- **Admin-side:** The admin dashboard has a "Password Reset Requests" tab showing all requests with club name, date, reason. Admin can approve (auto-generates temp password) or reject with comments.
- **Auto-generated passwords:** Upon approval, `crypto.randomBytes(8)` generates a secure 16-character hex password. The organizer's password is updated (bcrypt hashes via pre-save hook), and the admin sees the temp password to share manually.
- **Duplicate prevention:** Only one pending request per organizer is allowed.

**Technical Decisions:**
- Temp passwords are stored in the request document so the admin can retrieve them if needed.
- Password reset routes are strictly gated: organizers can only access their own requests, admin can access all.
- Chose admin-mediated sharing over email delivery per assignment FAQ guidance.

#### 4. Real-Time Team Chat
**Selection Justification:** Communication is critical for hackathon teams. A built-in chat eliminates the need for external tools and keeps team coordination within the platform.

**Design Choices & Implementation:**
- **REST API with polling:** Messages are sent via `POST /chat/:teamId/send` and fetched via `GET /chat/:teamId/messages`. Frontend polls every 3 seconds for new messages.
- **Socket.IO broadcast:** When a message is sent via API, the backend also emits to the team's Socket.IO room (`team-{teamId}`) for instant delivery to connected clients.
- **Authorization:** Both REST and socket endpoints verify the user is either the team leader or an accepted member.
- **Message features:** Auto-linking of URLs, sender name display, timestamps, chat bubbles styled differently for sent vs. received.
- **Member display:** Team members are shown at the top of the chat with the leader highlighted.

**Technical Decisions:**
- Chose REST + polling as the primary mechanism (more reliable across network conditions) with Socket.IO as an enhancement for instant delivery.
- Messages are persisted to MongoDB (`ChatMessage` model) ensuring history survives page refreshes and reconnections.
- Limited to 200 messages per fetch to prevent memory issues on long conversations.

---

### Tier C Features (2 marks each)

#### 5. Anonymous Event Feedback
**Selection Justification:** Post-event feedback is essential for organizer improvement. Anonymous submission encourages honest reviews that might be suppressed if attributed.

**Design Choices & Implementation:**
- **Participant-side:** After attending an event (confirmed via QR scan), a feedback form appears on the event detail page with 1-5 star rating and optional text comments.
- **Organizer-side:** Event feedback page shows aggregated stats (average rating, total reviews, rating distribution bar chart), individual feedback entries (with ratings displayed as stars), and filter by rating level.
- **Anonymity:** The `user` field is excluded from API responses (`select('-user')`) when organizers fetch feedback, ensuring no identity leakage.
- **Attendance verification:** Only participants whose `registration.attended === true` can submit feedback, preventing spam from non-attendees.
- **Update support:** If a participant resubmits, their existing feedback is updated rather than duplicated.

**Technical Decisions:**
- Used MongoDB aggregation pipeline for computing average rating and distribution in a single query.
- Feedback is gated to `completed` or `closed` events only, preventing premature reviews.

---

## Additional Assignment Requirements Implemented

| Section | Feature | Implementation |
|---------|---------|---------------|
| 4.1 | IIIT email validation | Regex validates `@iiit.ac.in`, `@students.iiit.ac.in`, `@research.iiit.ac.in` (frontend + backend) |
| 4.2 | bcrypt + JWT + RBAC | Passwords hashed via pre-save hook; JWT in all protected routes; `ProtectedRoute` component with role checks |
| 4.3 | Session persistence | Token + user stored in localStorage; restored on mount; logout clears all |
| 5 | Onboarding flow | 2-step: select interests (Technical/Cultural/Sports/Other) → follow clubs → personalized event ordering |
| 7 | Merchandise events | Full purchase flow with stock management, per-user limits, size/color/variant tracking |
| 9.3 | Browse events | Search, type filter, eligibility filter, date range, followed clubs, trending banner, interest-based scoring |
| 9.5 | Email confirmations | Nodemailer sends ticket emails with embedded QR codes on registration and purchase |
| 9.6 | Profile page | Editable personal info, interest management, followed clubs display |
| 9.7 | Clubs listing | Follow/unfollow buttons with category badges |
| 10.2 | Organizer dashboard | Event listing with stats, registration counts, revenue tracking |
| 10.3 | Participant list | Searchable, filterable by attendance and institution; export to CSV |
| 10.4 | Event creation | Draft/publish workflow; custom form builder (text, textarea, dropdown, checkbox, file fields) |
| 10.5 | Discord webhook | Auto-posts to Discord channel when event is published |
| 11.1 | Admin creates organizers | Both login email and password are auto-generated from the club name (e.g. "Robotics Club" → `robotics.club@iiit.ac.in`); credentials shown to admin for sharing |
| 11.2 | Archive/delete organizers | Archive blocks login; delete cascades all associated data (events, registrations, teams, chats, feedback) |
| Auto | Event status reconciliation | Automatic status transitions (published → ongoing → completed) based on scheduled dates |
| Waitlist | Waitlist system | Join waitlist when full; notification when spot opens |

---

## Design Choices & Architecture

### Authentication Flow
- **Participants** self-register with email validation (IIIT domain enforced for IIIT students).
- **Organizers** are provisioned by Admin — no self-registration. Both login email and password are auto-generated from the club name (e.g. "Tech Club" → `tech.club@iiit.ac.in`) and shared manually by the admin.
- **Admin** is seeded by the backend on first startup via `scripts/seedAdmin.js`. Email and password configured via environment variables.
- **Login** redirects users to their role-specific dashboard. New participants (no interests) are redirected to onboarding first.
- **Blocked accounts** (archived by admin) cannot obtain new JWTs.

### Event Status Management
Events follow a lifecycle: `draft` → `published` → `ongoing` → `completed` → `closed`. The `reconcileEventStatus()` function automatically transitions events based on their start/end dates whenever they are queried, eliminating the need for cron jobs while still providing manual override.

### Role-Based Access
- Frontend: `ProtectedRoute` component wraps route groups, checking user role before rendering.
- Backend: `auth` middleware validates JWT; `authorize('role')` middleware checks permission per route.
- Organizers can only access their own events. Participants can only view published/ongoing events.

### Email Strategy
- **Development:** Uses Ethereal Email (fake SMTP), generating preview URLs for testing.
- **Production:** Configurable real SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` environment variables.
- Emails are sent asynchronously (non-blocking) with error handling that logs failures without crashing the server.

---

## Setup & Installation

### Prerequisites
- **Node.js** 18+ (recommended: 20 LTS)
- **MongoDB** — Atlas cluster or local instance
- **npm** 9+

### 1. Clone the Repository
```bash
git clone <repository-url>
cd assignment-1
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
# Required
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<your-secret-key>      # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Admin Account (seeded on first run)
ADMIN_EMAIL=admin@iiit.ac.in
ADMIN_PASSWORD=admin123

# Frontend URL (for email links)
CLIENT_URL=http://localhost:5173

# Optional: Real SMTP (omit for Ethereal test emails)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM="Felicity" <noreply@felicity.app>
```

Start the server:
```bash
npm run dev          # Development (with nodemon auto-restart)
# or
node index.js        # Production
```

The backend runs on `http://localhost:5001` by default.

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5001
```

Start the dev server:
```bash
npm run dev
```

The frontend runs on `http://localhost:3000` by default.

### 4. Seed Admin Account
The admin account is automatically seeded on first server startup using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables. You can also run it manually:
```bash
cd backend
node scripts/seedAdmin.js
```

### 5. Default Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@iiit.ac.in | admin123 |

Organizer and participant accounts are created through the platform.

---

## Deployment

### Backend (Render)
- **Service:** Web Service
- **Build Command:** `npm install`
- **Start Command:** `node index.js`
- **Environment Variables:** All `.env` variables listed above

### Frontend (Vercel)
- **Framework:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variable:** `VITE_API_URL` = backend URL

---

## Project Structure
```
assignment-1/
├── backend/
│   ├── models/              # Mongoose schemas
│   │   ├── User.js          # Participant, Organizer, Admin with roles
│   │   ├── Event.js         # Normal events + merchandise
│   │   ├── Registration.js  # Tickets, QR codes, attendance
│   │   ├── Team.js          # Hackathon teams with member tracking
│   │   ├── ChatMessage.js   # Team chat messages
│   │   ├── Feedback.js      # Anonymous event feedback
│   │   └── PasswordResetRequest.js
│   ├── routes/              # Express route handlers
│   │   ├── authRoutes.js    # Login, register, /me
│   │   ├── eventRoutes.js   # CRUD, register, purchase, waitlist, browse
│   │   ├── participantRoutes.js  # Profile, clubs, follow/unfollow
│   │   ├── organizerRoutes.js    # Dashboard, event management
│   │   ├── adminRoutes.js        # Organizer CRUD, cascade delete
│   │   ├── teamRoutes.js         # Create, accept, decline, register teams
│   │   ├── chatRoutes.js         # Send/fetch team messages
│   │   ├── attendanceRoutes.js   # Mark, list, CSV export
│   │   ├── feedbackRoutes.js     # Submit, aggregated view
│   │   └── passwordResetRoutes.js # Request, approve, reject
│   ├── middleware/
│   │   └── auth.js          # JWT verification + role authorization
│   ├── utils/
│   │   ├── email.js         # Nodemailer (Ethereal/SMTP)
│   │   ├── generateTicket.js # UUID ticket + QR code generation
│   │   └── discord.js       # Webhook notifications
│   ├── scripts/
│   │   └── seedAdmin.js     # Admin account seeder
│   └── index.js             # Server entry + Socket.IO setup
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   ├── BrowseEvents.jsx / EventDetail.jsx
│   │   │   ├── participant/   # Dashboard, Profile, MyTeams, TeamChat, Onboarding, ClubsListing
│   │   │   ├── organizer/     # Dashboard, CreateEvent, EditEvent, Profile, QRScanner, AttendanceList, EventFeedback, PasswordReset
│   │   │   └── admin/         # Dashboard (organizer management + password resets)
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Role-based navigation
│   │   │   ├── ProtectedRoute.jsx   # RBAC route guard
│   │   │   └── FeedbackForm.jsx     # Star rating + comment form
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT token management
│   │   └── api/
│   │       └── axios.js             # Axios instance with auth interceptor
│   └── index.html
├── README.md
└── deployment.txt
```
