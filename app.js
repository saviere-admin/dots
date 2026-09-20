document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Lenis Smooth Scrolling ---
    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        wheelMultiplier: 1.2,
    });
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- 2. GSAP Animations & Stencil Zoom ---
    gsap.registerPlugin(ScrollTrigger);

    // The Stencil Zoom Effect
    const stencilTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#stencil-wrapper",
            start: "top top",
            end: "+=250%", // Scroll distance for the zoom
            pin: true,     // Lock screen in place
            scrub: 1       // Smooth scrubbing
        }
    });

    // Scale the text massively so the transparent hole fills the screen
    stencilTl.to("#stencil-text", {
        scale: 150,
        transformOrigin: "center center",
        ease: "power2.inOut"
    })
    // Fade out the overlay to leave just the background image
    .to(".stencil-overlay", {
        opacity: 0,
        duration: 0.1
    }, "-=0.2")
    // Fade in the hero text over the background image
    .to("#hero-post-zoom", {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.5
    });

    // Pinned Section: The Habit Cards
    const tlPin = gsap.timeline({
        scrollTrigger: {
            trigger: "#habit-pin",
            start: "top top",
            end: "+=100%",
            pin: true,
            scrub: 1
        }
    });
    tlPin.from(".pin-cards > div", {
        y: window.innerHeight,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out"
    });

    // Standard Fade Ups
    gsap.utils.toArray('.gs-fade').forEach(elem => {
        gsap.from(elem, {
            y: 40, opacity: 0, duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // Scale effects
    gsap.utils.toArray('.gs-scale').forEach(elem => {
        gsap.from(elem, {
            scale: 0.9, opacity: 0, duration: 1.5, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
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
        if (!sliderPeople || !sliderMonths) return;
        
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        valPeople.innerText = people;
        valMonths.innerText = months;

        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlastic = totalTubes * 20;
        const totalWater = (totalTubes * 0.1).toFixed(1);

        gsap.to(outTubes, { innerHTML: totalTubes, roundProps: "innerHTML", duration: 0.5, ease: "power2.out" });
        gsap.to(outPlastic, { innerHTML: totalPlastic, roundProps: "innerHTML", duration: 0.5, ease: "power2.out" });
        
        let dummy = { val: parseFloat(outWater.innerText) || 0 };
        gsap.to(dummy, {
            val: totalWater, duration: 0.5, ease: "power2.out",
            onUpdate: function() { outWater.innerText = this.targets()[0].val.toFixed(1); }
        });
    }

    if (sliderPeople) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); 
    }

    // --- 4. Waitlist Hook ---
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