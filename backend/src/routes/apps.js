import express from 'express';
import db from '../db.js';
import { sanitizeStatus } from '../util/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/apps
 * Lists the current user's applications (most recent first)
 */
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM applications WHERE user_id=$1 ORDER BY applied_on DESC, id DESC',
    [req.user.id]
  );
  res.json(rows);
});

/**
 * POST /api/apps
 * Create a new application
 * body: { company, role, location, status, source, applied_on, job_url, salary, notes }
 */
router.post('/', requireAuth, async (req, res) => {
  const {
    company, role, location, status, source,
    applied_on, job_url, salary, notes
  } = req.body;

  if (!company) return res.status(400).json({ error: 'company is required' });

  const s = sanitizeStatus(status);

  const sql = `
    INSERT INTO applications
      (user_id, company, role, location, status, source, applied_on, job_url, salary, notes)
    VALUES
      ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9, $10)
    RETURNING *;
  `;
  const params = [
    req.user.id, company, role, location, s, source,
    applied_on, job_url, salary, notes
  ];

  const { rows } = await db.query(sql, params);
  res.status(201).json(rows[0]);
});

/**
 * PUT /api/apps/:id
 * Update selected fields on an application
 */
router.put('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const allowed = ['company','role','location','status','source','applied_on','job_url','salary','notes'];
  const data = { ...req.body };
  if (data.status) data.status = sanitizeStatus(data.status);

  // Build a dynamic UPDATE (only update provided fields)
  const sets = [];
  const values = [];
  let i = 1;

  for (const f of allowed) {
    if (f in data) {
      // Special case: applied_on should be DATE; if null/empty, keep existing value
      if (f === 'applied_on') {
        sets.push(`applied_on = COALESCE($${i}::date, applied_on)`);
      } else {
        sets.push(`${f} = $${i}`);
      }
      values.push(data[f]);
      i++;
    }
  }

  if (!sets.length) return res.status(400).json({ error: 'No updatable fields provided' });

  // Add WHERE params (user + id) after the field values
  values.push(req.user.id); // will be $i
  values.push(id);          // will be $(i+1)

  const q = `
    UPDATE applications
    SET ${sets.join(', ')}, updated_at = NOW()
    WHERE user_id = $${i} AND id = $${i + 1}
    RETURNING *;
  `;

  const { rows } = await db.query(q, values);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

/**
 * DELETE /api/apps/:id
 * Delete an application
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await db.query(
    'DELETE FROM applications WHERE user_id=$1 AND id=$2',
    [req.user.id, id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
