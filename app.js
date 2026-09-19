import { impactMetrics } from './data/impact.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Dark/Light Nav Logo Switcher ---
    const navbar = document.getElementById('navbar');
    const navLogoLight = document.getElementById('nav-logo-light');
    const navLogoDark = document.getElementById('nav-logo-dark');
    const navLink = document.getElementById('nav-link');
    const darkSection = document.getElementById('dark-section');

    window.addEventListener('scroll', () => {
        // Glassmorphism on scroll
        if (window.scrollY > 50) {
            navbar.classList.add('bg-white/80', 'backdrop-blur-md', 'border-b', 'border-gray-200/50');
        } else {
            navbar.classList.remove('bg-white/80', 'backdrop-blur-md', 'border-b', 'border-gray-200/50');
        }

        // Detect if dark section is behind navbar to swap logos
        if (darkSection) {
            const rect = darkSection.getBoundingClientRect();
            // If the top of the dark section is above the nav AND bottom is below the nav
            if (rect.top <= 80 && rect.bottom >= 50) {
                navLogoLight.style.opacity = '0';
                navLogoDark.style.opacity = '1';
                navLink.classList.replace('text-gray-900', 'text-white');
                navbar.classList.remove('bg-white/80', 'border-gray-200/50');
                navbar.classList.add('bg-black/50', 'border-gray-800/50');
            } else {
                navLogoLight.style.opacity = '1';
                navLogoDark.style.opacity = '0';
                navLink.classList.replace('text-white', 'text-gray-900');
                navbar.classList.remove('bg-black/50', 'border-gray-800/50');
            }
        }
    });

    // --- 2. 3D Mouse Tracking for Bento Cards ---
    const cards = document.querySelectorAll('.bento-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -5; // Max rotation 5deg
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });

    // --- 3. Scroll Parallax Engine ---
    const parallaxElements = document.querySelectorAll('.parallax-element');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        parallaxElements.forEach(el => {
            const speed = el.getAttribute('data-speed');
            el.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // --- 4. Entrance Reveals ---
    const reveals = document.querySelectorAll('.reveal-up');
    setTimeout(() => {
        reveals.forEach(el => el.classList.add('active'));
    }, 100);

    // --- 5. Impact Counters Animation ---
    const plasticCounter = document.getElementById('plastic-counter');
    const freightCounter = document.getElementById('freight-counter');
    
    const animateValue = (obj, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 4); // Quartic ease out
            obj.innerHTML = Math.floor(easeOut * (end - start) + start).toLocaleString();
            if (progress < 1) window.requestAnimationFrame(step);
            else obj.innerHTML = end.toLocaleString();
        };
        window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateValue(plasticCounter, 0, impactMetrics.plasticGramsAvoided, 2500);
                animateValue(freightCounter, 0, impactMetrics.freightKgReduced, 2500);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    if (plasticCounter) observer.observe(plasticCounter.closest('section'));

    // --- 6. Waitlist API Hook ---
    const waitlistForm = document.getElementById('waitlistForm');
    const waitlistBtn = document.getElementById('waitlistBtn');
    const waitlistMsg = document.getElementById('waitlistMsg');

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('waitlistEmail').value;
            
            waitlistBtn.disabled = true;
            waitlistBtn.textContent = 'Joining...';
            waitlistMsg.classList.add('hidden');

            try {
                const response = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                if (response.ok) window.location.href = '/thank-you.html';
                else throw new Error(data.error || 'Failed to join waitlist.');
            } catch (error) {
                waitlistMsg.textContent = error.message;
                waitlistMsg.className = 'mt-4 text-sm font-medium text-red-500 block';
                waitlistBtn.disabled = false;
                waitlistBtn.textContent = 'Join';
            }
        });
    }
});