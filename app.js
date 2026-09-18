document.addEventListener('DOMContentLoaded', () => {
  const isLocalStaticPreview = window.location.protocol === 'file:'
    || (window.location.hostname === 'localhost' && window.location.port === '8000');
  const apiOrigin = isLocalStaticPreview ? 'http://localhost:3000' : window.location.origin;

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
