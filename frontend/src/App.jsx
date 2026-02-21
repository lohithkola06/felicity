import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import BrowseEvents from './pages/BrowseEvents';
import EventDetail from './pages/EventDetail';

// Participant
import ParticipantDashboard from './pages/participant/Dashboard';
import ParticipantProfile from './pages/participant/Profile';
import MyTeams from './pages/participant/MyTeams';
import TeamChat from './pages/participant/TeamChat';
import Onboarding from './pages/participant/Onboarding';
import ClubsListing from './pages/participant/ClubsListing';
import ClubDetail from './pages/participant/ClubDetail';

// Organizer
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import EditEvent from './pages/organizer/EditEvent';
import OrgEventDetail from './pages/organizer/EventDetail';
import OrgProfile from './pages/organizer/Profile';
import QRScanner from './pages/organizer/QRScanner';
import AttendanceList from './pages/organizer/AttendanceList';
import EventFeedback from './pages/organizer/EventFeedback';
import PasswordReset from './pages/organizer/PasswordReset';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminClubsOrganizers from './pages/admin/ClubsOrganizers';

import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  // If a specific role is required, check it. Otherwise any authenticated user is allowed.
  if (role && user.role !== role) {
    // redirect to their dashboard
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'organizer' ? '/organizer/dashboard' : '/dashboard'} />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/events" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<ProtectedRoute><BrowseEvents /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
          <Route path="/clubs" element={<ProtectedRoute><ClubsListing /></ProtectedRoute>} />
          <Route path="/clubs/:id" element={<ProtectedRoute><ClubDetail /></ProtectedRoute>} />

          {/* Participant Routes */}
          <Route path="/dashboard" element={<ProtectedRoute role="participant"><ParticipantDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="participant"><ParticipantProfile /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute role="participant"><Onboarding /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute role="participant"><MyTeams /></ProtectedRoute>} />
          <Route path="/teams/:teamId/chat" element={<ProtectedRoute role="participant"><TeamChat /></ProtectedRoute>} />

          {/* Organizer Routes */}
          <Route path="/organizer/dashboard" element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>} />
          <Route path="/organizer/events" element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>} />
          <Route path="/organizer/events/new" element={<ProtectedRoute role="organizer"><CreateEvent /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/edit" element={<ProtectedRoute role="organizer"><EditEvent /></ProtectedRoute>} />
          <Route path="/organizer/events/:id" element={<ProtectedRoute role="organizer"><OrgEventDetail /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/attendance" element={<ProtectedRoute role="organizer"><AttendanceList /></ProtectedRoute>} />
          <Route path="/organizer/events/:id/feedback" element={<ProtectedRoute role="organizer"><EventFeedback /></ProtectedRoute>} />
          <Route path="/organizer/profile" element={<ProtectedRoute role="organizer"><OrgProfile /></ProtectedRoute>} />
          <Route path="/organizer/scan" element={<ProtectedRoute role="organizer"><QRScanner /></ProtectedRoute>} />
          <Route path="/organizer/password-reset" element={<ProtectedRoute role="organizer"><PasswordReset /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          {/* Admin: Clubs & Organizers view */}
          <Route path="/admin/clubs" element={<ProtectedRoute role="admin"><AdminClubsOrganizers /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
