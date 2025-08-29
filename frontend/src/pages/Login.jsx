import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register as signup } from '../services/api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // or 'register'
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      const fn = mode === 'login' ? login : signup;
      const { token } = await fn(email, password);
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (e) {
      setErr(String(e.message));
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:480, margin:'40px auto'}}>
        <h2 style={{marginTop:0}}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        {err && <div style={{color:'#f87171'}}>{err}</div>}
        <form onSubmit={submit}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="button" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
        </form>
        <div style={{marginTop:12}}>
          {mode === 'login' ? (
            <span>New here? <button className="button secondary" onClick={()=>setMode('register')}>Register</button></span>
          ) : (
            <span>Have an account? <button className="button secondary" onClick={()=>setMode('login')}>Login</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

// useState holds form fields and errors.
// mode toggles between login and register.
// On submit, call register or login. Save token to localStorage. Navigate to /dashboard
