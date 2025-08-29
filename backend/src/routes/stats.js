import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/stats
 * - Status distribution (counts by status)
 * - Applications per week (last ~10 weeks)
 */
router.get('/', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const [statusAgg, weekly] = await Promise.all([
    db.query(`
      SELECT status, COUNT(*) AS count
      FROM applications
      WHERE user_id=$1
      GROUP BY status
      ORDER BY count DESC
    `, [uid]),
    db.query(`
      SELECT to_char(date_trunc('week', applied_on), 'YYYY-"W"IW') AS week,
             COUNT(*) AS count
      FROM applications
      WHERE user_id=$1
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 10
    `, [uid])
  ]);

  res.json({ status: statusAgg.rows, weekly: weekly.rows.reverse() });
});

export default router;
