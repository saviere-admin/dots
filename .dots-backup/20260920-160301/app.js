document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Lenis Smooth Scrolling
    let lenis;
    try {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
            wheelMultiplier: 1,
        });
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    } catch(e) { console.error("Lenis init failed:", e); }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // --- NAVBAR HIDE/SHOW LOGIC ---
    const navbar = document.getElementById("navbar");
    let lastScrollY = window.scrollY;
    if(navbar) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 50) {
                if (window.scrollY > lastScrollY) {
                    navbar.style.transform = "translateY(-100%)";
                } else {
                    navbar.style.transform = "translateY(0)";
                }
            } else {
                navbar.style.transform = "translateY(0)";
            }
            lastScrollY = window.scrollY;
        });
    }

    // --- THE GOLDEN DOT ZOOM & SCATTER EXPERIENCE ---
    const textElement = document.getElementById("scatter-text");
    if(textElement) {
        const text = textElement.innerText;
        textElement.innerHTML = "";
        text.split(" ").forEach(word => {
            const wordSpan = document.createElement("span");
            wordSpan.className = "inline-block mr-[0.3em] whitespace-nowrap";
            word.split("").forEach(char => {
                const charSpan = document.createElement("span");
                charSpan.innerText = char;
                charSpan.className = "scatter-char inline-block opacity-0 translate-y-4";
                wordSpan.appendChild(charSpan);
            });
            textElement.appendChild(wordSpan);
        });
    }

    const heroScene = document.getElementById("hero-scene");
    if (heroScene) {
        const heroTl = gsap.timeline({
            scrollTrigger: {
                trigger: "#hero-scene",
                start: "top top",
                end: "+=400%", // Very long pin for full experience
                pin: true,
                scrub: 1
            }
        });

        // A. Zoom into the Golden Dot (Calculated exact center: 93.6% 71.6%)
        heroTl.to("#hero-svg", {
            scale: 180, 
            transformOrigin: "93.6% 71.6%", 
            ease: "power1.inOut",
            duration: 2
        })
        // B. Fade out black letters, turn background gold
        .to("#black-letters", { opacity: 0, duration: 0.1 }, "-=0.5")
        .to("#hero-scene", { backgroundColor: "#d0a84f", duration: 0.3 }, "-=0.5")
        
        // C. Reveal the container
        .to("#post-zoom-content", {
            opacity: 1,
            pointerEvents: "auto",
            duration: 0.1
        }, "-=0.2")

        // D. Typewriter / Fade up the individual letters
        .to(".scatter-char", {
            opacity: 1,
            y: 0,
            stagger: 0.02,
            duration: 0.5,
            ease: "back.out(1.7)"
        })
        .to("#hero-cta", { opacity: 1, y: 0, duration: 0.5 }, "-=0.2")

        // E. SCATTER EXPLOSION!
        .to(".scatter-char", {
            x: () => (Math.random() - 0.5) * 1200,
            y: () => (Math.random() - 0.5) * 1200,
            z: () => Math.random() * 800,
            rotationX: () => Math.random() * 720,
            rotationY: () => Math.random() * 720,
            opacity: 0,
            filter: "blur(15px)",
            stagger: 0.01,
            duration: 1.5,
            ease: "power3.inOut"
        })
        .to("#hero-cta, #hero-tagline", { opacity: 0, duration: 0.5 }, "-=1.5");
    }

    // --- Pinned Section: The Habit Cards ---
    if (window.innerWidth > 768 && document.getElementById("habit-pin")) {
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
    } else {
        // Simple fade up for mobile
        gsap.from(".pin-cards > div", {
            y: 50,
            opacity: 0,
            stagger: 0.2,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: ".pin-cards", start: "top 80%" }
        });
    }

    // --- General Reveals & Fixed Headers ---
    // Fix: We use 'from' so it guarantees to end at opacity 1, never disappearing.
    gsap.utils.toArray('.gs-fade, .gs-header-lock').forEach(elem => {
        gsap.from(elem, {
            y: 40, opacity: 0, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    gsap.utils.toArray('.gs-scale').forEach(elem => {
        gsap.from(elem, {
            scale: 0.95, opacity: 0, duration: 1.2, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
        });
    });

    // --- Interactive 3D Cards ---
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

    // --- Live Architecture Calculator ---
    const sliderPeople = document.getElementById('slider-people');
    const sliderMonths = document.getElementById('slider-months');
    
    function calculateImpact() {
        if (!sliderPeople || !sliderMonths) return;
        
        const people = parseInt(sliderPeople.value);
        const months = parseInt(sliderMonths.value);
        
        const valP = document.getElementById('val-people');
        const valM = document.getElementById('val-months');
        if(valP) valP.innerText = people;
        if(valM) valM.innerText = months;

        // Math: 1 person uses 1 tube / 2 months = 0.5 tubes/mo
        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlastic = totalTubes * 20;
        const totalWater = (totalTubes * 0.1).toFixed(1);

        const outPlastic = document.getElementById('out-tubes');
        const outFreight = document.getElementById('out-water');

        if(outPlastic) gsap.to(outPlastic, { innerHTML: totalPlastic, roundProps: "innerHTML", duration: 0.6, ease: "power2.out" });
        if(outFreight) {
            let dummy = { val: parseFloat(outFreight.innerText) || 0 };
            gsap.to(dummy, {
                val: totalWater, duration: 0.6, ease: "power2.out",
                onUpdate: function() { outFreight.innerText = this.targets()[0].val.toFixed(1); }
            });
        }
    }

    if (sliderPeople) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); // Init on load
    }

    // --- Waitlist API Hook ---
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
                msg.className = 'mt-6 text-sm font-medium text-red-500 block';
                btn.disabled = false; btn.textContent = 'Join Waitlist';
            }
        });
    }
});