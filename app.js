document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Lenis Smooth Scrolling ---
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
    });
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- 2. GSAP Scroll Animations ---
    gsap.registerPlugin(ScrollTrigger);

    // Hero Entrance
    gsap.from(".hero-text", {
        y: 60, opacity: 0, duration: 1.5, stagger: 0.2, ease: "power4.out", delay: 0.2
    });
    // Parallax Hero BG
    gsap.to(".hero-bg", {
        yPercent: 40, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });

    // General Fade Ups
    gsap.utils.toArray('.gs-up').forEach(elem => {
        gsap.from(elem, {
            y: 50, opacity: 0, duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // Dark Section Reveals
    gsap.utils.toArray('.gs-reveal-dark').forEach(elem => {
        gsap.from(elem, {
            x: -40, opacity: 0, duration: 1.5, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 80%" }
        });
    });

    // 3D Card Hover Effect
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            card.style.transform = `perspective(1000px) rotateX(${-y / 15}deg) rotateY(${x / 15}deg) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    });

    // --- 3. Live Architecture Calculator ---
    const sliderPeople = document.getElementById('slider-people');
    const sliderMonths = document.getElementById('slider-months');
    const valPeople = document.getElementById('val-people');
    const valMonths = document.getElementById('val-months');
    const outTubes = document.getElementById('out-tubes');
    const outPlastic = document.getElementById('out-plastic');
    const outWater = document.getElementById('out-water');

    function calculateImpact() {
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        valPeople.innerText = people;
        valMonths.innerText = months;

        // Math: 1 person uses 1 tube every 2 months (0.5 tubes/month)
        // 1 tube = 20g unrecyclable plastic, 1 tube = 0.1 liters water
        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlastic = totalTubes * 20;
        const totalWater = (totalTubes * 0.1).toFixed(1);

        // GSAP Number Counter
        gsap.to(outTubes, { innerHTML: totalTubes, roundProps: "innerHTML", duration: 0.6, ease: "power2.out" });
        gsap.to(outPlastic, { innerHTML: totalPlastic, roundProps: "innerHTML", duration: 0.6, ease: "power2.out" });
        
        let dummy = { val: parseFloat(outWater.innerText) || 0 };
        gsap.to(dummy, {
            val: totalWater, duration: 0.6, ease: "power2.out",
            onUpdate: function() { outWater.innerText = this.targets()[0].val.toFixed(1); }
        });
    }

    if (sliderPeople && sliderMonths) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); 
    }

    // --- 4. Waitlist API ---
    const waitlistForm = document.getElementById('waitlistForm');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('waitlistEmail').value;
            const btn = document.getElementById('waitlistBtn');
            const msg = document.getElementById('waitlistMsg');
            
            btn.disabled = true; btn.textContent = 'Processing...';
            msg.classList.add('hidden');

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
                msg.textContent = error.message;
                msg.className = 'mt-4 text-sm font-medium text-red-500 block';
                btn.disabled = false; btn.textContent = 'Request Access';
            }
        });
    }
});