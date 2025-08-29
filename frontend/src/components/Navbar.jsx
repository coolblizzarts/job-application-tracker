import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getValidToken, clearToken } from '../services/auth.js';

export default function Navbar() {
  const [authed, setAuthed] = useState(!!getValidToken());
  const navigate = useNavigate();
  const location = useLocation();

  function refresh() {
    setAuthed(!!getValidToken());
  }

  useEffect(() => {
    // clean any bad/expired token on first paint and route changes
    refresh();
    const onStorage = (e) => { if (e.key === 'token') refresh(); };
    const onFocus = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [location.pathname]);

  function logout() {
    clearToken();
    setAuthed(false);
    navigate('/login');
  }

  return (
    <div className="navbar">
      <div className="container row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontWeight:600}}>Job Tracker</div>
        <div className="row" style={{gap:16, alignItems:'center'}}>
          {authed && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/analytics">Analytics</Link>
              <Link to="/ai">AI Resume Match</Link>
            </>
          )}
          {authed ? (
            <button className="button" onClick={logout}>Logout</button>
          ) : (
            <Link to="/login" className="button">Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}
