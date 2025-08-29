import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import db, { migrate } from './db.js';

// Route modules (keeps things modular and easy to extend)
import authRoutes from './routes/auth.js';
import appRoutes from './routes/apps.js';
import statsRoutes from './routes/stats.js';
import enrich from './routes/enrich.js';
import ai from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// Allow your frontend to call this API
app.use(cors({ origin: ORIGIN, credentials: false }));

// Parse JSON request bodies
app.use(express.json());

// Log requests in the console
app.use(morgan('dev'));

// Health endpoint (for quick checks)
app.get('/health', (req, res) => res.json({ ok: true }));

// Mount routes under /api/*
app.use('/api/auth', authRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/enrich', enrich);
app.use('/api/ai', ai);

// Start the server after ensuring DB tables exist
migrate()
  .then(() => app.listen(PORT, () => console.log(`API listening on ${PORT}`)))
  .catch(err => { console.error('Failed to migrate', err); process.exit(1); });
