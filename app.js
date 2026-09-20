document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Lenis Smooth Scrolling
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

    gsap.registerPlugin(ScrollTrigger);

    // 2. THE STENCIL ZOOM EFFECT
    const stencilTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#stencil-scene",
            start: "top top",
            end: "+=350%", 
            pin: true,
            scrub: 1
        }
    });

    stencilTl.to("#stencil-text", {
        scale: 250, 
        transformOrigin: "35% 50%", 
        ease: "power2.inOut"
    })
    .to("#stencil-mask", {
        opacity: 0,
        duration: 0.1
    }, "-=0.2")
    .to("#post-zoom-content", {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.5
    });

    // 3. Pinned Section: The Habit Cards
    const tlPin = gsap.timeline({
        scrollTrigger: {
            trigger: "#habit-pin",
            start: "top top",
            end: "+=120%",
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

    // 4. Content Reveals
    gsap.utils.toArray('.gs-fade').forEach(elem => {
        gsap.from(elem, {
            y: 50, opacity: 0, duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    gsap.utils.toArray('.gs-scale').forEach(elem => {
        gsap.from(elem, {
            scale: 0.95, opacity: 0, duration: 1.5, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // 5. Interactive 3D Cards
    document.querySelectorAll('.3d-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            card.style.transform = `perspective(1000px) rotateX(${-y / 25}deg) rotateY(${x / 25}deg) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    });

    // 6. Live Architecture Calculator
    const sliderPeople = document.getElementById('slider-people');
    const sliderMonths = document.getElementById('slider-months');
    const outTubes = document.getElementById('out-tubes');
    const outPlastic = document.getElementById('out-plastic');
    const outWater = document.getElementById('out-water');

    function calculateImpact() {
        if (!sliderPeople) return;
        
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        document.getElementById('val-people').innerText = people;
        document.getElementById('val-months').innerText = months;

        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlastic = totalTubes * 20;
        const totalWater = (totalTubes * 0.1).toFixed(1);

        gsap.to(outTubes, { innerHTML: totalTubes, roundProps: "innerHTML", duration: 0.6, ease: "power2.out" });
        gsap.to(outPlastic, { innerHTML: totalPlastic, roundProps: "innerHTML", duration: 0.6, ease: "power2.out" });
        
        let dummy = { val: parseFloat(outWater.innerText) || 0 };
        gsap.to(dummy, {
            val: totalWater, duration: 0.6, ease: "power2.out",
            onUpdate: function() { outWater.innerText = this.targets()[0].val.toFixed(1); }
        });
    }

    if (sliderPeople) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); 
    }

    // 7. Waitlist API Hook (Foolproof form handling)
    const waitlistForm = document.getElementById('waitlistForm');
    if (waitlistForm) {
        const btn = document.getElementById('waitlistBtn');
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('waitlistEmail').value;
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