import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * body: { email, password }
 * result: { token }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    // Hash password before storing
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id',
      [email, hash]
    );

    // Create JWT token the client will store (e.g., localStorage)
    const uid = rows[0].id;
    const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    // friendly 409 if email is already used
    if (String(err.message).includes('unique')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 * result: { token }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // find the user
    const { rows } = await db.query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    // compare the password
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const uid = rows[0].id;
    const token = jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
