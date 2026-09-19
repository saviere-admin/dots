// --- Authentication Management ---
const authOverlay = document.getElementById('authOverlay');
const mainApp = document.getElementById('mainApp');
const authForm = document.getElementById('authForm');
const logoutBtn = document.getElementById('logoutBtn');

// Check session on load
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('dots_admin_pwd') && sessionStorage.getItem('dots_github_pat')) {
        unlockConsole();
    }
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = document.getElementById('modalPassword').value;
    const pat = document.getElementById('modalPat').value;
    
    if(pwd && pat) {
        sessionStorage.setItem('dots_admin_pwd', pwd);
        sessionStorage.setItem('dots_github_pat', pat);
        unlockConsole();
    }
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('dots_admin_pwd');
    sessionStorage.removeItem('dots_github_pat');
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalPat').value = '';
    mainApp.style.display = 'none';
    authOverlay.style.display = 'flex';
    document.title = 'dots. | Restricted Node';
});

function unlockConsole() {
    authOverlay.style.display = 'none';
    mainApp.style.display = 'block';
    document.title = 'dots. | Communication Console';
}

// Helper to pull stored credentials for API calls
const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': sessionStorage.getItem('dots_admin_pwd') || '',
    'X-GitHub-Pat': sessionStorage.getItem('dots_github_pat') || ''
});


// --- Email Dispatch Logic ---
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

async function dispatchEmail(payload) {
    try {
        const response = await fetch('/api/send-mail', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            alert('Email dispatched successfully.');
            // Optional: Clear forms on success
            // document.getElementById('waitlistForm').reset();
            // document.getElementById('customForm').reset();
        } else if (response.status === 401 || response.status === 403) {
            alert('Authentication failed. Your session credentials are invalid.');
            logoutBtn.click(); // Force them back to the login screen
        } else {
            const errData = await response.text();
            alert(`Failed to send: ${errData}`);
        }
    } catch (err) {
        console.error(err);
        alert('Network error. Check console and CORS settings.');
    }
}