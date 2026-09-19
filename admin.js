const HARDCODED_ADMIN_PWD = "9885679895P@$79895w0rd1204002040";

// Check session on load
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('dots_admin_pwd') === HARDCODED_ADMIN_PWD && sessionStorage.getItem('dots_github_pat')) {
        renderDashboard();
    }
});

const authForm = document.getElementById('authForm');
if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = document.getElementById('modalPassword').value;
        const pat = document.getElementById('modalPat').value;
        
        if (pwd !== HARDCODED_ADMIN_PWD) {
            alert("Access Denied: Invalid Admin Password.");
            document.getElementById('modalPassword').value = '';
            return;
        }
        
        if(pwd && pat) {
            sessionStorage.setItem('dots_admin_pwd', pwd);
            sessionStorage.setItem('dots_github_pat', pat);
            renderDashboard();
        }
    });
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Admin-Password': sessionStorage.getItem('dots_admin_pwd') || '',
        'X-GitHub-Pat': sessionStorage.getItem('dots_github_pat') || ''
    };
}

// Dynamically injects the console into the DOM only after auth
function renderDashboard() {
    document.title = 'dots. | Communication Console';
    document.body.className = 'dash-body'; // Change body styling to remove centering
    
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
                        <label>Select Recipients (Hold CMD/CTRL to select multiple)</label>
                        <select id="wlRecipients" class="dash-input" multiple size="3">
                            <option value="all">Entire Waitlist Database</option>
                            <option value="cohort_1">Cohort 1 (Early Access)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Exclude Emails (Comma separated)</label>
                        <input type="text" class="dash-input" id="wlExclude" placeholder="spam@domain.com, test@usedots.in">
                    </div>
                    <div class="form-group">
                        <label>Add Extra Mailing Addresses (Comma separated)</label>
                        <input type="text" class="dash-input" id="wlExtra" placeholder="investors@example.com, pr@example.com">
                    </div>
                    <div class="form-group">
                        <label>Message (Will be wrapped in dots. branding)</label>
                        <textarea id="wlMessage" class="dash-input" rows="5" placeholder="Type your update here..." required></textarea>
                    </div>
                    <button type="submit" class="action-btn">Send Notification Broadcast</button>
                </form>
            </div>

            <div class="card">
                <h2>Send Custom Email</h2>
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
                        <label>Message (Will be wrapped in dots. branding)</label>
                        <textarea id="customMessage" class="dash-input" rows="5" required></textarea>
                    </div>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="customTrack" checked>
                        <label style="margin:0;">Enable Open & Click Tracking</label>
                    </div>
                    <button type="submit" class="action-btn">Send Custom Email</button>
                </form>
            </div>
        </div>
    `;

    bindDashboardEvents();
}

function bindDashboardEvents() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('dots_admin_pwd');
        sessionStorage.removeItem('dots_github_pat');
        window.location.reload(); // Reload forces the auth screen back cleanly
    });

    document.getElementById('waitlistForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = 'Sending...';

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
        btn.innerText = 'Sending...';

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
            alert('Authentication failed at Edge. Your session credentials are invalid.');
            window.location.reload(); 
        } else {
            const errData = await response.text();
            alert(`Failed to send: ${errData}`);
        }
    } catch (err) {
        console.error(err);
        alert('Network error. Check console and CORS settings.');
    }
}