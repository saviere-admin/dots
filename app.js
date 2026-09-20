document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Lenis Smooth Scrolling (Buttery Experience) ---
    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        wheelMultiplier: 1,
    });
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- 2. GSAP Advanced Scroll Animations ---
    gsap.registerPlugin(ScrollTrigger);

    // Hero 3D Entrance
    gsap.from(".hero-text", {
        y: 100, 
        opacity: 0, 
        duration: 1.5, 
        stagger: 0.15, 
        ease: "power4.out", 
        delay: 0.2
    });
    gsap.to(".hero-bg", {
        scale: 1, 
        opacity: 0.2, 
        ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });

    // Pinned Section: The Habit
    const tlPin = gsap.timeline({
        scrollTrigger: {
            trigger: "#habit-pin",
            start: "top top",
            end: "+=100%", // Pin for 1 screen height
            pin: true,
            scrub: 1
        }
    });
    tlPin.from(".pin-cards .tilt-card", {
        y: window.innerHeight,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out"
    });

    // Dark Section Text Reveals
    gsap.utils.toArray('.gs-dark').forEach(elem => {
        gsap.from(elem, {
            y: 80, opacity: 0, duration: 1.5, ease: "power4.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });
    gsap.from(".gs-dark-scale", {
        scale: 0.8, opacity: 0, duration: 2, ease: "power3.out",
        scrollTrigger: { trigger: ".gs-dark-scale", start: "top 80%" }
    });

    // Calculator Section Reveals
    gsap.from(".gs-calc", {
        y: 60, opacity: 0, duration: 1.2, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: "#impact", start: "top 80%" }
    });
    gsap.from(".gs-calc-card", {
        y: 100, opacity: 0, duration: 1.5, ease: "power4.out",
        scrollTrigger: { trigger: ".gs-calc-card", start: "top 85%" }
    });

    // Simple Up Reveals
    gsap.utils.toArray('.gs-up').forEach(elem => {
        gsap.from(elem, {
            y: 50, opacity: 0, duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // --- 3. Interactive 3D Card Tilt ---
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            // 3D rotation math
            card.style.transform = `perspective(1000px) rotateX(${-y / 20}deg) rotateY(${x / 20}deg) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    });

    // --- 4. Live Architecture Calculator ---
    const sliderPeople = document.getElementById('slider-people');
    const sliderMonths = document.getElementById('slider-months');
    const valPeople = document.getElementById('val-people');
    const valMonths = document.getElementById('val-months');
    const outTubes = document.getElementById('out-tubes');
    const outPlastic = document.getElementById('out-plastic');
    const outWater = document.getElementById('out-water');

    function calculateImpact() {
        if (!sliderPeople || !sliderMonths) return;
        
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        valPeople.innerText = people;
        valMonths.innerText = months;

        // Formula: 1 person = 1 tube every 2 months = 0.5 tubes/month.
        // 1 tube = 20g plastic. 1 tube = 0.1 liters water.
        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlastic = totalTubes * 20;
        const totalWater = (totalTubes * 0.1).toFixed(1);

        // GSAP counter animation for buttery number updates
        gsap.to(outTubes, { innerHTML: totalTubes, roundProps: "innerHTML", duration: 0.8, ease: "power3.out" });
        gsap.to(outPlastic, { innerHTML: totalPlastic, roundProps: "innerHTML", duration: 0.8, ease: "power3.out" });
        
        let dummy = { val: parseFloat(outWater.innerText) || 0 };
        gsap.to(dummy, {
            val: totalWater, duration: 0.8, ease: "power3.out",
            onUpdate: function() { outWater.innerText = this.targets()[0].val.toFixed(1); }
        });
    }

    if (sliderPeople && sliderMonths) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); // Initial calculation
    }

    // --- 5. Waitlist API Hook ---
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
                msg.className = 'mt-6 text-lg font-medium text-red-500 block';
                btn.disabled = false; btn.textContent = 'Request Access';
            }
        });
    }
});