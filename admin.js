document.addEventListener('DOMContentLoaded', () => {
  const login = document.querySelector('[data-admin-login]');
  const consolePanel = document.querySelector('[data-admin-console]');
  const tokenInput = document.querySelector('[data-admin-token]');
  const unlockButton = document.querySelector('[data-admin-unlock]');
  const form = document.querySelector('[data-admin-form]');
  const statusNodes = document.querySelectorAll('[data-admin-status]');
  const historyNode = document.querySelector('[data-admin-history]');
  const audienceNode = document.querySelector('[data-admin-audience]');
  const waitlistNode = document.querySelector('[data-admin-waitlist]');
  const exportButton = document.querySelector('[data-admin-export]');
  
  consolePanel.hidden = true;
  login.hidden = false;
  
  let token = sessionStorage.getItem('dots-admin-pat') || '';
  if (token) tokenInput.value = token;

  const setStatus = (message, isError = false) => {
    statusNodes.forEach((node) => {
      node.textContent = message;
      node.hidden = !message;
      node.style.color = isError ? '#520a1e' : '#2b5d3f';
    });
  };

  const request = async (url, options = {}) => {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
          ...(options.headers || {}),
        },
      });
    } catch {
      throw new Error('The Cloudflare admin API is unavailable.');
    }
    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json') ? await response.json() : { message: await response.text() };
    if (!response.ok) throw new Error(result.message || `Admin request failed (${response.status}).`);
    return result;
  };

  const renderHistory = (notifications) => {
    historyNode.replaceChildren();
    if (!notifications.length) {
      historyNode.innerHTML = '<p class="admin-empty">No notifications sent yet.</p>';
      return;
    }
    notifications.forEach((notification) => {
      const item = document.createElement('article');
      item.className = 'admin-history-item';
      item.innerHTML = `<strong></strong><time></time><div class="html-preview"></div><small></small>`;
      item.querySelector('strong').textContent = notification.subject;
      item.querySelector('time').textContent = new Date(notification.createdAt).toLocaleString();
      item.querySelector('.html-preview').innerHTML = notification.message; 
      item.querySelector('small').textContent = `${notification.delivery.sent} delivered${notification.delivery.failed ? `, ${notification.delivery.failed} failed` : ''}`;
      historyNode.appendChild(item);
    });
  };

  const renderWaitlist = (entries) => {
    waitlistNode.replaceChildren();
    if (!entries.length) {
      waitlistNode.innerHTML = '<tr><td colspan="4" class="admin-empty">No waitlist entries yet.</td></tr>';
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement('tr');
      const emailDisplay = entry.unsubscribed ? `${entry.email} (Unsubscribed)` : entry.email;
      
      [entry.fullName, emailDisplay, entry.interest || entry.category || '—', new Date(entry.createdAt).toLocaleDateString()].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (entry.unsubscribed) cell.style.color = '#999'; 
        row.appendChild(cell);
      });
      waitlistNode.appendChild(row);
    });
  };

  const unlock = async () => {
    const pastedToken = tokenInput.value.trim();
    token = pastedToken || token;
    
    if (!token) return setStatus('Enter your GitHub PAT to unlock the console.', true);

    try {
      setStatus('Authenticating with GitHub...');
      const result = await request('/api/admin/notifications');
      const audience = await request('/api/admin/waitlist');
      
      sessionStorage.setItem('dots-admin-pat', token);
      
      login.hidden = true;
      consolePanel.hidden = false;
      
      renderHistory(result.notifications);
      renderWaitlist(audience.waitlist);
      
      const activeCount = audience.waitlist.filter(user => !user.unsubscribed).length;
      audienceNode.textContent = `${activeCount} active waitlist member(s)`;
      
      setStatus('');
    } catch (error) {
      setStatus(error.message, true);
    }
  };

  unlockButton.addEventListener('click', unlock);
  tokenInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') unlock();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus('Sending notification…');

    try {
      const result = await request('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      form.reset();
      setStatus(`${result.notification.delivery.sent} notification(s) delivered.`);
      const history = await request('/api/admin/notifications');
      renderHistory(history.notifications);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });

  exportButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/admin/waitlist.csv', { headers: { 'x-admin-token': token } });
      if (!response.ok) throw new Error('Could not export the waitlist.');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'dots-waitlist.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  if (token) unlock();
});