import jwt from 'jsonwebtoken';

// Reads Authorization: Bearer <token> and sets req.user if valid
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.uid }; // save user id for downstream handlers
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
