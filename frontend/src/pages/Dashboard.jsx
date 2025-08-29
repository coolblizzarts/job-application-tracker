import React, { useEffect, useState } from 'react';
import { listApps, createApp, updateApp, removeApp, h1b } from '../services/api.js';

const statuses = ['Wishlist','Applied','OA','Phone','Onsite','Offer','Rejected'];

export default function Dashboard() {
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  // inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // add form (all backend fields)
  const today = new Date().toISOString().slice(0,10);
  const emptyForm = {
    company: '', role: '', location: '', status: 'Applied', source: '',
    applied_on: today, job_url: '', salary: '', notes: ''
  };
  const [form, setForm] = useState({ ...emptyForm });

  function setField(name, value) { setForm(prev => ({ ...prev, [name]: value })); }
  function setEditField(name, value) { setEditForm(prev => ({ ...prev, [name]: value })); }

  async function refresh() { setApps(await listApps()); }
  useEffect(()=>{ refresh(); },[]);

  async function add(e){
    e.preventDefault();
    if(!form.company.trim()) return alert('Company is required');
    const payload = {
      company: form.company.trim(),
      role: form.role.trim() || null,
      location: form.location.trim() || null,
      status: form.status,
      source: form.source.trim() || null,
      applied_on: form.applied_on || undefined,
      job_url: form.job_url.trim() || null,
      salary: form.salary !== '' ? Number(form.salary) : null,
      notes: form.notes.trim() || null
    };
    await createApp(payload);
    setForm({ ...emptyForm });
    setShowForm(false);
    refresh();
  }

  async function quickStatus(app, status) {
    await updateApp(app.id, { status });
    refresh();
  }

  function startEdit(a){
    setEditingId(a.id);
    setEditForm({
      company: a.company || '',
      role: a.role || '',
      location: a.location || '',
      source: a.source || '',
      status: a.status || 'Applied',
      applied_on: a.applied_on || today,
      job_url: a.job_url || '',
      salary: a.salary ?? '',
      notes: a.notes || ''
    });
  }
  function cancelEdit(){ setEditingId(null); setEditForm({}); }
  async function saveEdit(){
    const id = editingId;
    const payload = {
      ...editForm,
      salary: editForm.salary !== '' ? Number(editForm.salary) : null
    };
    await updateApp(id, payload);
    cancelEdit();
    refresh();
  }

  async function del(app){
    if (confirm('Delete this record?')) { await removeApp(app.id); refresh(); }
  }

  async function lookupH1B(company){
    const data = await h1b(company);
    alert(`${data.company}: sponsorRate=${data.sponsorRate ?? 'N/A'}`);
  }

  const filtered = apps.filter(a => (filter ? a.status === filter : true));

  return (
    <div className="container">
      <div className="grid">

        {/* Add form card */}
        <div className="col-12 card">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Add Application</h3>
            <button type="button" className="button" onClick={()=>setShowForm(s=>!s)}>
              {showForm ? 'Hide' : 'Add New'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={add} className="row" style={{flexWrap:'wrap', gap:12, marginTop:12}}>
              <input className="input" placeholder="Company *"
                     value={form.company} onChange={e=>setField('company', e.target.value)} />
              <input className="input" placeholder="Role"
                     value={form.role} onChange={e=>setField('role', e.target.value)} />
              <input className="input" placeholder="Location"
                     value={form.location} onChange={e=>setField('location', e.target.value)} />
              <select className="input"
                      value={form.status} onChange={e=>setField('status', e.target.value)}>
                {statuses.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="input" placeholder="Source"
                     value={form.source} onChange={e=>setField('source', e.target.value)} />
              <input className="input" type="date" placeholder="Applied On"
                     value={form.applied_on} onChange={e=>setField('applied_on', e.target.value)} />
              <input className="input" placeholder="Job URL"
                     value={form.job_url} onChange={e=>setField('job_url', e.target.value)} />
              <input className="input" type="number" placeholder="Salary"
                     value={form.salary} onChange={e=>setField('salary', e.target.value)} />
              <textarea className="input" rows="2" placeholder="Notes"
                        value={form.notes} onChange={e=>setField('notes', e.target.value)} />
              <button className="button" type="submit">Add</button>
            </form>
          )}
        </div>

        {/* Table card */}
        <div className="col-12 card">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Your Applications</h3>
            <select className="input" style={{maxWidth:220}}
                    value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="">All</option>
              {statuses.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="table-wrap" style={{marginTop:12}}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Job URL</th>
                  <th>Salary</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const editing = editingId === a.id;
                  return (
                    <tr key={a.id}>
                      <td>
                        <button className="button secondary" title="H1B (sample)"
                                onClick={()=>lookupH1B(a.company)}>ℹ</button>{' '}
                        {editing ? (
                          <input className="input" value={editForm.company}
                                 onChange={e=>setEditField('company', e.target.value)} />
                        ) : a.company}
                      </td>
                      <td>
                        {editing ? (
                          <input className="input" value={editForm.role}
                                 onChange={e=>setEditField('role', e.target.value)} />
                        ) : (a.role || '-')}
                      </td>
                      <td>
                        {editing ? (
                          <input className="input" value={editForm.location}
                                 onChange={e=>setEditField('location', e.target.value)} />
                        ) : (a.location || '-')}
                      </td>
                      <td>
                        {editing ? (
                          <input className="input" value={editForm.source}
                                 onChange={e=>setEditField('source', e.target.value)} />
                        ) : (a.source || '-')}
                      </td>
                      <td>
                        {editing ? (
                          <select className="input" value={editForm.status}
                                  onChange={e=>setEditField('status', e.target.value)}>
                            {statuses.map(s=> <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : <span className="badge">{a.status}</span>}
                      </td>
                      <td>
                        {editing ? (
                          <input type="date" className="input" value={editForm.applied_on}
                                 onChange={e=>setEditField('applied_on', e.target.value)} />
                        ) : a.applied_on}
                      </td>
                      <td>
                        {editing ? (
                          <input className="input" value={editForm.job_url}
                                 onChange={e=>setEditField('job_url', e.target.value)} />
                        ) : (a.job_url ? <a href={a.job_url} target="_blank" rel="noreferrer">link</a> : '-')}
                      </td>
                      <td>
                        {editing ? (
                          <input type="number" className="input" value={editForm.salary}
                                 onChange={e=>setEditField('salary', e.target.value)} />
                        ) : (a.salary ?? '-')}
                      </td>
                      <td style={{minWidth:180}}>
                        {editing ? (
                          <textarea className="input" rows="2" value={editForm.notes}
                                    onChange={e=>setEditField('notes', e.target.value)} />
                        ) : (a.notes || '-')}
                      </td>
                      <td className="td-actions">
                        {editing ? (
                          <>
                            <button className="button" onClick={saveEdit}>Save</button>
                            <button className="button secondary" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            {statuses.map(s => (
                              <button key={s} className="button secondary"
                                      onClick={()=>quickStatus(a, s)}>{s}</button>
                            ))}
                            <button className="button" onClick={()=>startEdit(a)}>Edit</button>
                            <button className="button danger" onClick={()=>del(a)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
