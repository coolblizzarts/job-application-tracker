# Job Application Tracker

A full‑stack, containerized web app to track job applications with **JWT auth**, **PostgreSQL** persistence, lightweight **analytics**, and an **AI Resume ↔ JD Match** feature powered by transformer embeddings. Built to be **beginner‑friendly**, deployable on the **AWS free tier**, and easy to extend.

---

## ✨ Features
- **Authentication (JWT)**: Register/Login with hashed passwords and signed tokens.
- **Applications CRUD**: Add, view, edit (inline), quick status changes, delete.
- **Status & Date Filters**: Filter by status; store `applied_on` dates.
- **Analytics**: Status distribution (pie), applications per week (bar), summary counts.
- **H1B Enrichment (stub)**: Example company lookup endpoint (swap in real source later).
- **AI Resume Match**:
  - PDF/text ingestion; Hugging Face **MiniLM** embeddings for semantic match score (0–100).
  - Keyword analysis with normalization/lemmatization and smart stopwords.
- **Adminer**: 1‑click DB UI for Postgres (handy for learning & debugging).
- **Dockerized**: `docker compose up --build` to run everything.
- **Clean structure & comments**: Easy to add more endpoints/pages later.

> ⚠️ The Resume Match feature is intentionally simple and free‑tier friendly. See **Future Scope** for ideas to improve it.

---

## 🏗️ Tech Stack
**Frontend**: React + Vite, Fetch API, simple CSS (dark theme)

**Backend**: Node.js, Express.js, JWT (jsonwebtoken), bcryptjs, pg (Pool), morgan, multer

**Database**: PostgreSQL 16

**AI / NLP**: Hugging Face Inference API — `sentence-transformers/all-MiniLM-L6-v2` (semantic similarity)

**Containerization**: Docker, Docker Compose

**Optional**: Adminer (DB GUI). Kafka/Spark are deliberately *not* included in the MVP, but the codebase is modular if you add them later.

---

## 📁 Project Structure
```

job-application-tracker/
├─ docker-compose.yml
├─ .gitignore
├─ README.md
├─ backend/
│  ├─ Dockerfile
│  ├─ .env            # NOT committed (use .env.example)
│  ├─ .env.example
│  └─ src/
│     ├─ server.js
│     ├─ db.js
│     ├─ middleware/
│     │  └─ auth.js
│     ├─ util/
│     │  └─ validate.js
│     └─ routes/
│        ├─ auth.js
│        ├─ apps.js
│        ├─ stats.js
│        ├─ enrich.js
│        └─ ai.js
├─ frontend/
│  ├─ .env            # NOT committed (use .env.example)
│  ├─ .env.example
│  └─ src/
│     ├─ main.jsx
│     ├─ App.jsx
│     ├─ index.css
│     ├─ components/
│     │  └─ Navbar.jsx
│     ├─ pages/
│     │  ├─ Login.jsx
│     │  ├─ Dashboard.jsx
│     │  ├─ Analytics.jsx
│     │  └─ ResumeMatch.jsx
│     └─ services/
│        ├─ api.js
│        └─ auth.js
└─ docs/ (optional)

````

---

## 🪪 Environment Variables
Create real `.env` files from the provided examples and **never commit** the real ones.

### `backend/.env.example`
```env
PORT=8080
JWT_SECRET=change_me_in_prod

PGHOST=db
PGPORT=5432
PGDATABASE=jobs
PGUSER=postgres
PGPASSWORD=postgres

FRONTEND_ORIGIN=http://localhost:5173

# Hugging Face (optional for AI features)
HUGGINGFACE_API_KEY=hf_xxx_your_key_here
HUGGINGFACE_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
````

### `frontend/.env.example`

```env
VITE_API_URL=http://localhost:8080
```

---

## 🚀 Quick Start (Docker – recommended)

```bash
# 1) Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2) From project root, build & run all services
docker compose up --build
# Services:
# - API:      http://localhost:8080
# - Frontend: http://localhost:5173
# - Adminer:  http://localhost:8081 (System: PostgreSQL; Server: db; User: postgres; Pass: postgres)
```

### First‑time setup hints

* Register a user in the app, then login. Your JWT is stored client‑side and used for API calls.
* Open **Adminer** to inspect the `users` and `applications` tables.

---

## 🧑‍💻 Local Dev (hot reload)

Run API & DB with Docker, but dev the frontend with Vite hot reload.

```bash
# Terminal A (API + DB + Adminer)
docker compose up --build

# Terminal B (Frontend)
cd frontend
npm install
npm run dev
# Frontend dev server at http://localhost:5173
```

> If CORS is an issue, ensure `FRONTEND_ORIGIN` in `backend/.env` matches the actual dev URL.

---

## 🔐 Auth Flow (JWT)

* `POST /api/auth/register` → creates user (bcrypt hash) → returns JWT `{ token }` (7d expiry by default).
* `POST /api/auth/login`    → verifies credentials → returns JWT `{ token }`.
* Frontend stores the token and sends `Authorization: Bearer <token>` on protected routes.
* Middleware `requireAuth` verifies/decodes the token and attaches `req.user.id`.

---

## 📚 API Reference (selected)

All protected endpoints require `Authorization: Bearer <token>`.

### Health

```http
GET /health → { ok: true }
```

### Auth

```http
POST /api/auth/register  { email, password } → { token }
POST /api/auth/login     { email, password } → { token }
```

### Applications

```http
GET    /api/apps                             → list current user's applications
POST   /api/apps          { company, role?, location?, status?, source?, applied_on?, job_url?, salary?, notes? } → created row
PUT    /api/apps/:id      { any of the above } → updated row
DELETE /api/apps/:id                          → { ok: true }
```

**Status values**: `Wishlist | Applied | OA | Phone | Onsite | Offer | Rejected`

### Analytics

```http
GET /api/stats → {
  by_status: { Applied: n, ... },
  per_week: [{ week: YYYY-Www, count: n }, ...]
}
```

### H1B (sample enrichment)

```http
GET /api/enrich/h1b?company=Amazon → { company, sponsorRate }
```

(Logic is stubbed for demo; swap in a real dataset/API if you have one.)

### AI Resume Match

```http
POST /api/ai/score (multipart)
  - fields: jobText
  - file:   resume (application/pdf)

POST /api/ai/score (json)
  { resumeText, jobText }

→ { score, overlapPct, usedKeywords[], missingKeywords[] }
```

* **Score**: 0–100 semantic similarity (MiniLM embeddings).
* **Keywords**: token analysis with normalization/canonicalization and noise filters.

---

## 🖥️ Frontend

* **Login** page: forms + JWT storage; Navbar shows Login/Logout correctly using strict token checks.
* **Dashboard**:

  * Expandable **Add Application** form (all backend fields).
  * Wider, responsive **table** with inline **Edit** per row and quick **status** buttons.
* **Analytics**: pie + bar charts; filters.
* **AI Resume Match**: two large, labeled textareas (Resume & JD), optional PDF upload, result cards.

---

## 🗃️ Database

Tables are created on API boot (`migrate()`):

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'Applied',
  source TEXT,
  applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
  job_url TEXT,
  salary INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_apps_user       ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_status     ON applications(status);
CREATE INDEX IF NOT EXISTS idx_apps_applied_on ON applications(applied_on);
```

---

## 🧠 AI / NLP Notes

* Uses HF Inference API for embeddings: `sentence-transformers/all-MiniLM-L6-v2`.
* PDF → text via `pdf-parse` (lazy‑imported to avoid container startup bug).
* Keyword pipeline: normalization (degree canonicalization) → tokenization → lemmatization → stopwords → frequency.
* No LLM fine‑tuning; everything is free‑tier friendly and stateless.

**Limitations**: A JD heavy on degrees/boilerplate can show high keyword overlap but modest semantic score. This is expected (tokens vs meaning).

---

## 🧾 Instruction Card — How It’s Containerized

* **`docker-compose.yml`** defines 3 services:

  * `db`: Postgres 16 (+ volume `db_data` for persistence)
  * `adminer`: DB UI on port 8081
  * `api`: Node/Express container that builds from `backend/Dockerfile`
* **Network**: services share a default bridge network; API reaches DB via hostname `db`.
* **Env**: backend reads `backend/.env`; compose passes it with `env_file`.
* **Frontend**: run via Vite dev server (local) or containerize separately if desired.

Common commands:

```bash
docker compose up --build         # build images and start
docker compose logs -f api        # tail API logs
docker compose exec db psql -U postgres -d jobs   # psql shell
```

---

## 🧭 Deployment (AWS Free Tier – simple path)

**Goal**: One small EC2 instance (e.g., t2.micro) running Docker Compose.

1. **Provision EC2** (Amazon Linux 2/Ubuntu), allow inbound 80/443 (HTTP/HTTPS) and needed dev ports (optional) in security group.
2. **Install Docker & Compose** on the instance.
3. **Clone your repo** onto the instance.
4. **Create env files** (`backend/.env`, `frontend/.env`) on the instance with production values (new `JWT_SECRET`).
5. **Run** `docker compose up -d --build`.
6. **Reverse proxy (optional)**: put Nginx/ALB in front to serve frontend on 80/443 and proxy to API. Or host the frontend statically (S3+CloudFront) and keep API on EC2.

> For a quick demo, open EC2 public IP:
>
> * Frontend: `http://<EC2_IP>:5173`
> * API: `http://<EC2_IP>:8080`
> * Adminer: `http://<EC2_IP>:8081`
>
> For production, prefer a domain + HTTPS and hide Adminer.

---

## 🧩 Troubleshooting

* **API won’t start**: run `docker compose logs api`. If `pdf-parse` import error, ensure the lazy import path matches: `pdf-parse/lib/pdf-parse.js`.
* **DB connection refused**: ensure `PGHOST=db` and compose service is named `db`. Recreate containers.
* **CORS errors**: set `FRONTEND_ORIGIN` in `backend/.env` to your actual frontend origin.
* **Navbar shows Logout when logged out**: clear stale `localStorage.token`; frontend uses strict token checks in `services/auth.js`.
* **.env leaked**: make sure `.gitignore` includes `*.env` and remove any cached files: `git rm --cached backend/.env frontend/.env`.

---

## 🔭 Future Scope

* **Resume Match**

  * Blend semantic score with skill‑only overlap; chunk sentences & average top‑k similarities.
  * Add an **LLM grader** (with small context windows) for qualitative feedback; keep costs low.
  * Use a real H1B dataset/API and employer insights.
* **Features**

  * Attachments (offer letters/interview notes), reminders, email parsing.
  * Multi‑tenancy & team sharing; tags/labels.
  * Role‑specific dashboards (SDE/ML/DS) with curated skill dictionaries.
* **Infra**

  * CI/CD, unit/integration tests, prod‑grade reverse proxy with HTTPS.

---

## 📜 License

MIT (add a `LICENSE` file if desired).

---

## 🙌 Acknowledgements

* Hugging Face Inference API, MiniLM models
* Adminer, Postgres Team
* React + Vite

---

## 🧪 Quick cURL Examples

```bash
# Health
curl http://localhost:8080/health

# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}'

# Login (save token)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}' | jq -r .token)

# List apps
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/apps

# Create app
curl -X POST http://localhost:8080/api/apps \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"company":"Acme","role":"SDE","status":"Applied","applied_on":"2025-08-28"}'
```



