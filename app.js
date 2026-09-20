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
    } catch(e) { console.error("Lenis error:", e); }

    gsap.registerPlugin(ScrollTrigger);

    // --- NAVBAR HIDE/SHOW LOGIC ---
    const navbar = document.getElementById("navbar");
    let lastScrollY = window.scrollY;
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            if (window.scrollY > lastScrollY) {
                // Scrolling down - hide navbar
                navbar.style.transform = "translateY(-100%)";
            } else {
                // Scrolling up - show frosted navbar
                navbar.style.transform = "translateY(0)";
            }
        } else {
            navbar.style.transform = "translateY(0)";
        }
        lastScrollY = window.scrollY;
    });

    // --- THE GOLDEN DOT ZOOM & SCATTER EXPERIENCE ---
    
    // Prepare the text for scattering by splitting it into spans
    const textElement = document.getElementById("scatter-text");
    if(textElement) {
        const text = textElement.innerText;
        textElement.innerHTML = "";
        text.split(" ").forEach(word => {
            const wordSpan = document.createElement("span");
            wordSpan.className = "inline-block mr-[0.2em] whitespace-nowrap";
            word.split("").forEach(char => {
                const charSpan = document.createElement("span");
                charSpan.innerText = char;
                charSpan.className = "scatter-char inline-block opacity-0 translate-y-4";
                wordSpan.appendChild(charSpan);
            });
            textElement.appendChild(wordSpan);
        });
    }

    const heroTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#hero-scene",
            start: "top top",
            end: "+=400%", // Very long pin for full experience
            pin: true,
            scrub: 1
        }
    });

    // A. Zoom into the Golden Dot (Calculated exact center: 93.5% 72%)
    heroTl.to("#hero-svg", {
        scale: 180, 
        transformOrigin: "93.5% 72%", 
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

    // E. SCATTER EXPLOSION! As you keep scrolling, the letters fly away
    .to(".scatter-char", {
        x: () => (Math.random() - 0.5) * 1000,
        y: () => (Math.random() - 0.5) * 1000,
        z: () => Math.random() * 500,
        rotateX: () => Math.random() * 360,
        rotateY: () => Math.random() * 360,
        opacity: 0,
        filter: "blur(10px)",
        stagger: 0.01,
        duration: 1.5,
        ease: "power3.inOut"
    })
    .to("#hero-cta, #hero-tagline", { opacity: 0, duration: 0.5 }, "-=1.5");

    // --- Pinned Section: The Habit Cards ---
    // Only pin on desktop to prevent mobile overlapping issues
    if (window.innerWidth > 768) {
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

    // --- General Reveals ---
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
        
        document.getElementById('val-people').innerText = people;
        document.getElementById('val-months').innerText = months;

        const totalTubes = Math.round(people * (months * 0.5));
        const totalPlastic = totalTubes * 20;
        const totalWater = (totalTubes * 0.1).toFixed(1);

        document.getElementById('out-tubes').innerHTML = totalTubes;
        document.getElementById('out-water').innerHTML = totalWater;
    }

    if (sliderPeople) {
        sliderPeople.addEventListener('input', calculateImpact);
        sliderMonths.addEventListener('input', calculateImpact);
        calculateImpact(); 
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
                btn.disabled = false; btn.textContent = 'Request Access';
            }
        });
    }
});