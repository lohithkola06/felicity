# Felicity — Fest Event Management System

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT + bcrypt password hashing |
| Real-time | Socket.IO (team chat) |
| Email | Nodemailer |
| Feedback | Custom Anonymous System |
| QR Codes | qrcode library |

## Libraries & Justifications

| Library | Why |
|---------|-----|
| `express` | Lightweight, widely-used HTTP framework for RESTful APIs |
| `mongoose` | Schema-based MongoDB ODM with validation, hooks, and population |
| `jsonwebtoken` | Industry-standard stateless authentication via JWT |
| `bcrypt` | Secure password hashing with salting |
| `socket.io` | Bi-directional real-time communication for team chat |
| `nodemailer` | Email delivery for ticket confirmations and notifications |
| `qrcode` | Generate QR codes for event tickets and attendance tracking |
| `uuid` | Unique ticket ID generation |
| `cors` | Cross-origin resource sharing for frontend-backend communication |
| `react-router-dom` | Client-side routing with protected routes |
| `axios` | Promise-based HTTP client with interceptors for auth headers |

## Features & Assignment Requirements

### Tier A (8 marks each)
1. **Hackathon Team Registration** — Team creation, invitations, management dashboard, automatic ticket generation for team events.
2. **QR Scanner & Attendance Tracking** — Camera/file-based QR scanning, attendance marking, duplicate scan rejection, live dashboard, CSV export, manual override.

### Tier B (6 marks each)
1. **Organizer Password Reset Workflow** — Password reset requests handled by Admin, approval/rejection, auto-generated new password, reset history.
2. **Team Chat** — Real-time Socket.IO chat for hackathon teams, message history, online status indicators.

### Tier C (2 marks each)
1. **Anonymous Feedback System** — Allows attendees to submit anonymous ratings and comments for events they attended. Organizers see aggregated feedback. (Replaced reCAPTCHA protection).

### Additional Requirements Implemented
- **Browse Events (Sec 9.3)**: Full filtering UI with Search, Type, Eligibility, Date Range, "Followed Clubs", and "Trending" toggles.
- **User Profile (Sec 5 + 9.6)**: Management of user interests and followed clubs; "My Tickets" and "My Teams" view.
- **Form Builder (Sec 10.4)**: Dynamic registration forms. Organizers can add custom fields (Text, Checkbox, File, etc.) and toggle required/optional status.
- **Discord Integration (Sec 10.5)**: Automated webhook notifications posted to Discord when an event is published.
- **Dashboard Analytics (Sec 10.2)**: Organizer dashboard shows aggregate stats for registrations, revenue, and attendance.
- **Waitlist System (Sec 6.3 + 7)**: Automatic waitlist joining when events are full; notification on spot availability.
- **Strict Email Validation**: Enforced `@iiit.ac.in` domain requirement for Organizer and Admin accounts.
- **Event Archival (Sec 11.2)**: Admins can archive events/users instead of just deleting them.

## Design Choices

- **UI** - Simple, functional, and easy to use design.
- **Role-specific navigation** — each user role (Participant, Organizer, Admin) sees contextual nav items
- **Onboarding flow** — new participants select interests and follow clubs to personalize their experience
- **Dynamic form builder** — organizers create custom registration forms with text, textarea, dropdown, checkbox, and file upload fields
- **Status-based event editing** — Draft events are freely editable; Published events restrict edits to description, deadline, and capacity
- **Registration blocking** — automatic blocking by deadline, capacity, and eligibility requirements
- **Anonymous Feedback** — Implemented to encourage honest reviews while preserving attendee privacy.

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account or local MongoDB

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Fill in your environment variables
npm run dev
```

**Required `.env` variables:**
```
JWT_SECRET=your-secret
MONGODB_URI=mongodb+srv://...
CLIENT_URL=https://felicity-olive.vercel.app # URL where frontend is hosted
ADMIN_EMAIL=admin@felicity.iiit.ac.in
ADMIN_PASSWORD=admin123
```

### Frontend (Vercel)
1.  Import project to Vercel.
2.  Set Root Directory to `frontend`.
3.  Add Environment Variable:
    *   `VITE_API_URL` = `https://felicity-backend-xwx8.onrender.com`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

### Default Admin Account
The system seeds a default admin account on first run:
- Email: `admin@felicity.iiit.ac.in`
- Password: `admin123`

## Project Structure
```
assignment-1/
├── backend/
│   ├── models/          # Mongoose schemas (User, Event, Registration, Team, etc.)
│   ├── routes/          # Express route handlers
│   ├── middleware/       # Auth middleware
│   ├── utils/           # Email, QR, Discord utilities
│   └── index.js         # Server entry point
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components (Login, Register, Dashboards, etc.)
│   │   ├── components/  # Shared components (Navbar, ProtectedRoute)
│   │   ├── context/     # React Context (AuthContext)
│   │   └── api/         # Axios instance
│   └── index.html
├── README.md
└── deployment.txt
```
