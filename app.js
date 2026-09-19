import { impactMetrics } from './data/impact.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Impact Counters Animation ---
    const plasticCounter = document.getElementById('plastic-counter');
    const freightCounter = document.getElementById('freight-counter');
    
    const animateValue = (obj, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            obj.innerHTML = Math.floor(easeOut * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end.toLocaleString();
            }
        };
        window.requestAnimationFrame(step);
    };

    // Intersection Observer to trigger animation when scrolled into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateValue(plasticCounter, 0, impactMetrics.plasticGramsAvoided, 2000);
                animateValue(freightCounter, 0, impactMetrics.freightKgReduced, 2000);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const impactSection = plasticCounter.closest('section');
    if (impactSection) observer.observe(impactSection);


    // --- Waitlist Form Submission ---
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

                if (response.ok) {
                    window.location.href = '/thank-you.html';
                } else {
                    throw new Error(data.error || 'Failed to join waitlist.');
                }
            } catch (error) {
                waitlistMsg.textContent = error.message;
                waitlistMsg.className = 'mt-4 text-sm font-medium text-red-500 block';
                waitlistBtn.disabled = false;
                waitlistBtn.textContent = 'Join';
            }
        });
    }
});