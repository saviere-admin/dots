const HARDCODED_ADMIN_PWD = "9885679895P@$79895w0rd1204002040";

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    
    // Check if session is already active
    if (sessionStorage.getItem('dots_admin_pwd') === HARDCODED_ADMIN_PWD && sessionStorage.getItem('dots_github_pat')) {
        renderDashboard();
    } else if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pwd = document.getElementById('modalPassword').value.trim();
            const pat = document.getElementById('modalPat').value.trim();
            
            if (pwd !== HARDCODED_ADMIN_PWD) {
                alert("Access Denied: Invalid Editorial Passcode.");
                document.getElementById('modalPassword').value = '';
                return;
            }
            
            sessionStorage.setItem('dots_admin_pwd', pwd);
            sessionStorage.setItem('dots_github_pat', pat);
            renderDashboard();
        });
    }
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Admin-Password': sessionStorage.getItem('dots_admin_pwd') || '',
        'X-GitHub-Pat': sessionStorage.getItem('dots_github_pat') || ''
    };
}

function renderDashboard() {
    document.title = 'dots. | Editorial Console';
    document.body.className = 'dash-body'; 
    
    document.body.innerHTML = `
        <div class="container">
            <div class="header">
                <div class="logo-container">
                    <img src="https://usedots.in/public/brand/logos/dh/DotsTBWTWoS.png" alt="dots. logo" class="logo">
                </div>
                <h1>Communication Console</h1>
                <button class="logout-btn" id="logoutBtn">Lock Console</button>
            </div>

            <div class="card">
                <h2>Waitlist & System Notifications</h2>
                <form id="waitlistForm">
                    <div class="form-group">
                        <label>Subject</label>
                        <input type="text" class="dash-input" id="wlSubject" placeholder="Update from dots." required>
                    </div>
                    <div class="form-group">
                        <label>Select Recipients (Hold CMD/CTRL for multiple)</label>
                        <select id="wlRecipients" class="dash-input" multiple size="3">
                            <option value="all">Entire Waitlist Database</option>
                            <option value="cohort_1">Cohort 1 (Early Access)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Exclude Emails (Comma separated)</label>
                        <input type="text" class="dash-input" id="wlExclude" placeholder="spam@domain.com">
                    </div>
                    <div class="form-group">
                        <label>Add Extra Mailing Addresses (Comma separated)</label>
                        <input type="text" class="dash-input" id="wlExtra" placeholder="investors@example.com">
                    </div>
                    <div class="form-group">
                        <label>Message Payload (Wrapped in dots. branding)</label>
                        <textarea id="wlMessage" class="dash-input" rows="6" placeholder="Type your update here..." required></textarea>
                    </div>
                    <button type="submit" class="action-btn">Broadcast Notification</button>
                </form>
            </div>

            <div class="card">
                <h2>Dispatch Custom Email</h2>
                <form id="customForm">
                    <div class="form-group">
                        <label>Sender Address</label>
                        <input type="email" class="dash-input" id="customSender" value="hello@usedots.in" required>
                    </div>
                    <div class="form-group">
                        <label>Recipient Address</label>
                        <input type="email" class="dash-input" id="customRecipient" placeholder="user@domain.com" required>
                    </div>
                    <div class="form-group">
                        <label>Subject</label>
                        <input type="text" class="dash-input" id="customSubject" placeholder="Welcome to dots." required>
                    </div>
                    <div class="form-group">
                        <label>Message Payload (Wrapped in dots. branding)</label>
                        <textarea id="customMessage" class="dash-input" rows="6" required></textarea>
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="customTrack" checked>
                        <label style="margin:0;">Enable Analytics Tracking</label>
                    </div>
                    <button type="submit" class="action-btn">Dispatch Email</button>
                </form>
            </div>
            
            <div class="dash-footer">
                Cruelty-Free &bull; Waterless &bull; Clinical Precision<br>
                &copy; 2026 dots. All rights reserved. A brand of Savière Group Private Limited.
            </div>
        </div>
    `;

    bindDashboardEvents();
}

function bindDashboardEvents() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.reload(); 
    });

    document.getElementById('waitlistForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = 'Dispatching...';

        const payload = {
            type: 'notification',
            subject: document.getElementById('wlSubject').value,
            targetList: Array.from(document.getElementById('wlRecipients').selectedOptions).map(o => o.value),
            extraEmails: document.getElementById('wlExtra').value.split(',').map(email => email.trim()).filter(Boolean),
            excludeEmails: document.getElementById('wlExclude').value.split(',').map(email => email.trim()).filter(Boolean),
            message: document.getElementById('wlMessage').value
        };

        await dispatchEmail(payload);
        btn.innerText = originalText;
    });

    document.getElementById('customForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = 'Dispatching...';

        const payload = {
            type: 'custom',
            sender: document.getElementById('customSender').value,
            recipient: document.getElementById('customRecipient').value,
            subject: document.getElementById('customSubject').value,
            message: document.getElementById('customMessage').value,
            trackOpens: document.getElementById('customTrack').checked
        };

        await dispatchEmail(payload);
        btn.innerText = originalText;
    });
}

async function dispatchEmail(payload) {
    try {
        const response = await fetch('/api/send-mail', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            alert('Email dispatched successfully.');
        } else if (response.status === 401 || response.status === 403) {
            alert('Authentication failed at Edge. Session invalidated.');
            sessionStorage.clear();
            window.location.reload(); 
        } else {
            const errData = await response.text();
            alert(`Failed to send: ${errData}`);
        }
    } catch (err) {
        console.error(err);
        alert('Network error. Check console for details.');
    }
}