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

    gsap.registerPlugin(ScrollTrigger, TextPlugin);

    // --- 2. THE GOLDEN DOT ZOOM & SCATTER ---
    const heroTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#hero-scene",
            start: "top top",
            end: "+=400%", // Pin for 4 screen heights for an epic sequence
            pin: true,
            scrub: 1
        }
    });

    // A. Zoom into the Golden Dot (Calculated exact center: 95.3% 71.5%)
    heroTl.to("#hero-svg", {
        scale: 250, 
        transformOrigin: "95.3% 71.5%", 
        ease: "power2.inOut"
    })
    // B. Fade out black letters, turn background gold
    .to("#black-letters", { opacity: 0, duration: 0.1 }, "-=0.3")
    .to("#hero-scene", { backgroundColor: "#d0a84f", duration: 0.2 }, "-=0.3")
    // C. Typewriter Effect
    .to("#typewriter-container", { opacity: 1, duration: 0.1 })
    .to("#typed-text", {
        text: "Thoughtful products for everyday life.",
        duration: 0.8,
        ease: "none"
    })
    // D. Scatter the letters (Explosion)
    .to("#typed-text", {
        scale: 4,
        opacity: 0,
        filter: "blur(20px)",
        duration: 0.6,
        ease: "power2.in"
    })
    .to("#scatter-text-wrapper", { display: "block", opacity: 1, duration: 0.2 });

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
    
    tlPin.from(".pin-cards > div", {
        y: window.innerHeight,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out"
    });

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
    
    function calculateImpact() {
        if (!sliderPeople) return;
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        document.getElementById('val-people').innerText = people;
        document.getElementById('val-months').innerText = months;

        const totalTubes = Math.round(people * (months * 0.5));
        const totalWater = (totalTubes * 0.1).toFixed(1);

        document.getElementById('out-tubes').innerHTML = totalTubes;
        document.getElementById('out-water').innerHTML = totalWater;
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