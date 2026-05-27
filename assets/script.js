/* =====================================================================
   Anish Saji Kumar — portfolio behaviour
   ---------------------------------------------------------------------
   Five small jobs, plain JavaScript, no dependencies:

     1. Theme toggle  — light/dark, persisted in localStorage
     2. Year stamp    — auto-fill the current year in the footer
     3. Nav highlight — IntersectionObserver marks the active section
     4. Counters      — animate [data-count] numbers when scrolled into view
     5. Reveal        — fade [data-reveal] elements in as they appear

   Defer-loaded from index.html, so DOM is already parsed when this runs.
   ===================================================================== */

'use strict';


/* ---------------------------------------------------------------------
   1. THEME TOGGLE — flips :root[data-theme] and saves in localStorage
   --------------------------------------------------------------------- */
const THEME_KEY = 'anish-portfolio-theme';

(function initTheme() {
  // Apply the saved theme immediately if there is one.
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
  }

  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    // Resolve the current theme: explicit attribute wins; otherwise fall
    // back to the OS preference so the FIRST click flips the visible state.
    const root   = document.documentElement;
    const attr   = root.getAttribute('data-theme');
    const osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = attr || (osDark ? 'dark' : 'light');
    const next    = current === 'dark' ? 'light' : 'dark';

    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });
})();


/* ---------------------------------------------------------------------
   2. YEAR STAMP — keeps the footer copyright year fresh forever
   --------------------------------------------------------------------- */
(function stampYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();


/* ---------------------------------------------------------------------
   3. NAV HIGHLIGHT — active section while scrolling
   --------------------------------------------------------------------- */
(function navHighlighter() {
  const links = document.querySelectorAll('.nav__links a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;

  // Build hash-to-link map so the observer can flip classes in O(1).
  const linkByHash = new Map();
  links.forEach((a) => linkByHash.set(a.getAttribute('href'), a));

  const sections = [];
  linkByHash.forEach((_, hash) => {
    const sec = document.querySelector(hash);
    if (sec) sections.push(sec);
  });

  // rootMargin trims the viewport so a section is "active" only when its
  // upper third is roughly under the sticky nav.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = linkByHash.get('#' + entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((a) => a.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
})();


/* ---------------------------------------------------------------------
   4. COUNTER ANIMATION — runs once when the metric scrolls into view
   --------------------------------------------------------------------- */
(function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  // Honour reduced-motion: just print the final number.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window) || reduce) {
    counters.forEach((el) => { el.textContent = el.dataset.count; });
    return;
  }

  // easeOutCubic — fast start, gentle settle. Feels good for counters.
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const animate = (el) => {
    const target = Number(el.dataset.count) || 0;
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const value = Math.round(target * easeOut(t));
      el.textContent = value.toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const obs = new IntersectionObserver(
    (entries, self) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          self.unobserve(entry.target); // run once
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((el) => obs.observe(el));
})();


/* ---------------------------------------------------------------------
   5. REVEAL-ON-SCROLL — fade [data-reveal] elements into place
   --------------------------------------------------------------------- */
(function revealOnScroll() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const obs = new IntersectionObserver(
    (entries, self) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          self.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => obs.observe(el));
})();
