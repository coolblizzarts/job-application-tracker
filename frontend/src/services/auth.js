// frontend/src/services/auth.js
// Robust, shared helpers for token handling.

function base64UrlDecode(s) {
    try {
      const norm = s.replace(/-/g, '+').replace(/_/g, '/');
      const pad = '==='.slice((norm.length + 3) % 4);
      return atob(norm + pad);
    } catch { return null; }
  }
  
  export function readToken() {
    const t = localStorage.getItem('token');
    if (!t || typeof t !== 'string') return null;
    // must be JWT-like: three base64url parts
    if (!/^[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?$/.test(t)) return null;
    return t;
  }
  
  export function decodePayload(t) {
    const parts = t.split('.');
    if (parts.length !== 3) return null;
    const json = base64UrlDecode(parts[1]);
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }
  
  export function isTokenValid(t) {
    const p = decodePayload(t);
    // require a real exp and it must be in the future
    if (!p || typeof p.exp !== 'number') return false;
    return (Date.now() / 1000) < p.exp;
  }
  
  export function getValidToken() {
    const t = readToken();
    if (!t) return null;
    if (!isTokenValid(t)) { localStorage.removeItem('token'); return null; }
    return t;
  }
  
  export function setToken(t) {
    if (typeof t === 'string' && t.length > 10) localStorage.setItem('token', t);
  }
  
  export function clearToken() {
    localStorage.removeItem('token');
  }
  