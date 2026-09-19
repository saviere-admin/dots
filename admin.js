document.getElementById('waitlistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = 'Sending...';

    const payload = {
        type: 'notification',
        targetList: Array.from(document.getElementById('wlRecipients').selectedOptions).map(o => o.value),
        extraEmails: document.getElementById('wlExtra').value.split(',').map(email => email.trim()).filter(Boolean),
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
    try {
        const response = await fetch('/api/send-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(response.ok) {
            alert('Email dispatched successfully.');
        } else {
            alert('Failed to send. Check console.');
        }
    } catch (err) {
        console.error(err);
        alert('Network error.');
    }
}