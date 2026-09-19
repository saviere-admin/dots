// Helper function to get auth headers
const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': document.getElementById('adminPassword').value,
    'X-GitHub-Pat': document.getElementById('githubPat').value
});

document.getElementById('waitlistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
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
    btn.innerText = 'Send Notification Broadcast';
});

document.getElementById('customForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
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
    btn.innerText = 'Send Custom Email';
});

async function dispatchEmail(payload) {
    // Basic validation to ensure credentials are typed in
    if (!document.getElementById('adminPassword').value || !document.getElementById('githubPat').value) {
        alert('Please enter your Admin Password and GitHub PAT at the top.');
        return;
    }

    try {
        const response = await fetch('/api/send-mail', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            alert('Email dispatched successfully.');
        } else if (response.status === 401 || response.status === 403) {
            alert('Authentication failed. Check your password and PAT.');
        } else {
            const errData = await response.text();
            alert(`Failed to send: ${errData}`);
        }
    } catch (err) {
        console.error(err);
        alert('Network error. Check console and CORS settings.');
    }
}