// backend/src/routes/ai.js
// ------------------------------------------------------------------
// POST /api/ai/score → similarity score (PDF or text) + clean keywords
// - Canonicalizes degrees (BS/BSc/BE → bachelor; MS/MSc/MTech → master; PhD/Doctorate → phd)
// - Lemmatizes plurals/possessives
// - Strips trailing punctuation from tokens (inc., co-design. → inc, co-design)
// - Drops noisy 2-letter tokens except a small whitelist (ai/ml/ui/ux/go)
// - Auto-suppresses company names found in JD (e.g., "Annapurna Labs Inc." → stop "annapurna")
// ------------------------------------------------------------------

import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ---- config via env ----
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_EMBED_MODEL =
  process.env.HUGGINGFACE_EMBED_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

// ---- file upload config ----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 } // 4MB
});

// -------------------- helpers ---------------------

// Detect likely company tokens from the *raw* JD before lowercasing.
// Example matches: "Annapurna Labs Inc.", "ACME Corp", "Foo GmbH", "Bar PLC"
function detectCompanyTokens(raw) {
  const s = String(raw || '');
  const names = new Set();
  const rx =
    /\b([A-Z][A-Za-z0-9&.\-]{2,})\s+(Labs?|Lab|Inc\.?|LLC|Ltd\.?|Corporation|Corp\.?|GmbH|PLC|Pte\.?|LLP)\b/g;
  let m;
  while ((m = rx.exec(s))) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

// 1) Normalize text: lowercase, unify common degree phrases to canonical tokens
function normalizeText(s) {
  let t = String(s || '').toLowerCase();

  // remove parens that break abbreviations
  t = t.replace(/[()]/g, ' ');

  // Canonicalize PhD / Doctorate
  t = t
    .replace(/\bph\.?\s*d\b/g, ' phd ')
    .replace(/\bdoctorate\b/g, ' phd ')
    .replace(/\bdoctoral\b/g, ' phd ');

  // Canonicalize Bachelor variants
  t = t
    .replace(/\bbachelor'?s\b/g, ' bachelor ')
    .replace(/\bbachelors\b/g, ' bachelor ')
    .replace(/\bbachelor of (science|engineering|technology|arts)\b/g, ' bachelor ')
    .replace(/\bbs\.?\b/g, ' bachelor ')
    .replace(/\bbsc\b/g, ' bachelor ')
    .replace(/\bbe\b/g, ' bachelor ')
    .replace(/\bb\.?\s*tech\b/g, ' bachelor ')
    .replace(/\bbtech\b/g, ' bachelor ');

  // Canonicalize Master variants
  t = t
    .replace(/\bmaster'?s\b/g, ' master ')
    .replace(/\bmasters\b/g, ' master ')
    .replace(/\bmaster of (science|engineering|technology|arts)\b/g, ' master ')
    .replace(/\bms\b/g, ' master ')
    .replace(/\bm\.?\s*s\.?\b/g, ' master ')
    .replace(/\bmsc\b/g, ' master ')
    .replace(/\bm\.?\s*tech\b/g, ' master ')
    .replace(/\bmtech\b/g, ' master ');

  // compact
  t = t
    .replace(/['’]s\b/g, 's')               // possessives
    .replace(/[^a-z0-9+\-_.\s]/g, ' ')      // keep word-ish chars
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

// 2) Stopwords: include prepositions/pronouns + boilerplate + legal suffixes, IDs, etc.
const STOP = new Set([
  // articles/aux
  'the','a','an','and','or','if','then','than','is','am','are','was','were','be','been','being',
  // prepositions
  'in','to','of','on','at','by','as','for','from','with','into','onto','over','under','within',
  'without','between','among','through','throughout','across','about','via','per',
  // pronouns/determiners
  'i','me','my','we','our','ours','you','your','yours','they','their','theirs',
  'it','its','this','that','these','those',
  // boilerplate/HR/legal
  'etc','using','use','job','role','position','team','based','related','field','fields',
  'experience','years','description','responsibilities','requirements','preferred','minimum',
  'posting','apply','req','requisition','id','jobid','ref',
  'company','inc','llc','ltd','corp','corporation','co','gmbh','plc','pte','llp',
  'us','u.s','u.s.','usa',
  // generic fluff
  'strong','exceptional','excellent','ability','abilities','communicate','communication','effectively',
  'familiar','familiarity','knowledge','skills','skill','objective','objectives','plus','good','great',
  'must','build','work','tools','technology','technologies','environment',
  // previously added
  'analytical','probability','statistic','statistics','complex','highly','technical','collaborative',
  'collaboration','intellectual','curiosity','passion','solving','challenging','problem','problems',
  // company-like tokens often seen in names
  'labs','lab'
]);

// 3) Words we should NOT singularize
const DONT_SINGULARIZE = new Set([
  // cloud / services
  'aws','gcp','azure','s3','ec2','eks','ecs','rds','kms','sns','sqs','iam','route53','cloudwatch','cloudformation',
  'gcs','bigquery','dataproc','dataflow','pubsub','vertexai','cloudrun',
  // db / warehouse / search
  'postgres','postgresql','mysql','sqlite','mariadb','sqlserver','dynamodb','mongodb','cassandra','neo4j','couchbase',
  'hbase','clickhouse','timescaledb','influxdb','snowflake','redshift','elasticsearch','opensearch',
  // streaming / data eng
  'kafka','kinesis','pulsar','zookeeper','spark','flink','beam','hive','presto','trino','dbt','airbyte','fivetran',
  'iceberg','delta','delta-lake',
  // ml / ds
  'python','pandas','numpy','scipy','sklearn','scikit-learn','matplotlib','seaborn','pytorch','tensorflow','keras',
  'xgboost','lightgbm','catboost','spacy','nltk','transformers','huggingface','onnx','mlflow','kubeflow','sagemaker',
  // services / obs
  'prometheus','grafana','opentelemetry','jaeger',
  // web / fe / be
  'nodejs','express','nestjs','nextjs','react','angular','vue','svelte','axios','chartjs','tailwindcss','webpack',
  // apis / protocols
  'graphql','rest','grpc','websockets','microservices','k8s',
  // devops / platforms
  'devops','jenkins','gitlab','github','bitbucket','circleci','docker','kubernetes',
  // misc / already present
  'redis','analytics','physics','metrics','hadoop','airflow','h1b'
]);

// tiny lemmatizer
function toLemma(w) {
  let s = w.replace(/'s$/, '');
  if (DONT_SINGULARIZE.has(s)) return s;
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('ses') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('xes') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('es')  && s.length > 3) return s.slice(0, -2);
  if (s.endsWith('s')   && s.length > 3) return s.slice(0, -1);
  return s;
}

const ALLOW_TWO = new Set(['ai','ml','ui','ux','go']); // keep these short tokens

// Tokenize to lemmas, with extra per-request stopwords + force-keep set if needed
function tokenizeToLemmas(text, opts = {}) {
  const { extraStop = new Set(), forceKeep = new Set() } = opts;
  const cleaned = normalizeText(text);
  const rawTokens = cleaned.match(/[a-z][a-z0-9+\-_.]{1,}/g) || [];

  const out = [];
  for (let t of rawTokens) {
    // strip leading/trailing dot/underscore/hyphen (inc. -> inc, co-design. -> co-design)
    t = t.replace(/^[._-]+|[._-]+$/g, '');

    // 2-letter filter (except allow-list)
    if (t.length === 2 && !ALLOW_TWO.has(t)) continue;

    // baseline stop + per-request stop
    if ((STOP.has(t) || extraStop.has(t)) && !forceKeep.has(t)) continue;

    // final degree mapping
    if (t === 'bs' || t === 'bsc' || t === 'be' || t === 'btech') t = 'bachelor';
    if (t === 'ms' || t === 'msc' || t === 'mtech') t = 'master';
    if (t === 'phd' || t === 'doctoral' || t === 'doctorate') t = 'phd';

    const l = toLemma(t);
    if ((STOP.has(l) || extraStop.has(l)) && !forceKeep.has(l)) continue;
    out.push(l);
  }
  return out;
}

const freq = (arr) => arr.reduce((m,w)=>(m[w]=(m[w]||0)+1,m),{});
const topN = (m, n) => Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>k);

// ------------------------------------------------------------------
// POST /api/ai/score
// body: multipart (resume PDF + jobText) OR JSON { resumeText, jobText }
// ------------------------------------------------------------------
router.post('/score', requireAuth, upload.single('resume'), async (req, res) => {
  try {
    // ---- 1) Collect inputs (PDF or JSON) ----
    let resumeText = '';
    let jobText = '';

    if (req.is('multipart/form-data')) {
      jobText = (req.body.jobText || '').trim();
      if (req.file) {
        // dynamic import avoids pdf-parse test-file bug in some versions
        let pdfParse;
        try {
          ({ default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js'));
        } catch (e) {
          return res.status(500).json({ error: 'PDF parser unavailable', detail: String(e) });
        }
        const pdf = await pdfParse(req.file.buffer);
        resumeText = (pdf.text || '').trim();
      }
    } else {
      resumeText = (req.body.resumeText || '').trim();
      jobText = (req.body.jobText || '').trim();
    }

    if (!resumeText) return res.status(400).json({ error: 'Missing resume (PDF or resumeText)' });
    if (!jobText)    return res.status(400).json({ error: 'Missing jobText' });

    // Limit lengths
    resumeText = resumeText.slice(0, 12000);
    jobText    = jobText.slice(0, 6000);

    // Per-request company stopwords from raw JD (before lowercasing/normalizing)
    const companyStops = detectCompanyTokens(req.body.jobText || jobText);

    // ---- 2) Embedding similarity (HF Inference) ----
    if (!HF_API_KEY) return res.status(500).json({ error: 'Server missing HUGGINGFACE_API_KEY' });

    const simResp = await fetch(`https://api-inference.huggingface.co/models/${HF_EMBED_MODEL}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: { source_sentence: resumeText, sentences: [jobText] } })
    });

    if (!simResp.ok) {
      return res.status(502).json({ error: 'HF similarity failed', status: simResp.status, body: await simResp.text() });
    }

    const simArr = await simResp.json();               // e.g., [0.83]
    const sim = Array.isArray(simArr) ? Number(simArr[0]) : NaN;
    const score = Number.isFinite(sim) ? Math.round(sim * 100) : 0;

    // ---- 3) Keywords (JD uses per-request company stoplist) ----
    const rTok = tokenizeToLemmas(resumeText);                                   // resume lemmas
    const jTok = tokenizeToLemmas(jobText, { extraStop: companyStops });         // JD lemmas sans company names

    const rTop = new Set(topN(freq(rTok), 150));
    const jTopArr = topN(freq(jTok), 150);
    const jTop = new Set(jTopArr);

    const usedKeywords = jTopArr.filter(w => rTop.has(w)).slice(0, 25);
    const missingKeywords = jTopArr.filter(w => !rTop.has(w)).slice(0, 25);

    const overlapPct = jTop.size ? Math.round((usedKeywords.length / jTop.size) * 100) : 0;

    res.json({ score, overlapPct, usedKeywords, missingKeywords });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

export default router;
