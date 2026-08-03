const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const motionSelectors = [
  "[data-wf-motion]",
  ".wf-title-xl",
  ".wf-title-lg",
  ".wf-badge",
  ".wf-card",
  ".wf-pricing-card",
  ".wf-faq-card",
  ".wf-journey-card",
  ".wf-module-card",
  ".wf-luvy-social-card",
  ".wf-luvy-benefit-card",
  ".wf-luvy-detail-card",
  ".wf-pricing-deep-card",
  ".wf-image-panel",
  ".wf-ancestor-card",
  ".wf-ancestor-work",
  ".wf-ancestor-process-card",
].join(", ");

const textSelectors = [
  ".wf-title-xl",
  ".wf-title-lg",
  ".wf-section-heading h2",
  ".wf-card h3",
  ".wf-journey-card h3",
  ".wf-module-card h3",
  ".wf-luvy-benefit-card h3",
  ".wf-luvy-detail-card h3",
  ".wf-pricing-card h3",
  ".wf-pricing-deep-card h3",
  ".wf-faq-card h3",
  ".wf-ancestor-work h3",
  ".wf-ancestor-process-card h3",
].join(", ");

function prepareTextReveals(root) {
  const headings = Array.from(root.querySelectorAll(textSelectors));

  headings.forEach((heading) => {
    if (heading.dataset.ancestorTextReady === "1") return;
    if (heading.querySelector("input, button, a, svg, img, video")) return;

    const text = heading.textContent?.replace(/\s+/g, " ").trim();
    if (!text) return;

    heading.dataset.ancestorTextReady = "1";
    heading.dataset.ancestorOriginalText = text;
    heading.setAttribute("data-ancestor-text", "");
    heading.setAttribute("aria-label", text);
    heading.textContent = "";

    text.split(" ").forEach((word, index) => {
      const outer = document.createElement("span");
      outer.className = "wf-ancestor-word-wrap";
      outer.setAttribute("aria-hidden", "true");

      const inner = document.createElement("span");
      inner.className = "wf-ancestor-word";
      inner.textContent = word;
      inner.style.setProperty("--ancestor-word-delay", `${Math.min(index, 14) * 34}ms`);

      outer.appendChild(inner);
      heading.appendChild(outer);
      heading.appendChild(document.createTextNode(" "));
    });
  });
}

function revealElements(root) {
  prepareTextReveals(root);

  const elements = Array.from(root.querySelectorAll(motionSelectors));
  elements.forEach((element) => {
    if (!element.hasAttribute("data-wf-motion") && !element.hasAttribute("data-ancestor-text")) {
      element.setAttribute("data-wf-motion", "fade-up");
    }
  });
  const textElements = Array.from(root.querySelectorAll("[data-ancestor-text]"));
  const revealTargets = Array.from(new Set([...elements, ...textElements]));
  if (revealTargets.length === 0) return () => {};

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.16,
    },
  );

  revealTargets.forEach((element, index) => {
    if (!element.style.getPropertyValue("--wf-delay")) {
      element.style.setProperty("--wf-delay", `${Math.min(index % 4, 3) * 70}ms`);
    }
    observer.observe(element);
  });

  return () => observer.disconnect();
}

function animateCardHover(root) {
  const cards = Array.from(
    root.querySelectorAll(
      ".wf-card, .wf-pricing-card, .wf-faq-card, .wf-journey-card, .wf-module-card, .wf-luvy-social-card, .wf-luvy-benefit-card, .wf-luvy-detail-card, .wf-pricing-deep-card, .wf-ancestor-card, .wf-ancestor-work, .wf-ancestor-process-card, .wf-ancestor-hero-note",
    ),
  );

  if (cards.length === 0 || prefersReducedMotion()) return () => {};

  const listeners = [];

  cards.forEach((card) => {
    const move = (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--ancestor-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--ancestor-y", `${event.clientY - rect.top}px`);
    };
    const leave = () => {
      card.style.removeProperty("--ancestor-x");
      card.style.removeProperty("--ancestor-y");
    };

    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    listeners.push([card, move, leave]);
  });

  return () => {
    listeners.forEach(([card, move, leave]) => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    });
  };
}

function animateOnScroll(root) {
  const parallaxItems = Array.from(root.querySelectorAll("[data-wf-parallax]"));
  const lineItems = Array.from(root.querySelectorAll("[data-wf-line]"));
  const tiltItems = Array.from(root.querySelectorAll("[data-wf-tilt]"));

  if (
    prefersReducedMotion() ||
    (parallaxItems.length === 0 && lineItems.length === 0 && tiltItems.length === 0)
  ) {
    lineItems.forEach((item) => item.style.setProperty("--wf-progress", "1"));
    return () => {};
  }

  let frame = 0;

  const update = () => {
    frame = 0;
    const viewportHeight = window.innerHeight || 1;

    parallaxItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
      const depth = Number(item.dataset.wfParallax || 28);
      const y = (0.5 - progress) * depth * 2;
      const scale = 1 + progress * Number(item.dataset.wfScale || 0);
      item.style.setProperty("--wf-y", `${y.toFixed(2)}px`);
      item.style.setProperty("--wf-scale", scale.toFixed(4));
    });

    lineItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight * 0.8 + rect.height), 0, 1);
      item.style.setProperty("--wf-progress", progress.toFixed(4));
    });

    tiltItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
      const rotate = (progress - 0.5) * Number(item.dataset.wfTilt || 2.4);
      item.style.setProperty("--wf-rotate", `${rotate.toFixed(3)}deg`);
    });
  };

  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener("scroll", requestUpdate);
    window.removeEventListener("resize", requestUpdate);
  };
}

export function setupMarketingMotion(root = document) {
  if (typeof window === "undefined") return () => {};

  const cleanupReveal = revealElements(root);
  const cleanupScroll = animateOnScroll(root);
  const cleanupHover = animateCardHover(root);

  return () => {
    cleanupReveal();
    cleanupScroll();
    cleanupHover();
  };
}
