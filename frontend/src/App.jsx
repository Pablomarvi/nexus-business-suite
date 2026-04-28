import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Clock, Calendar, FileSpreadsheet, Mail,
  Share2, TrendingUp, Plus, Trash2, Edit3,
  CheckCircle2, AlertCircle, ArrowUpRight, Upload, Send,
  ChevronDown, RefreshCw, Globe, Zap, Hash, AtSign,
  MessageSquare, Sparkles, Brain, Bot
} from 'lucide-react';
import { get, post, put, del, uploadFile } from './api';

/* ─────────────────────────────────────────────
   SHARED COMPONENTS — No duplication
   ───────────────────────────────────────────── */

const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'tasks',    icon: Clock,           label: 'Task Hub' },
  { id: 'events',   icon: Calendar,        label: 'TN Events' },
  { id: 'leads',    icon: FileSpreadsheet, label: 'Excel Lab' },
  { id: 'email',    icon: Mail,            label: 'Email Bot' },
  { id: 'social',   icon: Share2,          label: 'Social Lab' },
  { id: 'insights', icon: TrendingUp,      label: 'Market Pro' },
];

function Sidebar({ active, onNav }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon"><Zap size={18} color="white" /></div>
        <h1>NEXUS</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(n => (
          <button key={n.id} className={`nav-btn ${active === n.id ? 'active' : ''}`} onClick={() => onNav(n.id)}>
            <n.icon size={17} /><span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>System Status</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
          <span className="status-dot" /><span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Active & Monitoring</span>
        </div>
      </div>
    </aside>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-up" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <div style={{ display: 'flex', gap: '0.65rem' }}>{children}</div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="glass stat-card">
      <div className="stat-icon" style={{ background: bg }}><Icon size={18} color={color} /></div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return <div className="empty-state"><Icon size={52} /><p>{text}</p></div>;
}

function AIBadge() {
  return <span className="ai-tag"><Sparkles size={10} /> AI Powered</span>;
}

/* ─────────────────────────────────────────────
   1. OVERVIEW
   ───────────────────────────────────────────── */
function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [time, setTime] = useState(new Date());
  const load = useCallback(async () => { try { setStats(await get('/dashboard/stats')); } catch {} }, []);
  useEffect(() => { load(); const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, [load]);

  if (!stats) return <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <>
      <PageHeader title="Welcome Back, Pablo" subtitle={`${time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} | ${time.toLocaleTimeString()}`}>
        <button className="btn btn-primary" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </PageHeader>
      <div className="stat-grid">
        <StatBox label="Total Tasks" value={stats.totalTasks} icon={Clock} color="#818cf8" bg="var(--accent-soft)" />
        <StatBox label="Pending" value={stats.pendingTasks} icon={AlertCircle} color="#fbbf24" bg="var(--amber-soft)" />
        <StatBox label="Events" value={stats.totalEvents} icon={Calendar} color="#22d3ee" bg="var(--cyan-soft)" />
        <StatBox label="Leads" value={stats.totalLeads} icon={FileSpreadsheet} color="#34d399" bg="var(--emerald-soft)" />
        <StatBox label="Emails" value={stats.emailsSent} icon={Mail} color="#c084fc" bg="var(--violet-soft)" />
        <StatBox label="Posts" value={stats.socialPosts} icon={Share2} color="#f472b6" bg="var(--pink-soft)" />
      </div>
      {stats.aiAvailable && (
        <div className="ai-panel" style={{ marginBottom: '1.25rem' }}>
          <h4><Sparkles size={16} /> Gemini AI Active</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>AI-powered content generation is available in Email Bot, Social Lab, Excel Lab, and Market Pro.</p>
        </div>
      )}
      <div className="glass card">
        <h3 style={{ marginBottom: '0.85rem' }}>Recent Activity</h3>
        {stats.recentActivity?.length > 0 ? stats.recentActivity.map((a, i) => (
          <div key={i} className="activity-item">
            <div className="activity-dot" style={{ background: { tasks: '#818cf8', events: '#22d3ee', leads: '#34d399', email: '#c084fc', social: '#f472b6' }[a.module] || '#fbbf24' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.action}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.details}</p>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.created_at}</span>
          </div>
        )) : <p style={{ color: 'var(--text-muted)' }}>No activity yet.</p>}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   2. TASK HUB
   ───────────────────────────────────────────── */
function TaskPage() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const load = useCallback(async () => { try { setTasks(await get('/tasks')); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim()) return;
    editing ? await put(`/tasks/${editing.id}`, { ...form, status: editing.status }) : await post('/tasks', form);
    setForm({ title: '', description: '', priority: 'medium', due_date: '' }); setEditing(null); setShowModal(false); load();
  };
  const toggle = async (t) => { await put(`/tasks/${t.id}`, { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }); load(); };
  const remove = async (id) => { await del(`/tasks/${id}`); load(); };
  const edit = (t) => { setEditing(t); setForm({ title: t.title, description: t.description, priority: t.priority, due_date: t.due_date || '' }); setShowModal(true); };

  const pending = tasks.filter(t => t.status !== 'completed');
  const done = tasks.filter(t => t.status === 'completed');

  return (
    <>
      <PageHeader title="Task Hub" subtitle="Manage priorities and deadlines">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', description: '', priority: 'medium', due_date: '' }); setShowModal(true); }}><Plus size={14} /> New Task</button>
      </PageHeader>
      <div className="glass card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: '0.85rem' }}>Active ({pending.length})</h3>
        {!pending.length ? <EmptyState icon={CheckCircle2} text="All caught up!" /> : (
          <table className="data-table"><thead><tr><th></th><th>Task</th><th>Priority</th><th>Due</th><th>Actions</th></tr></thead><tbody>
            {pending.map(t => <tr key={t.id}>
              <td><button onClick={() => toggle(t)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '5px', width: '22px', height: '22px', cursor: 'pointer' }} /></td>
              <td><p style={{ fontWeight: 600 }}>{t.title}</p>{t.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1px' }}>{t.description}</p>}</td>
              <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
              <td style={{ color: 'var(--text-muted)' }}>{t.due_date || '—'}</td>
              <td><div style={{ display: 'flex', gap: '0.4rem' }}><button className="btn btn-secondary btn-sm" onClick={() => edit(t)}><Edit3 size={13} /></button><button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}><Trash2 size={13} /></button></div></td>
            </tr>)}
          </tbody></table>
        )}
      </div>
      {done.length > 0 && (
        <div className="glass card" style={{ opacity: 0.7 }}>
          <h3 style={{ marginBottom: '0.85rem', color: 'var(--text-muted)' }}>Completed ({done.length})</h3>
          {done.map(t => <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <button onClick={() => toggle(t)} style={{ background: 'var(--emerald)', border: 'none', borderRadius: '5px', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={13} color="white" /></button>
            <span style={{ textDecoration: 'line-through', flex: 1, fontSize: '0.875rem' }}>{t.title}</span>
            <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}><Trash2 size={13} /></button>
          </div>)}
        </div>
      )}
      {showModal && <Modal onClose={() => setShowModal(false)}>
        <h3>{editing ? 'Edit Task' : 'New Task'}</h3>
        <div className="form-group"><label>Title</label><input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="What needs to be done?" /></div>
        <div className="form-group"><label>Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group"><label>Priority</label><select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div className="form-group"><label>Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>{editing ? 'Update' : 'Create'}</button></div>
      </Modal>}
    </>
  );
}

/* ─────────────────────────────────────────────
   3. TN EVENTS
   ───────────────────────────────────────────── */
function EventsPage() {
  const [events, setEvents] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', date: '', organizer: '', link: '', category: 'Technology' });
  const load = useCallback(async () => { try { setEvents(await get('/events')); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const scrape = async () => { setScraping(true); try { setResult(await post('/events/scrape', {})); load(); } catch(e) { setResult({ error: e.message }); } setScraping(false); };
  const add = async () => { if (!form.name.trim()) return; await post('/events', form); setForm({ name: '', location: '', date: '', organizer: '', link: '', category: 'Technology' }); setShowAdd(false); load(); };

  return (
    <>
      <PageHeader title="TN Event Intelligence" subtitle="Real-time tech events from Tamil Nadu">
        <button className="btn btn-secondary" onClick={() => setShowAdd(true)}><Plus size={14} /> Manual</button>
        <button className="btn btn-primary" onClick={scrape} disabled={scraping}>{scraping ? <><RefreshCw size={14} className="loading" /> Scanning...</> : <><Globe size={14} /> Scrape Live</>}</button>
      </PageHeader>
      {result && <div className="glass card fade-up" style={{ marginBottom: '1.25rem', borderLeft: result.error ? '3px solid var(--rose)' : '3px solid var(--emerald)' }}>
        {result.error ? <p style={{ color: 'var(--rose)' }}>{result.error}</p> : <p><strong>{result.total}</strong> found, <strong>{result.inserted}</strong> new</p>}
      </div>}
      <div className="glass card">
        {!events.length ? <EmptyState icon={Calendar} text='Click "Scrape Live" to discover Tamil Nadu tech events.' /> : (
          <table className="data-table"><thead><tr><th>Event</th><th>Location</th><th>Date</th><th>Source</th><th></th></tr></thead><tbody>
            {events.map(e => <tr key={e.id}>
              <td><p style={{ fontWeight: 600 }}>{e.name}</p></td>
              <td>{e.location}</td><td>{e.date || 'TBA'}</td>
              <td><span className="badge badge-new">{e.source}</span></td>
              <td><div style={{ display: 'flex', gap: '0.4rem' }}>{e.link && <a href={e.link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><ArrowUpRight size={13} /></a>}<button className="btn btn-danger btn-sm" onClick={() => { del(`/events/${e.id}`); load(); }}><Trash2 size={13} /></button></div></td>
            </tr>)}
          </tbody></table>
        )}
      </div>
      {showAdd && <Modal onClose={() => setShowAdd(false)}>
        <h3>Add Event</h3>
        <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group"><label>Location</label><input className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="form-group"><label>Date</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
        </div>
        <div className="form-group"><label>Link</label><input className="form-input" value={form.link} onChange={e => setForm({...form, link: e.target.value})} /></div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={add}>Add</button></div>
      </Modal>}
    </>
  );
}

/* ─────────────────────────────────────────────
   4. EXCEL LAB + AI ANALYSIS
   ───────────────────────────────────────────── */
function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploadRes, setUploadRes] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', region: '', segment: 'new', notes: '' });
  const load = useCallback(async () => { try { setLeads(await get('/leads')); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (e) => { const f = e.target.files[0]; if (!f) return; try { setUploadRes(await uploadFile('/leads/upload', f)); load(); } catch(err) { setUploadRes({ error: err.message }); } e.target.value = ''; };
  const add = async () => { if (!form.name.trim()) return; await post('/leads', form); setForm({ name: '', email: '', phone: '', company: '', region: '', segment: 'new', notes: '' }); setShowAdd(false); load(); };
  const analyzeWithAI = async () => { setAiLoading(true); try { setAiAnalysis(await post('/ai/analyze-leads', {})); } catch(e) { setAiAnalysis({ error: e.message }); } setAiLoading(false); };

  const segs = leads.reduce((a, l) => { a[l.segment] = (a[l.segment] || 0) + 1; return a; }, {});

  return (
    <>
      <PageHeader title="Excel Lab" subtitle="Import, segment, and analyze leads with AI">
        <button className="btn btn-ai" onClick={analyzeWithAI} disabled={aiLoading || !leads.length}><Brain size={14} /> {aiLoading ? 'Analyzing...' : 'AI Analyze'}</button>
        <button className="btn btn-secondary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add</button>
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={upload} style={{ display: 'none' }} />
      </PageHeader>

      {uploadRes && <div className="glass card fade-up" style={{ marginBottom: '1rem', borderLeft: uploadRes.error ? '3px solid var(--rose)' : '3px solid var(--emerald)' }}>
        {uploadRes.error ? <p style={{ color: 'var(--rose)' }}>{uploadRes.error}</p> : <p>Processed <strong>{uploadRes.totalRows}</strong> rows → <strong>{uploadRes.imported}</strong> imported</p>}
      </div>}

      {aiLoading && <div className="ai-loading" style={{ marginBottom: '1rem' }}><Sparkles size={20} style={{ marginBottom: '0.5rem' }} /><p>Gemini is analyzing your leads...</p></div>}

      {aiAnalysis && !aiAnalysis.error && (
        <div className="ai-panel fade-up" style={{ marginBottom: '1.25rem' }}>
          <h4><Brain size={16} /> AI Lead Intelligence <AIBadge /></h4>
          <div className="ai-result">
            <p><strong>Summary:</strong> {aiAnalysis.summary}</p>
            {aiAnalysis.segmentBreakdown && <p style={{ marginTop: '0.5rem' }}><strong>Segments:</strong> {aiAnalysis.segmentBreakdown}</p>}
            {aiAnalysis.priorityLeads && <p style={{ marginTop: '0.5rem' }}><strong>Priority:</strong> {aiAnalysis.priorityLeads}</p>}
            {aiAnalysis.recommendations?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong>Recommendations:</strong>
                <ul style={{ marginTop: '0.35rem', paddingLeft: '1.25rem' }}>
                  {aiAnalysis.recommendations.map((r, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatBox label="Total" value={leads.length} icon={FileSpreadsheet} color="#34d399" bg="var(--emerald-soft)" />
        <StatBox label="Corporate" value={segs.corporate || 0} icon={Globe} color="#22d3ee" bg="var(--cyan-soft)" />
        <StatBox label="Individual" value={segs.individual || 0} icon={AtSign} color="#c084fc" bg="var(--violet-soft)" />
        <StatBox label="New" value={segs.new || 0} icon={Zap} color="#818cf8" bg="var(--accent-soft)" />
      </div>

      <div className="glass card">
        {!leads.length ? <EmptyState icon={FileSpreadsheet} text="Upload an Excel/CSV file or add leads manually." /> : (
          <table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Region</th><th>Segment</th><th></th></tr></thead><tbody>
            {leads.map(l => <tr key={l.id}>
              <td style={{ fontWeight: 600 }}>{l.name}</td>
              <td style={{ color: 'var(--accent)' }}>{l.email || '—'}</td>
              <td>{l.company || '—'}</td><td>{l.region || '—'}</td>
              <td><span className={`badge badge-${l.segment}`}>{l.segment}</span></td>
              <td><button className="btn btn-danger btn-sm" onClick={() => { del(`/leads/${l.id}`); load(); }}><Trash2 size={13} /></button></td>
            </tr>)}
          </tbody></table>
        )}
      </div>
      {showAdd && <Modal onClose={() => setShowAdd(false)}>
        <h3>Add Lead</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label>Email</label><input className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label>Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="form-group"><label>Company</label><input className="form-input" value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
          <div className="form-group"><label>Region</label><input className="form-input" value={form.region} onChange={e => setForm({...form, region: e.target.value})} /></div>
          <div className="form-group"><label>Segment</label><select className="form-select" value={form.segment} onChange={e => setForm({...form, segment: e.target.value})}><option value="new">New</option><option value="corporate">Corporate</option><option value="individual">Individual</option></select></div>
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={add}>Add</button></div>
      </Modal>}
    </>
  );
}

/* ─────────────────────────────────────────────
   5. EMAIL BOT + AI COMPOSE
   ───────────────────────────────────────────── */
function EmailPage() {
  const [leads, setLeads] = useState([]);
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendRes, setSendRes] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCtx, setAiCtx] = useState({ purpose: 'business outreach', tone: 'professional', industry: 'technology', keyMessage: '' });

  const load = useCallback(async () => { try { setLeads(await get('/leads')); setEmails(await get('/emails')); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const withEmail = leads.filter(l => l.email);
  const toggleAll = () => setSelected(p => p.length === withEmail.length ? [] : withEmail.map(l => l.id));
  const toggleOne = (id) => setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const send = async () => {
    if (!selected.length || !subject || !body) return;
    setSending(true); try { setSendRes(await post('/emails/send', { lead_ids: selected, subject, body })); setSelected([]); load(); } catch(e) { setSendRes({ error: e.message }); } setSending(false);
  };

  const aiGenerate = async () => {
    setAiLoading(true);
    try {
      const result = await post('/ai/generate-email', aiCtx);
      if (result.subject) setSubject(result.subject);
      if (result.body) setBody(result.body);
    } catch(e) { alert('AI Error: ' + e.message); }
    setAiLoading(false);
  };

  return (
    <>
      <PageHeader title="Email Bot" subtitle="AI-powered personalized email campaigns" />
      <div className="section-grid">
        <div>
          {/* AI Generator */}
          <div className="ai-panel">
            <h4><Sparkles size={16} /> AI Email Generator <AIBadge /></h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Purpose</label><input className="form-input" value={aiCtx.purpose} onChange={e => setAiCtx({...aiCtx, purpose: e.target.value})} /></div>
              <div className="form-group"><label>Tone</label><select className="form-select" value={aiCtx.tone} onChange={e => setAiCtx({...aiCtx, tone: e.target.value})}><option>professional</option><option>friendly</option><option>urgent</option><option>casual</option></select></div>
              <div className="form-group"><label>Industry</label><input className="form-input" value={aiCtx.industry} onChange={e => setAiCtx({...aiCtx, industry: e.target.value})} /></div>
              <div className="form-group"><label>Key Message</label><input className="form-input" value={aiCtx.keyMessage} onChange={e => setAiCtx({...aiCtx, keyMessage: e.target.value})} placeholder="e.g. partnership for tech expo" /></div>
            </div>
            <button className="btn btn-ai" onClick={aiGenerate} disabled={aiLoading} style={{ marginTop: '0.5rem' }}>
              {aiLoading ? <><RefreshCw size={14} className="loading" /> Generating...</> : <><Sparkles size={14} /> Generate with AI</>}
            </button>
          </div>

          <div className="glass card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ marginBottom: '0.85rem' }}>Compose</h3>
            <div className="form-group"><label>Subject</label><input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Use {{name}}, {{company}} for personalization" /></div>
            <div className="form-group"><label>Body (HTML)</label><textarea className="form-textarea" style={{ minHeight: '180px' }} value={body} onChange={e => setBody(e.target.value)} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selected.length} recipients</span>
              <button className="btn btn-primary" onClick={send} disabled={sending || !selected.length || !subject || !body}>
                {sending ? <><RefreshCw size={14} className="loading" /> Sending...</> : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>

          {sendRes && <div className="glass card fade-up" style={{ borderLeft: '3px solid var(--emerald)' }}>
            {sendRes.results?.map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.85rem' }}>
              <span>{r.email}</span><span className={`badge badge-${r.status}`}>{r.status}</span>
              {r.preview && <a href={r.preview} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>Preview ↗</a>}
            </div>)}
          </div>}
        </div>

        <div>
          <div className="glass card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3>Recipients</h3>
              <button className="btn btn-secondary btn-sm" onClick={toggleAll}>{selected.length === withEmail.length ? 'None' : 'All'}</button>
            </div>
            {!withEmail.length ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Add leads in Excel Lab first.</p> : (
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {withEmail.map(l => <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.4rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleOne(l.id)} style={{ accentColor: 'var(--accent-bright)' }} />
                  <div><p style={{ fontWeight: 500, fontSize: '0.85rem' }}>{l.name}</p><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.email}</p></div>
                </label>)}
              </div>
            )}
          </div>
          <div className="glass card">
            <h3 style={{ marginBottom: '0.85rem' }}>History ({emails.length})</h3>
            {!emails.length ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No emails sent yet.</p> : (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {emails.slice(0, 15).map(e => <div key={e.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 500 }}>{e.lead_name}</span><span className={`badge badge-${e.status}`}>{e.status}</span></div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{e.subject}</p>
                </div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   6. SOCIAL LAB + AI CONTENT
   ───────────────────────────────────────────── */
function SocialPage() {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ platform: 'LinkedIn', content: '', hashtags: '', status: 'draft', scheduled_for: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCtx, setAiCtx] = useState({ platform: 'LinkedIn', topic: '', audience: 'professionals', goal: 'engagement' });
  const load = useCallback(async () => { try { setPosts(await get('/social')); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => { if (!form.content.trim()) return; await post('/social', form); setForm({ platform: 'LinkedIn', content: '', hashtags: '', status: 'draft', scheduled_for: '' }); setShowModal(false); load(); };
  const remove = async (id) => { await del(`/social/${id}`); load(); };
  const publish = async (p) => { await put(`/social/${p.id}`, { ...p, status: 'published' }); load(); };

  const aiGenerate = async () => {
    setAiLoading(true);
    try {
      const result = await post('/ai/generate-social', aiCtx);
      setForm({ ...form, platform: aiCtx.platform, content: result.content || '', hashtags: result.hashtags || '' });
      setShowModal(true);
    } catch(e) { alert('AI Error: ' + e.message); }
    setAiLoading(false);
  };

  const pIcon = (p) => ({ LinkedIn: <AtSign size={15} />, Instagram: <Hash size={15} />, Twitter: <MessageSquare size={15} /> }[p] || <Share2 size={15} />);
  const pColor = (p) => ({ LinkedIn: '#0a66c2', Instagram: '#e1306c', Twitter: '#1da1f2' }[p] || '#818cf8');

  return (
    <>
      <PageHeader title="Social Lab" subtitle="AI-powered content creation and scheduling">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> Manual Post</button>
      </PageHeader>

      {/* AI Content Generator */}
      <div className="ai-panel" style={{ marginBottom: '1.25rem' }}>
        <h4><Sparkles size={16} /> AI Content Generator <AIBadge /></h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group"><label>Platform</label><select className="form-select" value={aiCtx.platform} onChange={e => setAiCtx({...aiCtx, platform: e.target.value})}><option>LinkedIn</option><option>Instagram</option><option>Twitter</option></select></div>
          <div className="form-group"><label>Topic</label><input className="form-input" value={aiCtx.topic} onChange={e => setAiCtx({...aiCtx, topic: e.target.value})} placeholder="e.g. AI automation" /></div>
          <div className="form-group"><label>Audience</label><input className="form-input" value={aiCtx.audience} onChange={e => setAiCtx({...aiCtx, audience: e.target.value})} /></div>
          <div className="form-group"><label>Goal</label><select className="form-select" value={aiCtx.goal} onChange={e => setAiCtx({...aiCtx, goal: e.target.value})}><option>engagement</option><option>lead generation</option><option>brand awareness</option><option>thought leadership</option></select></div>
        </div>
        <button className="btn btn-ai" onClick={aiGenerate} disabled={aiLoading}>
          {aiLoading ? <><RefreshCw size={14} className="loading" /> Creating...</> : <><Sparkles size={14} /> Generate Post with AI</>}
        </button>
      </div>

      <div className="stat-grid">
        <StatBox label="Total" value={posts.length} icon={Share2} color="#f472b6" bg="var(--pink-soft)" />
        <StatBox label="Drafts" value={posts.filter(p => p.status === 'draft').length} icon={Edit3} color="#94a3b8" bg="rgba(100,116,139,0.1)" />
        <StatBox label="Scheduled" value={posts.filter(p => p.status === 'scheduled').length} icon={Clock} color="#22d3ee" bg="var(--cyan-soft)" />
        <StatBox label="Published" value={posts.filter(p => p.status === 'published').length} icon={CheckCircle2} color="#34d399" bg="var(--emerald-soft)" />
      </div>

      <div className="glass card">
        {!posts.length ? <EmptyState icon={Share2} text="Generate your first post with AI or create one manually!" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {posts.map(p => <div key={p.id} className="glass" style={{ padding: '1.15rem', borderTop: `3px solid ${pColor(p.platform)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pColor(p.platform) }}>{pIcon(p.platform)}<span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.platform}</span></div>
                <span className={`badge badge-${p.status}`}>{p.status}</span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>{p.content}</p>
              {p.hashtags && <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{p.hashtags}</p>}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
                {p.status !== 'published' && <button className="btn btn-success btn-sm" onClick={() => publish(p)}><CheckCircle2 size={13} /> Publish</button>}
                <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}><Trash2 size={13} /></button>
              </div>
            </div>)}
          </div>
        )}
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)}>
        <h3>Create Post</h3>
        <div className="form-group"><label>Platform</label><select className="form-select" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}><option>LinkedIn</option><option>Instagram</option><option>Twitter</option></select></div>
        <div className="form-group"><label>Content</label><textarea className="form-textarea" style={{ minHeight: '140px' }} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
        <div className="form-group"><label>Hashtags</label><input className="form-input" value={form.hashtags} onChange={e => setForm({...form, hashtags: e.target.value})} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div className="form-group"><label>Status</label><select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select></div>
          <div className="form-group"><label>Schedule</label><input className="form-input" type="datetime-local" value={form.scheduled_for} onChange={e => setForm({...form, scheduled_for: e.target.value})} /></div>
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Create</button></div>
      </Modal>}
    </>
  );
}

/* ─────────────────────────────────────────────
   7. MARKET PRO + AI STRATEGY
   ───────────────────────────────────────────── */
function InsightsPage() {
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const load = useCallback(async () => { try { setStats(await get('/dashboard/stats')); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const generateInsights = async () => {
    setAiLoading(true);
    try { setAiInsights(await post('/ai/market-insights', {})); } catch(e) { setAiInsights({ error: e.message }); }
    setAiLoading(false);
  };

  return (
    <>
      <PageHeader title="Market Pro" subtitle="AI-powered business intelligence">
        <button className="btn btn-ai" onClick={generateInsights} disabled={aiLoading}><Brain size={14} /> {aiLoading ? 'Thinking...' : 'AI Strategy Report'}</button>
        <button className="btn btn-primary" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </PageHeader>

      {aiLoading && <div className="ai-loading" style={{ marginBottom: '1.25rem' }}><Brain size={22} /><p style={{ marginTop: '0.5rem' }}>Gemini is crafting your strategy report...</p></div>}

      {aiInsights && !aiInsights.error && (
        <div className="ai-panel fade-up" style={{ marginBottom: '1.25rem' }}>
          <h4><Brain size={16} /> AI Strategy Report <AIBadge /></h4>
          <div className="ai-result">
            {aiInsights.marketOverview && <p><strong>Market Overview:</strong> {aiInsights.marketOverview}</p>}
            {aiInsights.productivityScore && <p style={{ marginTop: '0.5rem' }}><strong>Productivity Score:</strong> {aiInsights.productivityScore}</p>}
            {aiInsights.growthOpportunities?.length > 0 && <div style={{ marginTop: '0.75rem' }}><strong>Growth Opportunities:</strong><ul style={{ paddingLeft: '1.25rem', marginTop: '0.3rem' }}>{aiInsights.growthOpportunities.map((o, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{o}</li>)}</ul></div>}
            {aiInsights.threats?.length > 0 && <div style={{ marginTop: '0.75rem' }}><strong>Threats:</strong><ul style={{ paddingLeft: '1.25rem', marginTop: '0.3rem' }}>{aiInsights.threats.map((t, i) => <li key={i} style={{ marginBottom: '0.2rem', color: 'var(--rose)' }}>{t}</li>)}</ul></div>}
            {aiInsights.strategyRecommendations?.length > 0 && <div style={{ marginTop: '0.75rem' }}><strong>Strategy:</strong><ul style={{ paddingLeft: '1.25rem', marginTop: '0.3rem' }}>{aiInsights.strategyRecommendations.map((s, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{s}</li>)}</ul></div>}
            {aiInsights.weeklyActionPlan?.length > 0 && <div style={{ marginTop: '0.75rem' }}><strong>Weekly Plan:</strong><div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => <div key={i} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}><p style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>{d}</p><p style={{ fontSize: '0.75rem' }}>{aiInsights.weeklyActionPlan[i]}</p></div>)}</div></div>}
          </div>
        </div>
      )}

      <div className="section-grid">
        <div className="glass card">
          <h3 style={{ marginBottom: '1rem' }}>Pipeline</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {[
              { l: 'Tasks', v: stats?.totalTasks || 0, c: '#818cf8' },
              { l: 'Completed', v: stats?.completedTasks || 0, c: '#34d399' },
              { l: 'Events', v: stats?.totalEvents || 0, c: '#22d3ee' },
              { l: 'Leads', v: stats?.totalLeads || 0, c: '#fbbf24' },
              { l: 'Emails', v: stats?.emailsSent || 0, c: '#c084fc' },
              { l: 'Posts', v: stats?.socialPosts || 0, c: '#f472b6' },
            ].map((x, i) => <div key={i} style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{x.l}</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit', color: x.c }}>{x.v}</p>
            </div>)}
          </div>
        </div>
        <div className="glass card">
          <h3 style={{ marginBottom: '1rem' }}>Funnel</h3>
          {[
            { s: 'Leads', v: stats?.totalLeads || 0, w: '100%', c: '#818cf8' },
            { s: 'Emailed', v: stats?.emailsSent || 0, w: `${stats?.totalLeads ? Math.min(100, (stats.emailsSent / stats.totalLeads) * 100) : 0}%`, c: '#c084fc' },
            { s: 'Active Tasks', v: stats?.pendingTasks || 0, w: `${stats?.totalTasks ? Math.min(100, (stats.pendingTasks / stats.totalTasks) * 100) : 30}%`, c: '#22d3ee' },
            { s: 'Done', v: stats?.completedTasks || 0, w: `${stats?.totalTasks ? Math.min(100, (stats.completedTasks / stats.totalTasks) * 100) : 0}%`, c: '#34d399' },
          ].map((f, i) => <div key={i} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.s}</span><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.v}</span></div>
            <div style={{ height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', width: f.w, borderRadius: '4px', background: f.c, transition: 'width 0.5s' }} /></div>
          </div>)}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   APP ROOT
   ───────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState('overview');
  const pages = { overview: <OverviewPage />, tasks: <TaskPage />, events: <EventsPage />, leads: <LeadsPage />, email: <EmailPage />, social: <SocialPage />, insights: <InsightsPage /> };
  return (
    <div className="app-layout">
      <Sidebar active={tab} onNav={setTab} />
      <main className="main-content">{pages[tab]}</main>
    </div>
  );
}
