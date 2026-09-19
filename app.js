document.addEventListener('DOMContentLoaded', () => {
  const isLocalStaticPreview = window.location.protocol === 'file:'
    || (window.location.hostname === 'localhost' && window.location.port === '8000');
  const apiOrigin = isLocalStaticPreview ? 'http://localhost:3000' : window.location.origin;

  // Resilient VAPID key decoder that handles unpadded URL-safe Base64 safely
  const urlBase64ToUint8Array = (base64String) => {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('VAPID public key is empty or invalid.');
    }
    const cleanString = base64String.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();
    const padding = '='.repeat((4 - (cleanString.length % 4)) % 4);
    const base64 = (cleanString + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePushNotifications = async (button) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      button.textContent = 'Updates unavailable in this browser';
      return;
    }

    button.disabled = true;
    button.textContent = 'Enabling updates…';

    try {
      const configResponse = await fetch(`${apiOrigin}/api/push-config`);
      const config = await configResponse.json();
      if (!config.publicKey) throw new Error('Push notifications are not configured yet.');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');

      const registration = await navigator.serviceWorker.register('./sw.js');

      const applicationServerKey = urlBase64ToUint8Array(config.publicKey);
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const response = await fetch(`${apiOrigin}/api/push-subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) throw new Error('Could not save notification preferences.');

      button.textContent = 'Updates enabled';
    } catch (error) {
      button.disabled = false;
      button.textContent = error.message || 'Enable product updates';
    }
  };

  if ('Notification' in window && 'serviceWorker' in navigator) {
    const notificationButton = document.createElement('button');
    notificationButton.className = 'notification-optin';
    notificationButton.type = 'button';
    notificationButton.textContent = 'Enable product updates';
    notificationButton.addEventListener('click', () => enablePushNotifications(notificationButton));
    document.body.appendChild(notificationButton);
  }

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

    document.addEventListener('click', (event) => {
      if (!mainNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  const waitlistModal = document.querySelector('[data-waitlist-modal]');
  const waitlistOpen = document.querySelector('[data-waitlist-open]');
  const waitlistCloseButtons = document.querySelectorAll('[data-waitlist-close]');

  if (waitlistModal && waitlistOpen) {
    const modalForm = waitlistModal.querySelector('input');

    const closeWaitlist = () => {
      waitlistModal.hidden = true;
      document.body.classList.remove('modal-open');
      waitlistOpen.focus();
    };

    waitlistOpen.addEventListener('click', () => {
      waitlistModal.hidden = false;
      document.body.classList.add('modal-open');
      window.setTimeout(() => modalForm?.focus(), 50);
    });

    waitlistCloseButtons.forEach((button) => {
      button.addEventListener('click', closeWaitlist);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !waitlistModal.hidden) closeWaitlist();
    });
  }

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
      const email = String(payload.email || '').trim();
      const fullName = String(payload.fullName || payload.name || '').trim();

      if (!email || !fullName) {
        setStatus(form, 'Please add your name and email to continue.', true);
        return;
      }

      setStatus(form, 'Submitting your interest…');

      try {
        const response = await fetch(`${apiOrigin}/api/waitlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullName,
            email,
            phone: payload.phone || '',
            category: payload.category || '',
            interest: payload.interest || '',
            notes: payload.notes || '',
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Submission failed.');
        }

        form.reset();

        if (form.dataset.redirect === 'true' || window.location.pathname.endsWith('/waitlist.html') || window.location.pathname.endsWith('/coming-soon.html')) {
          window.location.href = './thank-you.html';
          return;
        }

        setStatus(form, 'You’re on the early access list.', false);
      } catch (error) {
        const message = error instanceof TypeError
          ? 'The waitlist service is unavailable. Please try again in a moment.'
          : error.message || 'Something went wrong. Please try again.';
        setStatus(form, message, true);
      }
    });
  });

  const countNode = document.querySelector('[data-waitlist-count]');
  if (countNode) {
    fetch(`${apiOrigin}/api/health`)
      .then((res) => res.json())
      .then(() => {
        countNode.textContent = 'Early access now open';
      })
      .catch(() => {
        countNode.textContent = 'Early access now open';
      });
  }
});