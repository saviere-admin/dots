document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const hasGSAP = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  // Smooth scrolling: only enhance capable, non-reduced-motion devices.
  let lenis = null;
  if (!reduceMotion && !isTouch && typeof Lenis !== "undefined") {
    try {
      lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
        touchMultiplier: 1
      });
    } catch (error) {
      console.warn("Smooth scrolling unavailable:", error);
    }
  }

  if (lenis && !hasGSAP) {
    const raf = time => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // Hide/show navigation without layout thrashing.
    const navbar = document.getElementById("navbar");
    let lastY = window.scrollY;

    if (navbar) {
      let ticking = false;

      window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < 50 || y < lastY) navbar.classList.remove("nav-hidden");
          else navbar.classList.add("nav-hidden");
          lastY = y;
          ticking = false;
        });
      }, { passive: true });
    }

    // Hero character preparation.
    const textElement = document.getElementById("scatter-text");

    if (textElement) {
      const text = textElement.textContent.trim();
      textElement.textContent = "";

      text.split(/\s+/).forEach(word => {
        const wordSpan = document.createElement("span");
        wordSpan.className = "inline-block mr-[0.3em] whitespace-nowrap";

        [...word].forEach(char => {
          const charSpan = document.createElement("span");
          charSpan.textContent = char;
          charSpan.className = "scatter-char inline-block opacity-0 translate-y-4";
          wordSpan.appendChild(charSpan);
        });

        textElement.appendChild(wordSpan);
      });
    }

    // Golden-dot hero. Shorter on mobile so the experience never becomes a scroll marathon.
    const heroScene = document.getElementById("hero-scene");

    if (heroScene) {
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      const heroScale = mobile ? 105 : 180;
      const heroEnd = mobile ? "+=230%" : "+=330%";

      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroScene,
          start: "top top",
          end: heroEnd,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      heroTl
        .to("#hero-svg", {
          scale: heroScale,
          transformOrigin: "93.4% 71.6%",
          ease: "power1.inOut",
          duration: 2
        })
        .to("#black-letters", { opacity: 0, duration: .12 }, "-=.5")
        .to("#hero-scene", { backgroundColor: "#d0a84f", duration: .3 }, "-=.45")
        .to("#post-zoom-content", {
          opacity: 1,
          pointerEvents: "auto",
          duration: .12
        }, "-=.15")
        .to(".scatter-char", {
          opacity: 1,
          y: 0,
          stagger: mobile ? .012 : .02,
          duration: .5,
          ease: "back.out(1.7)"
        })
        .to("#hero-cta", { opacity: 1, y: 0, duration: .45 }, "-=.18");

      if (!mobile) {
        heroTl
          .to(".scatter-char", {
            x: () => (Math.random() - .5) * 1000,
            y: () => (Math.random() - .5) * 900,
            z: () => Math.random() * 600,
            rotationX: () => Math.random() * 360,
            rotationY: () => Math.random() * 360,
            opacity: 0,
            filter: "blur(10px)",
            stagger: .008,
            duration: 1.2,
            ease: "power3.inOut"
          })
          .to("#hero-cta, #hero-tagline", { opacity: 0, duration: .4 }, "-=1.15");
      }
    }

    // Desktop pinned habit section; mobile gets a simple, stable reveal.
    if (window.innerWidth > 768 && document.getElementById("habit-pin") && !reduceMotion) {
      const tlPin = gsap.timeline({
        scrollTrigger: {
          trigger: "#habit-pin",
          start: "top top",
          end: "+=100%",
          pin: true,
          scrub: 1,
          anticipatePin: 1
        }
      });

      tlPin
        .from(".pin-cards > div", {
          y: window.innerHeight * .7,
          opacity: 0,
          stagger: .18,
          duration: 1,
          ease: "power3.out"
        })
        .to("#count-days", { innerHTML: 365, roundProps: "innerHTML", duration: 1 }, "-=.5")
        .to("#count-times", { innerHTML: 2, roundProps: "innerHTML", duration: 1 }, "-=.5")
        .to("#count-moments", { innerHTML: 730, roundProps: "innerHTML", duration: 1 }, "-=.5");
    } else {
      gsap.utils.toArray(".pin-cards > div").forEach(card => {
        gsap.from(card, {
          y: 28,
          opacity: 0,
          duration: .7,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 88%" }
        });
      });

      ["#count-days", "#count-times", "#count-moments"].forEach((selector, index) => {
        const value = [365, 2, 730][index];
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
      });
    }

    if (!reduceMotion) {
      gsap.utils.toArray(".gs-fade").forEach(elem => {
        gsap.from(elem, {
          y: 30,
          opacity: 0,
          duration: .9,
          ease: "power3.out",
          scrollTrigger: { trigger: elem, start: "top 88%", once: true }
        });
      });

      gsap.utils.toArray(".gs-scale").forEach(elem => {
        gsap.from(elem, {
          y: 18,
          scale: .985,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: elem, start: "top 88%", once: true }
        });
      });
    }

    // Pointer-only card tilt. IMPORTANT: use an attribute selector here because
    // a CSS class beginning with a digit ("3d-card") is not a valid bare selector.
    if (!isTouch && !reduceMotion) {
      document.querySelectorAll('[class~="3d-card"]').forEach(card => {
        let raf = null;

        card.addEventListener("pointermove", event => {
          if (raf) cancelAnimationFrame(raf);

          raf = requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;

            card.style.transform =
              `perspective(1000px) rotateX(${y * -4}deg) rotateY(${x * 4}deg) translateY(-2px)`;
          });
        });

        card.addEventListener("pointerleave", () => {
          if (raf) cancelAnimationFrame(raf);
          card.style.transform = "";
        });
      });
    }
  }

  // Impact calculator.
  // This block intentionally lives outside the GSAP block so the calculator
  // still works if an animation library fails to load.
  const sliderPeople = document.getElementById("slider-people");
  const sliderMonths = document.getElementById("slider-months");
  const valP = document.getElementById("val-people");
  const valM = document.getElementById("val-months");
  const outPlastic = document.getElementById("out-tubes");
  const outFreight = document.getElementById("out-water");

  function calculateImpact() {
    const people = Number(sliderPeople?.value ?? 0);
    const months = Number(sliderMonths?.value ?? 0);

    // Existing site model: 0.5 toothpaste tubes per person per month,
    // 20 g packaging per tube, and 0.1 kg freight mass reduction per tube.
    const tubesAvoided = Math.round(people * months * 0.5);
    const plasticGrams = tubesAvoided * 20;
    const freightKg = Number((tubesAvoided * 0.1).toFixed(1));

    return { people, months, plasticGrams, freightKg };
  }

  function renderCalculator({ animate = true } = {}) {
    if (!sliderPeople || !sliderMonths) return;

    const result = calculateImpact();

    if (valP) valP.textContent = String(result.people);
    if (valM) valM.textContent = String(result.months);

    if (!outPlastic || !outFreight) return;

    if (!hasGSAP || !animate || reduceMotion) {
      outPlastic.textContent = result.plasticGrams.toLocaleString();
      outFreight.textContent = result.freightKg.toFixed(1);
      return;
    }

    gsap.killTweensOf([outPlastic, outFreight]);

    const proxy = {
      plastic: Number(outPlastic.textContent.replace(/[^0-9.-]/g, "")) || 0,
      freight: Number(outFreight.textContent) || 0
    };

    gsap.to(proxy, {
      plastic: result.plasticGrams,
      freight: result.freightKg,
      duration: .28,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => {
        outPlastic.textContent = Math.round(proxy.plastic).toLocaleString();
        outFreight.textContent = proxy.freight.toFixed(1);
      },
      onComplete: () => {
        outPlastic.textContent = result.plasticGrams.toLocaleString();
        outFreight.textContent = result.freightKg.toFixed(1);
      }
    });
  }

  sliderPeople?.addEventListener("input", () => renderCalculator({ animate: true }), { passive: true });
  sliderMonths?.addEventListener("input", () => renderCalculator({ animate: true }), { passive: true });

  // Render immediately. With the screenshot's default values (2 people / 12 months)
  // this produces 240 g packaging avoided and 1.2 kg freight mass reduction.
  renderCalculator({ animate: false });

  // Waitlist.
  const waitlistForm = document.getElementById("waitlistForm");

  function setWaitlistMessage(message, type = "success") {
    const msg = document.getElementById("waitlistMsg");
    if (!msg) return;

    msg.textContent = message;
    msg.className = `waitlist-message ${type}`;
    msg.classList.remove("hidden");
  }

  waitlistForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const nameInput = document.getElementById("waitlistName");
    const emailInput = document.getElementById("waitlistEmail");
    const honeypot = document.getElementById("waitlistWebsite");
    const button = document.getElementById("waitlistBtn");
    const successPanel = document.getElementById("waitlistSuccess");

    const name = nameInput?.value.trim() || "";
    const email = emailInput?.value.trim().toLowerCase() || "";

    if (!name || !email) return;

    button.disabled = true;
    button.dataset.originalLabel ||= button.textContent;
    button.textContent = "Joining…";
    setWaitlistMessage("", "success");
    document.getElementById("waitlistMsg")?.classList.add("hidden");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          email,
          website: honeypot?.value || ""
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "We couldn't join you to the waitlist.");
      }

      waitlistForm.classList.add("is-complete");
      successPanel?.classList.add("is-visible");

      nameInput.value = "";
      emailInput.value = "";
    } catch (error) {
      setWaitlistMessage(error.message || "We couldn't join you to the waitlist.", "error");
      button.disabled = false;
      button.textContent = button.dataset.originalLabel || "Join Waitlist";
    }
  });
});
