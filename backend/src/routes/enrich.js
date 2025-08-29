// backend/src/routes/enrich.js
// -------------------------------------------------------------
// H-1B sponsor stats from official USCIS CSV (FY 2023).
// We download the CSV, filter by employer name (case-insensitive),
// and compute approval rate = approvals / (approvals + denials).
// -------------------------------------------------------------

import express from 'express';
import { parse } from 'csv-parse/sync'; // sync parser for simplicity

const router = express.Router();

// You can expand to multiple years later; keep one for today's MVP.
const CSV_URL_2023 = 'https://www.uscis.gov/sites/default/files/document/data/h1b_datahubexport-2023.csv';

router.get('/h1b', async (req, res) => {
  const company = String(req.query.company || '').trim();
  if (!company) return res.status(400).json({ error: 'company query is required' });

  try {
    // 1) Fetch CSV text
    const r = await fetch(CSV_URL_2023);
    if (!r.ok) return res.status(502).json({ error: 'USCIS CSV fetch failed', status: r.status });
    const csvText = await r.text();

    // 2) Parse CSV into records (array of objects keyed by header)
    const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    // 3) Case-insensitive match on Employer column
    const norm = s => String(s || '').toLowerCase();
    const needle = norm(company);
    const matches = rows.filter(row => norm(row.Employer).includes(needle)).slice(0, 50);

    if (!matches.length) {
      return res.json({ company, fiscalYear: 2023, approvals: 0, denials: 0, sponsorRate: null, examples: [] });
    }

    // 4) Sum approvals/denials across all rows (employer may appear more than once)
    let approvals = 0, denials = 0;
    const examples = [];
    for (const row of matches) {
      const ia = Number(row['Initial Approval'] || 0);
      const id = Number(row['Initial Denial'] || 0);
      const ca = Number(row['Continuing Approval'] || 0);
      const cd = Number(row['Continuing Denial'] || 0);
      approvals += ia + ca;
      denials   += id + cd;

      if (examples.length < 5) {
        examples.push({
          employer: row.Employer,
          state: row.State,
          city: row.City,
          initialApproval: ia,
          continuingApproval: ca,
          initialDenial: id,
          continuingDenial: cd
        });
      }
    }

    const total = approvals + denials;
    const sponsorRate = total ? +(approvals / total).toFixed(3) : null; // e.g., 0.873

    res.json({ company, fiscalYear: 2023, approvals, denials, sponsorRate, examples });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

export default router;