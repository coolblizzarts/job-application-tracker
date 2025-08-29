// frontend/src/services/api.js
// Central place for frontend→backend calls.
import { getValidToken, setToken } from './auth.js';  // add this import

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function authHeader() {
  const t = getValidToken();           // was localStorage.getItem('token')
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

// --- Auth ---
export async function register(email, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Register failed');
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

// --- Applications CRUD ---
export async function listApps() {
  const res = await fetch(`${API_URL}/api/apps`, { headers: authHeader() });
  if (!res.ok) throw new Error('List failed');
  return res.json();
}

export async function createApp(payload) {
  const res = await fetch(`${API_URL}/api/apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Create failed');
  return res.json();
}

export async function updateApp(id, payload) {
  const res = await fetch(`${API_URL}/api/apps/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function removeApp(id) {
  const res = await fetch(`${API_URL}/api/apps/${id}`, {
    method: 'DELETE', headers: authHeader()
  });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

// --- Analytics + H1B ---
export async function getStats() {
  const res = await fetch(`${API_URL}/api/stats`, { headers: authHeader() });
  if (!res.ok) throw new Error('Stats failed');
  return res.json();
}

export async function h1b(company) {
  const res = await fetch(`${API_URL}/api/enrich/h1b?company=${encodeURIComponent(company)}`, {
    headers: authHeader()
  });
  if (!res.ok) throw new Error('H1B lookup failed');
  return res.json();
}

// --- AI: Resume match scoring ---
export async function scoreResume(fileOrText, jobText) {
  const headers = authHeader();
  if (fileOrText instanceof File) {
    const fd = new FormData();
    fd.append('resume', fileOrText);
    fd.append('jobText', jobText);
    const r = await fetch(`${API_URL}/api/ai/score`, { method: 'POST', headers, body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  } else {
    const r = await fetch(`${API_URL}/api/ai/score`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: String(fileOrText||''), jobText })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
}
