(() => {
  "use strict";

  const ready = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const coarsePointer = window.matchMedia(
      "(pointer: coarse)"
    ).matches;

    const hasGSAP = typeof window.gsap !== "undefined";
    const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";
    const hasLenis = typeof window.Lenis !== "undefined";

    let lenis = null;

    // One scroll clock only. Never run Lenis and GSAP on independent RAF loops.
    if (!prefersReducedMotion && hasLenis) {
      try {
        lenis = new window.Lenis({
          duration: coarsePointer ? 0.75 : 1.05,
          smoothWheel: true,
          wheelMultiplier: coarsePointer ? 0.9 : 1,
          touchMultiplier: 1,
        });

        if (hasGSAP) {
          window.gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
          });

          window.gsap.ticker.lagSmoothing(1000, 16);
        } else {
          const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
          };
          requestAnimationFrame(raf);
        }
      } catch (error) {
        console.warn("Lenis initialization failed:", error);
      }
    }

    if (hasGSAP && hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);

      if (lenis) {
        lenis.on("scroll", window.ScrollTrigger.update);
      }

      initNavbar();
      initHero();
      initHabitCards();
      initReveals();
      initCalculator();
    } else {
      initCalculator();
    }

    initWaitlist();
    initCardTilt();

    function initNavbar() {
      const navbar = document.getElementById("navbar");
      if (!navbar || prefersReducedMotion) return;

      let lastY = window.scrollY;
      let ticking = false;

      const update = () => {
        const y = window.scrollY;

        if (y <= 40) {
          navbar.style.transform = "translate3d(0,0,0)";
        } else if (y > lastY + 4) {
          navbar.style.transform = "translate3d(0,-110%,0)";
        } else if (y < lastY - 4) {
          navbar.style.transform = "translate3d(0,0,0)";
        }

        lastY = y;
        ticking = false;
      };

      window.addEventListener(
        "scroll",
        () => {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
          }
        },
        { passive: true }
      );
    }

    function initHero() {
      const heroScene = document.getElementById("hero-scene");
      const heroSvg = document.getElementById("hero-svg");

      if (!heroScene || !heroSvg) return;

      const charsContainer = document.getElementById("scatter-text");

      if (charsContainer && !charsContainer.dataset.prepared) {
        const text = charsContainer.textContent.trim();
        charsContainer.textContent = "";

        text.split(/\s+/).forEach((word, wordIndex) => {
          const wordSpan = document.createElement("span");
          wordSpan.className = "inline-block whitespace-nowrap";

          [...word].forEach((char) => {
            const span = document.createElement("span");
            span.className = "scatter-char inline-block";
            span.textContent = char;
            wordSpan.appendChild(span);
          });

          charsContainer.appendChild(wordSpan);

          if (wordIndex < text.split(/\s+/).length - 1) {
            charsContainer.appendChild(document.createTextNode(" "));
          }
        });

        charsContainer.dataset.prepared = "true";
      }

      if (prefersReducedMotion) {
        document.querySelectorAll(".scatter-char").forEach((char) => {
          char.style.opacity = "1";
          char.style.transform = "none";
        });

        document.getElementById("post-zoom-content")?.style.setProperty(
          "opacity",
          "1"
        );

        return;
      }

      const mobile = window.innerWidth < 768;
      const zoom = mobile ? 72 : 145;
      const pinDistance = mobile ? "+=170%" : "+=290%";

      const heroTl = window.gsap.timeline({
        scrollTrigger: {
          trigger: heroScene,
          start: "top top",
          end: pinDistance,
          pin: true,
          scrub: mobile ? 0.7 : 0.9,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      heroTl
        .to(heroSvg, {
          scale: zoom,
          transformOrigin: "93.6% 71.6%",
          ease: "power2.inOut",
          duration: 2.4,
        })
        .to("#black-letters", { opacity: 0, duration: 0.12 }, "-=0.5")
        .to(heroScene, { backgroundColor: "#d0a84f", duration: 0.28 }, "-=0.4")
        .to(
          "#post-zoom-content",
          {
            opacity: 1,
            pointerEvents: "auto",
            duration: 0.15,
          },
          "-=0.2"
        )
        .fromTo(
          ".scatter-char",
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.012,
            duration: 0.55,
            ease: "power3.out",
          }
        )
        .to(
          "#hero-cta",
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.15"
        );

      // The final scatter is deliberately softer on mobile.
      heroTl.to(
        ".scatter-char",
        {
          x: () => (Math.random() - 0.5) * (mobile ? 420 : 900),
          y: () => (Math.random() - 0.5) * (mobile ? 360 : 700),
          rotation: () => (Math.random() - 0.5) * (mobile ? 140 : 260),
          opacity: 0,
          filter: mobile ? "blur(5px)" : "blur(9px)",
          stagger: 0.008,
          duration: 1.1,
          ease: "power3.inOut",
        }
      );

      heroTl.to(
        "#hero-cta, #hero-tagline",
        { opacity: 0, duration: 0.35 },
        "-=1"
      );
    }

    function initHabitCards() {
      const container = document.getElementById("habit-pin");
      const cards = document.querySelectorAll(".pin-cards > div");

      if (!container || !cards.length || prefersReducedMotion) return;

      if (window.innerWidth >= 900) {
        window.gsap.from(cards, {
          y: () => window.innerHeight * 0.65,
          opacity: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "+=90%",
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
          },
        });
      } else {
        window.gsap.from(cards, {
          y: 36,
          opacity: 0,
          stagger: 0.1,
          duration: 0.65,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cards[0],
            start: "top 86%",
            once: true,
          },
        });
      }
    }

    function initReveals() {
      if (prefersReducedMotion) return;

      window.gsap.utils.toArray(".gs-fade, .gs-header-lock").forEach((element) => {
        window.gsap.from(element, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true,
          },
        });
      });

      window.gsap.utils.toArray(".gs-scale").forEach((element) => {
        window.gsap.from(element, {
          scale: 0.97,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true,
          },
        });
      });
    }

    function initCardTilt() {
      if (prefersReducedMotion || coarsePointer) return;

      document.querySelectorAll(".3d-card").forEach((card) => {
        let frame = 0;
        let targetX = 0;
        let targetY = 0;

        const render = () => {
          frame = 0;
          card.style.transform =
            `perspective(1000px) rotateX(${targetY}deg) rotateY(${targetX}deg) scale(1.015)`;
        };

        card.addEventListener("pointermove", (event) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;

          targetX = x * 5;
          targetY = y * -5;

          if (!frame) frame = requestAnimationFrame(render);
        }, { passive: true });

        card.addEventListener("pointerleave", () => {
          targetX = 0;
          targetY = 0;
          if (!frame) frame = requestAnimationFrame(render);
        });
      });
    }

    function initCalculator() {
      const peopleSlider = document.getElementById("slider-people");
      const monthsSlider = document.getElementById("slider-months");

      if (!peopleSlider || !monthsSlider) return;

      let raf = 0;

      const calculate = () => {
        raf = 0;

        const people = Number(peopleSlider.value) || 0;
        const months = Number(monthsSlider.value) || 0;

        const valPeople = document.getElementById("val-people");
        const valMonths = document.getElementById("val-months");
        const outPlastic = document.getElementById("out-tubes");
        const outFreight = document.getElementById("out-water");

        valPeople && (valPeople.textContent = String(people));
        valMonths && (valMonths.textContent = String(months));

        // Current site model: one conventional tube per person every 2 months.
        const tubes = Math.round(people * months * 0.5);
        const plastic = tubes * 20;
        const freightKg = (tubes * 0.1).toFixed(1);

        if (hasGSAP && !prefersReducedMotion) {
          animateNumber(outPlastic, plastic, 0);
          animateNumber(outFreight, Number(freightKg), 1);
        } else {
          outPlastic && (outPlastic.textContent = String(plastic));
          outFreight && (outFreight.textContent = freightKg);
        }
      };

      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(calculate);
      };

      peopleSlider.addEventListener("input", schedule, { passive: true });
      monthsSlider.addEventListener("input", schedule, { passive: true });

      calculate();

      function animateNumber(element, value, decimals) {
        if (!element) return;

        const current = Number.parseFloat(element.textContent) || 0;
        const target = Number(value) || 0;

        window.gsap.killTweensOf(element);

        const state = { value: current };

        window.gsap.to(state, {
          value: target,
          duration: 0.28,
          ease: "power2.out",
          overwrite: true,
          onUpdate: () => {
            element.textContent = state.value.toFixed(decimals);
          },
        });
      }
    }

    function initWaitlist() {
      const form = document.getElementById("waitlistForm");
      if (!form) return;

      const nameInput = document.getElementById("waitlistName");
      const emailInput = document.getElementById("waitlistEmail");
      const honeypot = document.getElementById("waitlistWebsite");
      const button = document.getElementById("waitlistBtn");
      const message = document.getElementById("waitlistMsg");
      const success = document.getElementById("waitlistSuccess");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = nameInput?.value.trim() || "";
        const email = emailInput?.value.trim() || "";
        const website = honeypot?.value.trim() || "";

        if (!name || !email) {
          showMessage("Please enter your name and email.", true);
          return;
        }

        button.disabled = true;
        button.textContent = "Joining…";
        message?.classList.add("hidden");

        try {
          const response = await fetch("/api/waitlist", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              name,
              email,
              website,
            }),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              data.error || "We couldn't complete your signup."
            );
          }

          if (prefersReducedMotion) {
            form.classList.add("hidden");
            success?.classList.remove("hidden");
          } else {
            animateWaitlistSuccess();
          }

          if (data.warning) {
            showMessage(
              `${data.message || "You're on the list."} ${data.warning}`,
              false
            );
          }
        } catch (error) {
          showMessage(error.message, true);
          button.disabled = false;
          button.textContent = "Join Waitlist";
        }

        function showMessage(text, isError) {
          if (!message) return;

          message.textContent = text;
          message.className =
            `mt-6 text-sm font-medium ${isError ? "text-red-500" : "text-gray-600"} block`;
        }

        function animateWaitlistSuccess() {
          if (!hasGSAP) {
            form.classList.add("hidden");
            success?.classList.remove("hidden");
            return;
          }

          window.gsap.to(form, {
            opacity: 0,
            y: -14,
            duration: 0.35,
            ease: "power2.in",
            onComplete: () => {
              form.classList.add("hidden");
              if (success) {
                success.classList.remove("hidden");
                window.gsap.fromTo(
                  success,
                  { opacity: 0, y: 18 },
                  {
                    opacity: 1,
                    y: 0,
                    duration: 0.55,
                    ease: "power3.out",
                  }
                );
              }
            },
          });
        }
      });
    }
  });
})();
