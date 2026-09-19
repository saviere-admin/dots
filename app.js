document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Smooth Scrolling (Lenis) ---
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

    // --- 2. GSAP Animations ---
    gsap.registerPlugin(ScrollTrigger);

    // Hero Animation
    gsap.from(".hero-elem", {
        y: 50,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.2
    });
    gsap.to(".hero-bg", {
        yPercent: 30,
        ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });

    // Staggered Reveals for light sections
    gsap.utils.toArray('.gs-reveal').forEach(elem => {
        gsap.from(elem, {
            y: 50, opacity: 0, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // Reveals for dark section
    gsap.utils.toArray('.gs-reveal-dark').forEach(elem => {
        gsap.from(elem, {
            y: 50, opacity: 0, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // --- 3. Interactive Impact Calculator ---
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
        
        // Update Labels
        valPeople.innerText = people;
        valMonths.innerText = months;

        // The Math: 
        // 1 person uses ~1 tube every 2 months (0.5 tubes/month)
        // 1 tube = 20g plastic
        // 1 tube = 0.1 liters (100ml) water weight
        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlasticGrams = totalTubes * 20;
        const totalWaterLiters = (totalTubes * 0.1).toFixed(1);

        // Animate numbers (using a quick GSAP counter)
        gsap.to(outTubes, { innerHTML: totalTubes, roundProps: "innerHTML", duration: 0.5, ease: "power2.out" });
        gsap.to(outPlastic, { innerHTML: totalPlasticGrams, roundProps: "innerHTML", duration: 0.5, ease: "power2.out" });
        
        // Water is a float, needs custom update
        let dummy = { val: parseFloat(outWater.innerText) || 0 };
        gsap.to(dummy, {
            val: totalWaterLiters, duration: 0.5, ease: "power2.out",
            onUpdate: function() { outWater.innerText = this.targets()[0].val.toFixed(1); }
        });
    }

    if (sliderPeople && sliderMonths) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); // Init
    }

    // --- 4. Waitlist API Hook ---
    const waitlistForm = document.getElementById('waitlistForm');
    const waitlistBtn = document.getElementById('waitlistBtn');
    const waitlistMsg = document.getElementById('waitlistMsg');

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('waitlistEmail').value;
            waitlistBtn.disabled = true;
            waitlistBtn.textContent = 'Processing...';
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
                waitlistBtn.textContent = 'Request Access';
            }
        });
    }
});