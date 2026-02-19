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
| Bot Protection | Google reCAPTCHA v2 |
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

## Advanced Features Implemented

### Tier A (8 marks each)
1. **Hackathon Team Registration** — Team creation, invitations, management dashboard, automatic ticket generation for team events
2. **Merchandise Payment Approval Workflow** — Payment proof upload, pending approval state, organizer approval/rejection, stock management, QR and confirmation email
3. **QR Scanner & Attendance Tracking** — Camera/file-based QR scanning, attendance marking, duplicate scan rejection, live dashboard, CSV export, manual override

### Tier B (6 marks each)
1. **Organizer Password Reset Workflow** — Password reset requests handled by Admin, approval/rejection, auto-generated new password, reset history
2. **Team Chat** — Real-time Socket.IO chat for hackathon teams, message history, online status indicators

### Tier C (2 marks each)
1. **Bot Protection (reCAPTCHA v2)** — Google reCAPTCHA v2 checkbox on Login and Registration with server-side verification

## Design Choices

- **Retro 2010s UI** - Simple, functional, and nostalgic design (No glassmorphism).
- **Role-specific navigation** — each user role (Participant, Organizer, Admin) sees contextual nav items
- **Onboarding flow** — new participants select interests and follow clubs to personalize their experience
- **Dynamic form builder** — organizers create custom registration forms with text, textarea, dropdown, checkbox, and file upload fields
- **Status-based event editing** — Draft events are freely editable; Published events restrict edits to description, deadline, and capacity
- **Registration blocking** — automatic blocking by deadline, capacity, and eligibility requirements

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account or local MongoDB
- Google reCAPTCHA keys (test keys included for development)

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
RECAPTCHA_SECRET_KEY=6Lcfd3EsAAAAAOCfU9M0tz1lAr38hAeAK6YahN-S
CLIENT_URL=https://felicity-olive.vercel.app # URL where frontend is hosted
ADMIN_EMAIL=admin@felicity.iiit.ac.in
ADMIN_PASSWORD=admin123
```

### Frontend (Vercel)
1.  Import project to Vercel.
2.  Set Root Directory to `frontend`.
3.  Add Environment Variable:
    *   `VITE_API_URL` = `https://felicity-backend-xwx8.onrender.com`
    *   `VITE_RECAPTCHA_SITE_KEY` = `6Lcfd3EsAAAAABEdA5c_Wd4hYPX1EyFPI6m5iOX3`

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
│   ├── middleware/       # Auth & CAPTCHA middleware
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
