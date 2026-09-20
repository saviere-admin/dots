document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Lenis Smooth Scrolling
    try {
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
    } catch(e) { console.error("Lenis error:", e); }

    gsap.registerPlugin(ScrollTrigger);

    // --- 2. THE GOLDEN DOT ZOOM EFFECT ---
    const stencilTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#zoom-scene",
            start: "top top",
            end: "+=350%", // Pin for 3.5 screen heights for a long, luxurious zoom
            pin: true,
            scrub: 1
        }
    });

    // We scale the SVG up by 150x. 
    // The exact center of the golden dot in your SVG is at X: 93.67%, Y: 71.61%
    stencilTl.to("#hero-svg", {
        scale: 150, 
        transformOrigin: "93.67% 71.61%", 
        ease: "power2.inOut"
    })
    .to("#svg-container", {
        opacity: 0,
        duration: 0.1
    }, "-=0.2")
    .to("#post-zoom-content", {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.5
    });
    // Color transition to match the golden dot
    gsap.to("#zoom-scene", {
        backgroundColor: "#d0a84f",
        scrollTrigger: {
            trigger: "#zoom-scene",
            start: "top top",
            end: "+=350%",
            scrub: 1
        }
    });

    // --- 3. Pinned Section: The Habit Cards ---
    const tlPin = gsap.timeline({
        scrollTrigger: {
            trigger: "#habit-pin",
            start: "top top",
            end: "+=120%",
            pin: true,
            scrub: 1
        }
    });
    
    // Counter animations for the numbers
    tlPin.to(".pin-cards .text-6xl", {
        innerHTML: function(i) { return [365, 2, 730][i]; },
        roundProps: "innerHTML",
        duration: 1.5,
        ease: "power2.out",
        stagger: 0.2
    }, 0);

    // --- 4. Content Reveals ---
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

    // --- 5. Interactive 3D Cards ---
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

    // --- 6. Live Architecture Calculator ---
    const sliderPeople = document.getElementById('slider-people');
    const sliderMonths = document.getElementById('slider-months');
    const outTubes = document.getElementById('out-tubes');
    const outWater = document.getElementById('out-water');

    function calculateImpact() {
        if (!sliderPeople) return;
        
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        document.getElementById('val-people').innerText = people;
        document.getElementById('val-months').innerText = months;

        const totalTubes = Math.round(people * (months * 0.5));
        const totalWater = (totalTubes * 0.1).toFixed(1);

        gsap.to(outTubes, { innerHTML: totalTubes, roundProps: "innerHTML", duration: 0.6, ease: "power2.out" });
        
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

    // --- 7. Waitlist API (With Name) ---
    const waitlistForm = document.getElementById('waitlistForm');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('waitlistName').value.trim();
            const email = document.getElementById('waitlistEmail').value.trim();
            const btn = document.getElementById('waitlistBtn');
            const msg = document.getElementById('waitlistMsg');
            
            btn.disabled = true; btn.textContent = 'Processing...';
            msg.classList.add('hidden');

            try {
                const response = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email })
                });
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error || 'Failed to join waitlist.');

                waitlistForm.classList.add('hidden');
                msg.innerHTML = `<span class="text-4xl block mb-4">✨</span> Welcome to the dots. family, <b>${name}</b>.<br/>You're officially on the list.`;
                msg.className = 'mt-8 text-xl text-gray-600 block animate-[fadeInUp_0.5s_ease-out]';
                
            } catch (error) {
                msg.textContent = error.message;
                msg.className = 'mt-6 text-lg font-medium text-red-500 block';
                btn.disabled = false; btn.textContent = 'Request Access';
            }
        });
    }
});