import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';
import ResumeMatch from './pages/ResumeMatch.jsx';

// Tiny guard: if no token in localStorage → send user to "/"
function RequireAuth({ children }) {
  if (!localStorage.getItem('token')) return <Navigate to="/" replace />;
  return children;
}

export default function App(){
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
        <Route path="/ai" element={<RequireAuth><ResumeMatch /></RequireAuth>} />
      </Routes>
    </>
  );
}

// Routes/Route map URLs to components.

// RequireAuth checks for a JWT token; if missing, redirects to Login.

// Navbar shows on all pages (placed outside the routes).