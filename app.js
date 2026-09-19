document.addEventListener('DOMContentLoaded', () => {
  const isLocalStaticPreview = window.location.protocol === 'file:'
    || (window.location.hostname === 'localhost' && window.location.port === '8000');
  const apiOrigin = isLocalStaticPreview ? 'http://localhost:3000' : window.location.origin;

  // --- 1. UTILITIES ---
  const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  };

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  // Clean base64 URL decoder with strict error handling & padding (Fixes atob error)
  function safeUrlBase64ToUint8Array(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Push configuration missing on server.');
    }
    const sanitized = base64String.replace(/["'\s\u200B-\u200D\uFEFF]/g, '').trim();
    const padding = '='.repeat((4 - (sanitized.length % 4)) % 4);
    const base64 = (sanitized + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // --- 2. PUSH NOTIFICATIONS ---
  const subscribeUserToPush = async (triggerElement) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    try {
      const configResponse = await fetch(`${apiOrigin}/api/push-config`);
      if (!configResponse.ok) throw new Error('Push configuration service unavailable.');
      const config = await configResponse.json();
      if (!config || !config.publicKey) throw new Error('Push service key not configured.');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;

      const applicationServerKey = safeUrlBase64ToUint8Array(config.publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      await fetch(`${apiOrigin}/api/push-subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setCookie('dots_push_subscribed', 'true', 365);
    } catch (error) {
      console.error('Push error:', error);
    }
  };

  const initFirstVisitPrompt = () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (getCookie('dots_notification_prompted') || Notification.permission === 'denied' || Notification.permission === 'granted') return;

    window.setTimeout(() => {
      setCookie('dots_notification_prompted', 'true', 90);

      const promptDialog = document.createElement('div');
      promptDialog.className = 'dots-push-dialog';
      promptDialog.innerHTML = `
        <div class="dots-push-content">
          <p><strong>Stay updated on dots.</strong><br/>Receive release dates and clinical oral care dispatches.</p>
          <div class="dots-push-actions">
            <button type="button" id="dots-push-dismiss">Not now</button>
            <button type="button" id="dots-push-confirm">Enable updates</button>
          </div>
        </div>
      `;
      document.body.appendChild(promptDialog);

      document.getElementById('dots-push-dismiss')?.addEventListener('click', () => {
        promptDialog.remove();
      });

      document.getElementById('dots-push-confirm')?.addEventListener('click', async () => {
        const confirmBtn = document.getElementById('dots-push-confirm');
        await subscribeUserToPush(confirmBtn);
        promptDialog.remove();
      });
    }, 3500);
  };

  initFirstVisitPrompt();

  // --- 3. NAVIGATION MENU ---
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (menuToggle && mainNav) {
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mainNav.classList.remove('is-open');
    };

    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
      mainNav.classList.toggle('is-open', !isOpen);
    });

    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
  }

  // --- 4. WAITLIST MODAL ---
  const waitlistModal = document.querySelector('[data-waitlist-modal]');
  const waitlistOpenButtons = document.querySelectorAll('[data-waitlist-open]');
  const waitlistCloseButtons = document.querySelectorAll('[data-waitlist-close]');

  if (waitlistModal && waitlistOpenButtons.length > 0) {
    const closeWaitlist = () => {
      waitlistModal.hidden = true;
      document.body.classList.remove('modal-open');
    };

    waitlistOpenButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        waitlistModal.hidden = false;
        document.body.classList.add('modal-open');
      });
    });

    waitlistCloseButtons.forEach((button) => {
      button.addEventListener('click', closeWaitlist);
    });
  }

  // --- 5. FORM SUBMISSION ---
  const forms = document.querySelectorAll('[data-waitlist-form]');
  
  const setStatus = (form, message, isError = false) => {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.textContent = message;
    status.hidden = false;
    status.style.color = isError ? '#520a1e' : '#2b5d3f';
  };

  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      
      setStatus(form, 'Submitting your interest…');

      try {
        const response = await fetch(`${apiOrigin}/api/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Submission failed.');

        form.reset();
        
        if (form.dataset.redirect === 'true') {
          window.location.href = './thank-you.html';
          return;
        }
        setStatus(form, 'You’re on the early access list.', false);
      } catch (error) {
        setStatus(form, 'Something went wrong. Please try again.', true);
      }
    });
  });
});