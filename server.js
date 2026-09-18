require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Airtable = require('airtable');
const { Resend } = require('resend');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const dataDirectory = path.join(__dirname, 'data');
const waitlistFile = path.join(dataDirectory, 'waitlist.json');
const notificationFile = path.join(dataDirectory, 'notifications.json');
const adminAccessToken = process.env.ADMIN_ACCESS_TOKEN || '';
const githubAdminUsername = (process.env.GITHUB_ADMIN_USERNAME || '').trim().toLowerCase();

const airtableEnabled = Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
const resendEnabled = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

const waitlistStore = readJson(waitlistFile, []);
const notificationStore = readJson(notificationFile, []);

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function normalizePayload(body = {}) {
  const fullName = sanitizeText(body.fullName || body.name);
  const email = sanitizeText(body.email).toLowerCase();
  const phone = sanitizeText(body.phone);
  const category = sanitizeText(body.category);
  const interest = sanitizeText(body.interest);
  const notes = sanitizeText(body.notes);

  if (!fullName || !email) {
    const error = new Error('Full name and email are required.');
    error.statusCode = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const error = new Error('Please provide a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  return {
    fullName,
    email,
    phone,
    category,
    interest,
    notes,
    createdAt: new Date().toISOString(),
  };
}

async function saveToAirtable(entry) {
  if (!airtableEnabled) return null;

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    const table = base(process.env.AIRTABLE_TABLE_NAME || 'Waitlist');

    const record = await table.create({
      fields: {
        Name: entry.fullName,
        Email: entry.email,
        Phone: entry.phone || '',
        Category: entry.category || '',
        Interest: entry.interest || '',
        Notes: entry.notes || '',
        'Created At': entry.createdAt,
      },
    });

    return record;
  } catch (error) {
    console.error('Airtable save failed:', error.message);
    return null;
  }
}

async function sendLeadEmail(entry) {
  if (!resendEnabled) return null;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const payload = {
      from: process.env.RESEND_FROM_EMAIL,
      to: [process.env.EMAIL_TO || 'doyou@usedots.in'],
      subject: `New dots. waitlist signup: ${entry.fullName}`,
      html: `
        <h2>New waitlist entry</h2>
        <p><strong>Name:</strong> ${entry.fullName}</p>
        <p><strong>Email:</strong> ${entry.email}</p>
        <p><strong>Phone:</strong> ${entry.phone || 'Not provided'}</p>
        <p><strong>Category:</strong> ${entry.category || 'Not provided'}</p>
        <p><strong>Interest:</strong> ${entry.interest || 'Not provided'}</p>
        <p><strong>Notes:</strong> ${entry.notes || 'None'}</p>
      `,
    };

    return await resend.emails.send(payload);
  } catch (error) {
    console.error('Resend email failed:', error.message);
    return null;
  }
}

async function sendWelcomeEmail(entry) {
  if (!resendEnabled) return null;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeName = escapeHtml(entry.fullName);
    return await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [entry.email],
      subject: 'You’re on the dots. early access list',
      html: `<h2>Welcome to dots.</h2><p>Hi ${safeName},</p><p>You’re on the early access list. We’ll be in touch when the first release opens.</p><p>dots.</p>`,
    });
  } catch (error) {
    console.error('Welcome email failed:', error.message);
    return null;
  }
}

async function requireAdmin(req, res, next) {
  const suppliedToken = req.get('x-admin-token');

  if (adminAccessToken && suppliedToken === adminAccessToken) return next();
  if (!githubAdminUsername) {
    return res.status(503).json({ ok: false, message: 'Server admin setup is incomplete. Set GITHUB_ADMIN_USERNAME=saviere-admin in .env and restart the server.' });
  }
  if (!suppliedToken) {
    return res.status(401).json({ ok: false, message: 'Paste the GitHub PAT secret value, not its name or label.' });
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${suppliedToken}`,
        'User-Agent': 'dots-notification-console',
      },
      signal: AbortSignal.timeout(5000),
    });
    const identity = await response.json();

    if (!response.ok || String(identity.login || '').toLowerCase() !== githubAdminUsername) {
      return res.status(401).json({ ok: false, message: 'That GitHub PAT is not authorized for this console.' });
    }

    return next();
  } catch (error) {
    console.error('GitHub admin validation failed:', error.message);
    return res.status(503).json({ ok: false, message: 'GitHub access validation is temporarily unavailable.' });
  }
}

async function broadcastNotification(subject, message) {
  if (!resendEnabled) return { sent: 0, failed: 0, status: 'not-configured' };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const results = await Promise.allSettled(waitlistStore.map((entry) => resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [entry.email],
    subject,
    html: `<h2>${safeSubject}</h2><p>${safeMessage}</p><p>dots.</p>`,
  })));

  return {
    sent: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
    status: 'sent',
  };
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'dots. API healthy',
    services: {
      airtable: airtableEnabled,
      resend: resendEnabled,
      waitlistCount: waitlistStore.length,
    },
  });
});

app.post('/api/waitlist', async (req, res) => {
  try {
    const entry = normalizePayload(req.body);
    const saved = { ...entry };

    waitlistStore.push(saved);
    writeJson(waitlistFile, waitlistStore);
    const airtableRecord = await saveToAirtable(saved);
    const emailRecord = await sendLeadEmail(saved);
    const welcomeEmailRecord = await sendWelcomeEmail(saved);

    res.status(201).json({
      ok: true,
      message: 'Added to the dots. waitlist.',
      entry: saved,
      integrations: {
        airtable: airtableRecord ? 'saved' : airtableEnabled ? 'failed' : 'not-configured',
        resend: emailRecord ? 'sent' : resendEnabled ? 'failed' : 'not-configured',
        welcomeEmail: welcomeEmailRecord ? 'sent' : resendEnabled ? 'failed' : 'not-configured',
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || 'Something went wrong.',
    });
  }
});

app.get('/api/admin/notifications', requireAdmin, (req, res) => {
  res.json({ ok: true, notifications: notificationStore });
});

app.get('/api/admin/waitlist', requireAdmin, (req, res) => {
  res.json({ ok: true, waitlist: waitlistStore });
});

app.get('/api/admin/waitlist.csv', requireAdmin, (req, res) => {
  const fields = ['fullName', 'email', 'phone', 'category', 'interest', 'notes', 'createdAt'];
  const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    fields.join(','),
    ...waitlistStore.map((entry) => fields.map((field) => csvEscape(entry[field])).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="dots-waitlist.csv"');
  return res.send(csv);
});

app.post('/api/admin/notifications', requireAdmin, async (req, res) => {
  const subject = sanitizeText(req.body.subject);
  const message = sanitizeText(req.body.message);

  if (!subject || !message) {
    return res.status(400).json({ ok: false, message: 'Subject and message are required.' });
  }

  const notification = {
    id: `notification-${Date.now()}`,
    subject,
    message,
    createdAt: new Date().toISOString(),
  };

  const delivery = await broadcastNotification(subject, message);
  notificationStore.unshift({ ...notification, delivery });
  writeJson(notificationFile, notificationStore);

  return res.status(201).json({ ok: true, notification: { ...notification, delivery } });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/coming-soon.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'coming-soon.html'));
});

app.get('/waitlist.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'waitlist.html'));
});

app.get('/thank-you.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'thank-you.html'));
});

app.listen(PORT, () => {
  console.log(`dots. API running on http://localhost:${PORT}`);
});
