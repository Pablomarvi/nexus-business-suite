const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const fs = require('fs');
const AIService = require('./services/aiService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

let db;
let ai;

// ═══════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════
async function initDb() {
    db = await open({ filename: path.join(__dirname, 'database.sqlite'), driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
            status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium',
            due_date TEXT, created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT,
            date TEXT, organizer TEXT, link TEXT, category TEXT, source TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, phone TEXT,
            company TEXT, region TEXT, segment TEXT DEFAULT 'new', notes TEXT,
            score INTEGER DEFAULT 0, last_contacted TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS emails_sent (
            id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER, subject TEXT,
            body TEXT, status TEXT DEFAULT 'sent',
            sent_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (lead_id) REFERENCES leads(id)
        );
        CREATE TABLE IF NOT EXISTS social_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT, content TEXT,
            hashtags TEXT, status TEXT DEFAULT 'draft', scheduled_for TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL,
            module TEXT, details TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
    `);
    ai = new AIService();
    console.log('✅ Database initialized');
}

async function logActivity(action, module, details) {
    await db.run('INSERT INTO activity_log (action, module, details) VALUES (?, ?, ?)', [action, module, details]);
}

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [pending, completed, total, events, leads, emails, social] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM tasks WHERE status="pending"'),
            db.get('SELECT COUNT(*) as c FROM tasks WHERE status="completed"'),
            db.get('SELECT COUNT(*) as c FROM tasks'),
            db.get('SELECT COUNT(*) as c FROM events'),
            db.get('SELECT COUNT(*) as c FROM leads'),
            db.get('SELECT COUNT(*) as c FROM emails_sent'),
            db.get('SELECT COUNT(*) as c FROM social_posts'),
        ]);
        const activity = await db.all('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10');
        res.json({
            pendingTasks: pending.c, completedTasks: completed.c, totalTasks: total.c,
            totalEvents: events.c, totalLeads: leads.c, emailsSent: emails.c,
            socialPosts: social.c, recentActivity: activity, aiAvailable: ai.available
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// TASKS
// ═══════════════════════════════════════
app.get('/api/tasks', async (_, res) => {
    try { res.json(await db.all('SELECT * FROM tasks ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, created_at DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, priority, due_date } = req.body;
        if (!title) return res.status(400).json({ error: 'Title required' });
        const r = await db.run('INSERT INTO tasks (title,description,priority,due_date) VALUES (?,?,?,?)', [title, description || '', priority || 'medium', due_date || null]);
        await logActivity('Task Created', 'tasks', title);
        res.json(await db.get('SELECT * FROM tasks WHERE id=?', r.lastID));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { title, description, status, priority, due_date } = req.body;
        await db.run('UPDATE tasks SET title=?,description=?,status=?,priority=?,due_date=?,updated_at=datetime("now","localtime") WHERE id=?', [title, description, status, priority, due_date, req.params.id]);
        await logActivity(`Task ${status}`, 'tasks', title);
        res.json(await db.get('SELECT * FROM tasks WHERE id=?', req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/tasks/:id', async (req, res) => {
    try { await db.run('DELETE FROM tasks WHERE id=?', req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// EVENTS — REAL WEB SCRAPING
// ═══════════════════════════════════════
app.get('/api/events', async (_, res) => {
    try { res.json(await db.all('SELECT * FROM events ORDER BY created_at DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/events', async (req, res) => {
    try {
        const { name, location, date, organizer, link, category } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        const r = await db.run('INSERT INTO events (name,location,date,organizer,link,category,source) VALUES (?,?,?,?,?,?,?)', [name, location || '', date || '', organizer || '', link || '', category || 'Technology', 'manual']);
        await logActivity('Event Added', 'events', name);
        res.json(await db.get('SELECT * FROM events WHERE id=?', r.lastID));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/events/:id', async (req, res) => {
    try { await db.run('DELETE FROM events WHERE id=?', req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/events/scrape', async (req, res) => {
    try {
        const results = [];
        const sources = [
            { url: 'https://10times.com/chennai-in/technology', city: 'Chennai' },
            { url: 'https://10times.com/coimbatore-in/technology', city: 'Coimbatore' },
            { url: 'https://10times.com/madurai-in/technology', city: 'Madurai' },
        ];
        for (const src of sources) {
            try {
                const { data } = await axios.get(src.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
                const $ = cheerio.load(data);
                $('table.table tbody tr, .event-card, .listing-card, [class*="event"]').each((_, el) => {
                    const name = $(el).find('h2, h3, .event-name, td:first-child a').first().text().trim();
                    const date = $(el).find('.date, time, .event-date, td:nth-child(2)').first().text().trim();
                    const link = $(el).find('a').first().attr('href') || '';
                    if (name && name.length > 3) results.push({ name: name.substring(0, 120), location: `${src.city}, Tamil Nadu`, date: date || 'TBA', organizer: 'Via 10times.com', link: link.startsWith('http') ? link : `https://10times.com${link}`, category: 'Technology', source: '10times.com' });
                });
            } catch (e) { console.log(`Scrape skip: ${src.city}`); }
        }
        const seen = new Set();
        const unique = results.filter(e => { const k = e.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
        let inserted = 0;
        for (const ev of unique) {
            const exists = await db.get('SELECT id FROM events WHERE name=?', ev.name);
            if (!exists) { await db.run('INSERT INTO events (name,location,date,organizer,link,category,source) VALUES (?,?,?,?,?,?,?)', [ev.name, ev.location, ev.date, ev.organizer, ev.link, ev.category, ev.source]); inserted++; }
        }
        await logActivity('Events Scraped', 'events', `${unique.length} found, ${inserted} new`);
        res.json({ total: unique.length, inserted });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// LEADS
// ═══════════════════════════════════════
app.get('/api/leads', async (_, res) => {
    try { res.json(await db.all('SELECT * FROM leads ORDER BY created_at DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/leads', async (req, res) => {
    try {
        const { name, email, phone, company, region, segment, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        const r = await db.run('INSERT INTO leads (name,email,phone,company,region,segment,notes) VALUES (?,?,?,?,?,?,?)', [name, email || '', phone || '', company || '', region || '', segment || 'new', notes || '']);
        await logActivity('Lead Added', 'leads', `${name} (${company || 'N/A'})`);
        res.json(await db.get('SELECT * FROM leads WHERE id=?', r.lastID));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/leads/:id', async (req, res) => {
    try { await db.run('DELETE FROM leads WHERE id=?', req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/leads/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const wb = xlsx.readFile(req.file.path);
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let imported = 0;
        for (const row of rows) {
            const name = row.Name || row.name || row.NAME || row['Full Name'] || '';
            const email = row.Email || row.email || row.EMAIL || '';
            const phone = row.Phone || row.phone || row.Mobile || '';
            const company = row.Company || row.company || row.Organization || '';
            const region = row.Region || row.region || row.City || row.city || '';
            if (!name && !email) continue;
            let segment = 'new';
            if (email) {
                const domain = email.split('@')[1] || '';
                segment = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain) ? 'individual' : (domain ? 'corporate' : 'new');
            }
            const exists = await db.get('SELECT id FROM leads WHERE email=? AND email!=""', email);
            if (!exists) { await db.run('INSERT INTO leads (name,email,phone,company,region,segment) VALUES (?,?,?,?,?,?)', [name, email, phone, company, region, segment]); imported++; }
        }
        fs.unlinkSync(req.file.path);
        await logActivity('Excel Imported', 'leads', `${imported} new from ${rows.length} rows`);
        res.json({ totalRows: rows.length, imported });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// EMAILS
// ═══════════════════════════════════════
app.get('/api/emails', async (_, res) => {
    try { res.json(await db.all('SELECT e.*, l.name as lead_name, l.email as lead_email FROM emails_sent e LEFT JOIN leads l ON e.lead_id=l.id ORDER BY e.sent_at DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/emails/send', async (req, res) => {
    try {
        const { lead_ids, subject, body } = req.body;
        if (!lead_ids?.length || !subject || !body) return res.status(400).json({ error: 'Missing fields' });
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
        const results = [];
        for (const id of lead_ids) {
            const lead = await db.get('SELECT * FROM leads WHERE id=?', id);
            if (!lead?.email) continue;
            const pBody = body.replace(/\{\{name\}\}/g, lead.name || 'there').replace(/\{\{company\}\}/g, lead.company || 'your company').replace(/\{\{region\}\}/g, lead.region || '');
            const pSubj = subject.replace(/\{\{name\}\}/g, lead.name || 'there').replace(/\{\{company\}\}/g, lead.company || '');
            try {
                const info = await transporter.sendMail({ from: '"Nexus Business Suite" <support@nexus-suite.io>', to: lead.email, subject: pSubj, html: pBody });
                await db.run('INSERT INTO emails_sent (lead_id,subject,body,status) VALUES (?,?,?,?)', [id, pSubj, pBody, 'sent']);
                await db.run('UPDATE leads SET last_contacted=datetime("now","localtime") WHERE id=?', id);
                results.push({ email: lead.email, status: 'sent', preview: nodemailer.getTestMessageUrl(info) });
            } catch (e) {
                await db.run('INSERT INTO emails_sent (lead_id,subject,body,status) VALUES (?,?,?,?)', [id, pSubj, pBody, 'failed']);
                results.push({ email: lead.email, status: 'failed', error: e.message });
            }
        }
        await logActivity('Emails Sent', 'email', `${results.filter(r => r.status === 'sent').length} delivered`);
        res.json({ results });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// SOCIAL POSTS
// ═══════════════════════════════════════
app.get('/api/social', async (_, res) => {
    try { res.json(await db.all('SELECT * FROM social_posts ORDER BY created_at DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/social', async (req, res) => {
    try {
        const { platform, content, hashtags, status, scheduled_for } = req.body;
        if (!platform || !content) return res.status(400).json({ error: 'Platform and content required' });
        const r = await db.run('INSERT INTO social_posts (platform,content,hashtags,status,scheduled_for) VALUES (?,?,?,?,?)', [platform, content, hashtags || '', status || 'draft', scheduled_for || null]);
        await logActivity('Post Created', 'social', `${platform}: ${content.substring(0, 50)}`);
        res.json(await db.get('SELECT * FROM social_posts WHERE id=?', r.lastID));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/social/:id', async (req, res) => {
    try {
        const { platform, content, hashtags, status, scheduled_for } = req.body;
        await db.run('UPDATE social_posts SET platform=?,content=?,hashtags=?,status=?,scheduled_for=? WHERE id=?', [platform, content, hashtags, status, scheduled_for, req.params.id]);
        res.json(await db.get('SELECT * FROM social_posts WHERE id=?', req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/social/:id', async (req, res) => {
    try { await db.run('DELETE FROM social_posts WHERE id=?', req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// AI ENDPOINTS
// ═══════════════════════════════════════
app.post('/api/ai/generate-email', async (req, res) => {
    try { res.json(await ai.generateEmail(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/ai/generate-social', async (req, res) => {
    try { res.json(await ai.generateSocialPost(req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/ai/analyze-leads', async (req, res) => {
    try {
        const leads = await db.all('SELECT * FROM leads ORDER BY created_at DESC LIMIT 50');
        if (!leads.length) return res.status(400).json({ error: 'No leads to analyze' });
        res.json(await ai.analyzeLeads(leads));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/ai/market-insights', async (req, res) => {
    try {
        const [pending, completed, total, events, leads, emails, social] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM tasks WHERE status="pending"'),
            db.get('SELECT COUNT(*) as c FROM tasks WHERE status="completed"'),
            db.get('SELECT COUNT(*) as c FROM tasks'),
            db.get('SELECT COUNT(*) as c FROM events'),
            db.get('SELECT COUNT(*) as c FROM leads'),
            db.get('SELECT COUNT(*) as c FROM emails_sent'),
            db.get('SELECT COUNT(*) as c FROM social_posts'),
        ]);
        res.json(await ai.generateMarketInsights({ pendingTasks: pending.c, completedTasks: completed.c, totalTasks: total.c, totalEvents: events.c, totalLeads: leads.c, emailsSent: emails.c, socialPosts: social.c }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/activity', async (req, res) => {
    try { res.json(await db.all('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', req.query.limit || 20)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// CATCH-ALL ROUTE (MUST BE LAST)
// ═══════════════════════════════════════
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, async () => { await initDb(); console.log(`🚀 Nexus Business Suite Backend → http://localhost:${PORT}`); });
