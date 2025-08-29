import React, { useState } from 'react';
import { scoreResume } from '../services/api.js';

export default function ResumeMatch() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  async function run() {
    setErr('');
    setResult(null);
    setLoading(true);
    try {
      const input = resumeFile ? resumeFile : resumeText;
      const out = await scoreResume(input, jobText);
      setResult(out);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="col-12 card">
          <h3 style={{marginTop:0}}>Resume ↔ JD Match</h3>

          {/* two big side-by-side areas */}
          <div className="grid-2" style={{marginTop:12}}>
            {/* Resume side */}
            <div className="field">
              <div className="label">Resume</div>
              <div className="help">Upload a PDF <em>or</em> paste your resume text below.</div>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e)=>setResumeFile(e.target.files?.[0] || null)}
                style={{maxWidth:260}}
              />
              <textarea
                className="input textarea-lg"
                placeholder="Or paste resume text…"
                value={resumeText}
                onChange={e=>setResumeText(e.target.value)}
              />
            </div>

            {/* JD side */}
            <div className="field">
              <div className="label">Job Description</div>
              <div className="help">Paste the full job description here.</div>
              <textarea
                className="input textarea-lg"
                placeholder="Paste job description…"
                value={jobText}
                onChange={e=>setJobText(e.target.value)}
              />
            </div>
          </div>

          <div className="row" style={{marginTop:12, justifyContent:'flex-start'}}>
            <button className="button" onClick={run} disabled={loading || (!resumeFile && !resumeText) || !jobText}>
              {loading ? 'Scoring…' : 'Score match'}
            </button>
            {err && <div className="error">{err}</div>}
          </div>
        </div>

        {/* Results */}
        <div className="col-12 card">
          <h3 style={{marginTop:0}}>Result</h3>
          {!result && <div className="help">Run a score to see your match and keywords.</div>}

          {result && (
            <>
              <p><strong>Match score:</strong> {result.score}/100</p>
              <p><strong>Keyword overlap:</strong> {result.overlapPct}%</p>

              <div className="grid-2" style={{marginTop:8}}>
                <div>
                  <h4 style={{margin:'6px 0'}}>Consider adding</h4>
                  <ul>
                    {(result.missingKeywords || []).map(k => <li key={'m-'+k}>{k}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 style={{margin:'6px 0'}}>Already covered</h4>
                  <ul>
                    {(result.usedKeywords || []).map(k => <li key={'u-'+k}>{k}</li>)}
                  </ul>
                </div>
              </div>

              {result.score_components && (
                <div className="help" style={{marginTop:8}}>
                  breakdown — semantic: {result.score_components.semantic}/100, overlap: {result.score_components.overlap}%
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
