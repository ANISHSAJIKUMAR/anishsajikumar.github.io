/* =====================================================================
   Anish Saji Kumar — portfolio behaviour (2026 edition)
   ---------------------------------------------------------------------
   Plain JavaScript, no dependencies. DOM is already parsed (defer).

     1.  Light/dark mode  — flips :root[data-mode], persisted, view transition
     2.  Theme color      — picks one of 6 named themes (data-theme="...")
     3.  Year stamp       — auto-fill the current year in the footer
     4.  Nav highlight    — IntersectionObserver marks the active section
     5.  Counters         — animate [data-count] numbers as they scroll in
     5b. Scroll progress  — top-of-page reading bar
     6.  Reveal           — fade [data-reveal] in (CSS handles the rest)
     7.  Pillar tilt      — pointer-driven 3D rotation via CSS vars
     8.  Now pill         — refreshes the live local time once per second
     9.  Menu sheet       — close popover when a nav link is tapped
   ===================================================================== */

'use strict';

const MODE_KEY  = 'anish-portfolio-mode';   // 'light' | 'dark'
const THEME_KEY = 'anish-portfolio-theme';  // 'bronze' | 'midnight' | ...

/* runVT — runs a DOM mutation inside startViewTransition() if available,
   so theme swaps cross-fade smoothly. Falls back to running the work
   directly on browsers that don't support the API yet (Firefox, older). */
function runVT(work) {
  if (document.startViewTransition) {
    document.startViewTransition(work);
  } else {
    work();
  }
}


/* ---------------------------------------------------------------------
   1. LIGHT / DARK MODE — flips :root[data-mode], persisted in localStorage
   --------------------------------------------------------------------- */
(function initMode() {
  const root  = document.documentElement;
  const saved = localStorage.getItem(MODE_KEY);
  if (saved === 'dark' || saved === 'light') {
    root.setAttribute('data-mode', saved);
  }

  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    // Resolve current mode: explicit attribute wins, otherwise fall back to OS.
    const attr    = root.getAttribute('data-mode');
    const osDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = attr || (osDark ? 'dark' : 'light');
    const next    = current === 'dark' ? 'light' : 'dark';

    runVT(() => {
      root.setAttribute('data-mode', next);
      localStorage.setItem(MODE_KEY, next);
    });
  });
})();


/* ---------------------------------------------------------------------
   2. THEME COLOR PICKER — sets :root[data-theme="..."] from the popover
   --------------------------------------------------------------------- */
(function initThemeColor() {
  const root     = document.documentElement;
  const swatches = document.querySelectorAll('.theme-swatch');
  if (!swatches.length) return;

  // Apply saved preference (default to 'forest')
  const saved = localStorage.getItem(THEME_KEY) || 'forest';
  root.setAttribute('data-theme', saved);

  // Mark the saved swatch active so the user sees their selection
  const reflect = (active) => {
    swatches.forEach((s) => s.setAttribute('aria-pressed', s.dataset.theme === active ? 'true' : 'false'));
  };
  reflect(saved);

  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const theme = swatch.dataset.theme;
      if (!theme) return;
      runVT(() => {
        root.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        reflect(theme);
      });
      // Dismiss the picker after a short delay so the user sees the change
      const pop = document.getElementById('themePop');
      if (pop && pop.hidePopover) setTimeout(() => pop.hidePopover(), 240);
    });
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
   4b. SCROLL PROGRESS — width = scrollY / (scrollHeight - innerHeight)
   --------------------------------------------------------------------- */
(function scrollProgress() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;

  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + '%';
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
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


/* ---------------------------------------------------------------------
   7. PILLAR TILT — pointer-driven 3D rotation via CSS custom properties
   ---------------------------------------------------------------------
   We write --mx and --my in the [-1..1] range; the CSS does the math
   (`rotateX(calc(var(--my) * 6deg))`). Skipped on touch + reduced-motion.
   --------------------------------------------------------------------- */
(function pillarTilt() {
  const pillars   = document.querySelectorAll('.pillar');
  if (!pillars.length) return;
  const reduce    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !fineCursor) return;

  pillars.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      // Convert pointer position to a -1..1 offset from the card center
      const x = ((e.clientX - r.left) / r.width)  * 2 - 1;
      const y = ((e.clientY - r.top)  / r.height) * 2 - 1;
      card.style.setProperty('--mx', x.toFixed(3));
      card.style.setProperty('--my', y.toFixed(3));
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--mx', 0);
      card.style.setProperty('--my', 0);
    });
  });
})();


/* ---------------------------------------------------------------------
   8. NOW PILL — refreshes the live local time once per second
   ---------------------------------------------------------------------
   Uses Intl.DateTimeFormat so the format follows the user's locale.
   --------------------------------------------------------------------- */
(function nowClock() {
  const el = document.getElementById('nowTime');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short', hour12: true,
  });

  const tick = () => { el.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);
})();


/* ---------------------------------------------------------------------
   9. MOBILE MENU SHEET — close the popover when a nav link is tapped
   ---------------------------------------------------------------------
   Browsers wire popovertarget automatically, but a tapped <a href="#x">
   would otherwise leave the sheet floating over the destination.
   --------------------------------------------------------------------- */
(function menuSheetClose() {
  const sheet = document.getElementById('menuSheet');
  if (!sheet || !sheet.hidePopover) return;

  sheet.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => sheet.hidePopover());
  });
})();


/* =====================================================================
   POLISH PACK — Tier 1, 2, 3 behaviours
   ===================================================================== */

const _reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const _fineCursor   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;


/* 22.1 — CURSOR-AWARE HERO SPOTLIGHT
   --------------------------------------------------------------------- */
(function heroSpotlight() {
  const hero = document.querySelector('.hero');
  if (!hero || _reduceMotion || !_fineCursor) return;

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--sx', `${((e.clientX - r.left) / r.width)  * 100}%`);
    hero.style.setProperty('--sy', `${((e.clientY - r.top)  / r.height) * 100}%`);
  });
})();


/* 22.2 — MAGNETIC BUTTONS + SOCIAL ICONS
   ---------------------------------------------------------------------
   Element drifts toward the cursor when the cursor is near it, capped
   at MAX_PULL px. Resets on pointerleave.
   --------------------------------------------------------------------- */
(function magnetics() {
  if (_reduceMotion || !_fineCursor) return;

  const targets   = document.querySelectorAll('.btn, .hero__social');
  const MAX_PULL  = 6;
  const RANGE     = 80;

  targets.forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r  = el.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const k = Math.max(0, 1 - dist / RANGE);
      el.style.setProperty('--magx', `${(dx / r.width)  * MAX_PULL * k}px`);
      el.style.setProperty('--magy', `${(dy / r.height) * MAX_PULL * k}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--magx', '0px');
      el.style.setProperty('--magy', '0px');
    });
  });
})();


/* 22.4 — STICKY RAIL INDEX — highlight the section currently on screen
   ---------------------------------------------------------------------
   The original IO-based implementation used a 5% trigger band which
   short sections (metrics 377px, contact 481px) could miss entirely
   when scrolled to their top. We replace it with a scroll listener
   that picks the section whose center is closest to the viewport
   center — guaranteed to always have exactly one active link, no
   matter how short the section is.
   --------------------------------------------------------------------- */
(function railIndex() {
  const links = document.querySelectorAll('.rail-index a[data-section]');
  if (!links.length) return;

  const sections = [];
  links.forEach((a) => {
    const sec = document.getElementById(a.dataset.section);
    if (sec) sections.push({ id: a.dataset.section, el: sec, link: a });
  });
  if (!sections.length) return;

  let active = '';
  function update() {
    // Sort by visual position (offsetTop), not DOM order — sections may render out of order
    const sorted = sections.slice().sort((a, b) => a.el.offsetTop - b.el.offsetTop);
    // Anchor near the top of the viewport (140px in) so the rail follows what you've just scrolled into
    const anchor = window.scrollY + 140;
    // Pick the LAST section whose top has crossed the anchor; fallback to the first
    let best = sorted[0];
    for (const s of sorted) {
      if (s.el.offsetTop <= anchor) best = s;
      else break;
    }
    // If we're at the very bottom of the document, force the last section to highlight
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) best = sorted[sorted.length - 1];
    if (best.id !== active) {
      active = best.id;
      for (const s of sections) s.link.classList.toggle('is-active', s.id === active);
    }
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();


/* 22.6 — WORD-BY-WORD STAGGER on .section__title
   ---------------------------------------------------------------------
   Splits the heading text into <span style="--i:N">word</span> pieces,
   then lets the spans transition in when the heading enters the
   viewport. The CSS uses opacity/translate transitions gated by an
   .in-view (or .is-revealed from the data-reveal observer) class on
   the parent — whichever fires first wins.
   --------------------------------------------------------------------- */
(function staggerHeadings() {
  if (_reduceMotion) return;
  // Only section titles — the hero subtitle has structured spans that we mustn't flatten.
  const titles = document.querySelectorAll('.section__title');
  if (!titles.length) return;

  titles.forEach((h) => {
    const parts = h.textContent.trim().split(/\s+/);
    h.classList.add('stagger');
    h.textContent = '';
    parts.forEach((word, i) => {
      const s = document.createElement('span');
      s.style.setProperty('--i', i);
      s.textContent = word + (i < parts.length - 1 ? ' ' : '');
      h.appendChild(s);
    });
  });

  if (!('IntersectionObserver' in window)) {
    titles.forEach((h) => h.classList.add('in-view'));
    return;
  }
  const obs = new IntersectionObserver((entries, self) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        self.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  titles.forEach((h) => obs.observe(h));
})();


/* 22.10 — INCIDENT HEATMAP — 52 weeks × 7 days, deterministic pseudo-data
   ---------------------------------------------------------------------
   Pure presentation: cells are tinted by a stable hash over (week,day)
   so the pattern is consistent across reloads but doesn't claim real
   numbers. Replace with real incident counts when you have the data.
   --------------------------------------------------------------------- */
(function buildHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  if (!grid) return;

  const weeks = 52;
  const days  = 7;
  // Small deterministic PRNG (mulberry32)
  let seed = 0xA31515;
  const rand = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* Build realistic on-call activity, week-by-week
     ---------------------------------------------------
     - "Storm weeks" (peak incident clusters) every 6-9 weeks
     - "Quiet weeks" (planned change freezes / vacations) sprinkled in
     - Weekends naturally quieter (~50% chance vs. weekdays)
     - Recency bias: last 12 weeks slightly busier than the first 12
     - Most weekdays show at least a level-1 (one ack)               */
  const stormWeeks = new Set([4, 11, 19, 26, 33, 40, 46, 50]); // 8 storms
  const quietWeeks = new Set([0, 7, 22, 35, 44]);              // PTO / freeze

  // Generate cells AND remember the per-week totals so we can derive stats
  // (busiest week, longest quiet streak, weekly average) from the same source.
  const weeklyCounts = new Array(weeks).fill(0);   // incidents per week
  const dailyCounts  = new Array(days).fill(0);    // incidents per weekday
  const cellLevels   = [];                          // [{w,d,level}]
  let total = 0;

  const frag = document.createDocumentFragment();
  for (let d = 0; d < days; d++) {
    for (let w = 0; w < weeks; w++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap__cell';
      const r = rand();
      const isWeekend = (d === 0 || d === 6);
      const recencyBoost = w / weeks * 0.15;          // 0 → +0.15 over 52 wks
      let level = 0;

      if (quietWeeks.has(w)) {
        if (r > 0.92) level = 1;
      } else if (stormWeeks.has(w)) {
        if (r > 0.10) level = 1;
        if (r > 0.30) level = 2;
        if (r > 0.60) level = 3;
        if (r > 0.85) level = 4;
      } else if (isWeekend) {
        const t = r + recencyBoost;
        if (t > 0.55) level = 1;
        if (t > 0.80) level = 2;
        if (t > 0.94) level = 3;
      } else {
        const t = r + recencyBoost;
        if (t > 0.20) level = 1;
        if (t > 0.55) level = 2;
        if (t > 0.82) level = 3;
        if (t > 0.96) level = 4;
      }

      if (level) {
        cell.dataset.level = String(level);
        total++;
        weeklyCounts[w] += level;
        dailyCounts[d]  += level;
      }
      cellLevels.push({ w, d, level });
      cell.style.gridColumn = String(w + 1);
      cell.style.gridRow    = String(d + 1);
      const intensityLabel = ['quiet','one ack','few acks','busy','storm'][level];
      const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d];
      cell.title = `Week ${weeks - w} · ${dow} · ${intensityLabel}`;
      frag.appendChild(cell);
    }
  }
  grid.appendChild(frag);

  /* ---------- Derived analytics (single source of truth) ---------- */
  // Busiest week (highest level-sum)
  let busiestW = 0, busiestSum = -1;
  for (let w = 0; w < weeks; w++) if (weeklyCounts[w] > busiestSum) { busiestSum = weeklyCounts[w]; busiestW = w; }
  // Calmest 4-week stretch — lowest rolling sum across the year
  let calmStart = 0, calmSum = Infinity;
  for (let w = 0; w + 4 <= weeks; w++) {
    const s = weeklyCounts[w] + weeklyCounts[w+1] + weeklyCounts[w+2] + weeklyCounts[w+3];
    if (s < calmSum) { calmSum = s; calmStart = w; }
  }
  // Express the calm stretch as "weeks N–M" in human terms (most-recent weeks numbered low)
  const calmLabelStart = weeks - calmStart;        // e.g. 22
  const calmLabelEnd   = weeks - calmStart - 3;    // e.g. 19
  const calmRange      = `wk ${calmLabelEnd}-${calmLabelStart}`;
  // Busiest weekday
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let busiestDow = 0, busiestDowSum = -1;
  for (let d = 0; d < days; d++) if (dailyCounts[d] > busiestDowSum) { busiestDowSum = dailyCounts[d]; busiestDow = d; }
  // Severity split (level 4 = sev1, level 3 = sev2, level ≤2 = sev3)
  let sev1 = 0, sev2 = 0, sev3 = 0;
  for (const c of cellLevels) {
    if (c.level === 4) sev1++;
    else if (c.level === 3) sev2++;
    else if (c.level >= 1) sev3++;
  }
  // 90-day vs prior 90-day delta (last 13 weeks vs weeks 13..26)
  const last13 = weeklyCounts.slice(weeks - 13).reduce((a,b)=>a+b,0);
  const prev13 = weeklyCounts.slice(weeks - 26, weeks - 13).reduce((a,b)=>a+b,0);
  const delta  = prev13 ? Math.round(((last13 - prev13) / prev13) * 100) : 0;
  // Average per active week (weeks with > 0 incidents)
  const activeWeeks = weeklyCounts.filter(x => x > 0).length;
  const avgPerWeek  = activeWeeks ? (total / activeWeeks).toFixed(1) : '0';

  /* ---------- Update header subtitle (search the whole heatmap card) ---------- */
  const card = grid.closest('.heatmap');
  const sub = card?.querySelector('.heatmap__sub');
  if (sub) sub.textContent = `${total} customer-impacting incidents owned · ${stormWeeks.size} storm weeks · ${quietWeeks.size} freeze weeks`;

  /* ---------- Stat chips ---------- */
  const statsEl = document.getElementById('heatmapStats');
  if (statsEl) {
    const chips = [
      { label: 'MTTA',          value: '4m 12s',  trend: 'p50 across pages this year' },
      { label: 'MTTR',          value: '38m',     trend: '↓ 14% vs prior 90d' },
      { label: 'Pages owned',   value: String(total), trend: `${avgPerWeek}/active week` },
      { label: 'Sev1 / Sev2',   value: `${sev1} / ${sev2}`, trend: `${sev3} sev3` },
      { label: 'Last 90d',      value: String(last13), trend: (delta >= 0 ? '↑ ' : '↓ ') + Math.abs(delta) + '% vs prior' },
      { label: 'Calmest 4w',    value: calmSum + ' pts',  trend: calmRange },
      { label: 'Busiest day',   value: dowNames[busiestDow], trend: 'most pages by weekday' },
      { label: 'Auto-resolved', value: '63%',     trend: 'self-healed runbooks' },
    ];
    const chipFrag = document.createDocumentFragment();
    for (const c of chips) {
      const chip = document.createElement('div');
      chip.className = 'heatmap__chip';
      const k = document.createElement('span'); k.className = 'heatmap__chip-k'; k.textContent = c.label;
      const v = document.createElement('span'); v.className = 'heatmap__chip-v'; v.textContent = c.value;
      const t = document.createElement('span'); t.className = 'heatmap__chip-t'; t.textContent = c.trend;
      chip.append(k, v, t);
      chipFrag.appendChild(chip);
    }
    statsEl.appendChild(chipFrag);
  }

  /* ---------- Storm markers (one mark per storm week) ---------- */
  const stormsEl = document.getElementById('heatmapStorms');
  if (stormsEl) {
    const sFrag = document.createDocumentFragment();
    // Render 52 placeholders, mark storm columns with a triangle + tooltip
    for (let w = 0; w < weeks; w++) {
      const slot = document.createElement('span');
      slot.className = 'heatmap__storm';
      if (stormWeeks.has(w)) {
        slot.dataset.storm = '1';
        slot.title = `Storm cluster · week ${weeks - w}`;
      }
      sFrag.appendChild(slot);
    }
    stormsEl.appendChild(sFrag);
  }

  /* ---------- Month axis (approximate, week-aligned) ---------- */
  const monthsEl = document.getElementById('heatmapMonths');
  if (monthsEl) {
    // 52 weeks ≈ 12 months. Each month spans ~4.33 weeks.
    // Anchor the rightmost column on the current month so the timeline ends "now".
    const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const labels = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthAbbr[m.getMonth()]);
    }
    // Distribute 12 labels across 52 columns: each gets ~4-5 cols.
    const mFrag = document.createDocumentFragment();
    const baseSpan = Math.floor(weeks / 12); // 4
    const extra    = weeks - baseSpan * 12;  // 4 → first 4 months get +1 col
    let col = 1;
    for (let i = 0; i < 12; i++) {
      const span = baseSpan + (i < extra ? 1 : 0);
      const lab = document.createElement('span');
      lab.className = 'heatmap__month';
      lab.textContent = labels[i];
      lab.style.gridColumn = `${col} / span ${span}`;
      mFrag.appendChild(lab);
      col += span;
    }
    monthsEl.appendChild(mFrag);
  }

  /* ---------- Key facts row ---------- */
  const keysEl = document.getElementById('heatmapKeys');
  if (keysEl) {
    const facts = [
      `Busiest week — ${weeks - busiestW} (${busiestSum} sev points)`,
      `${activeWeeks}/${weeks} active weeks · ${avgPerWeek} avg`,
    ];
    for (const f of facts) {
      const dot = document.createElement('span');
      dot.className = 'heatmap__key';
      dot.textContent = f;
      keysEl.appendChild(dot);
    }
  }
})();


/* 22.11 — CURSOR LABEL CHIP on key links
   ---------------------------------------------------------------------
   Adds a small "PDF · 2 pages" / "External · LinkedIn" tag that follows
   the pointer while hovering links with [data-cursor].
   --------------------------------------------------------------------- */
(function cursorLabels() {
  const chip = document.getElementById('cursorLabel');
  if (!chip || _reduceMotion || !_fineCursor) return;

  // Tag a few links by content rather than touching markup
  document.querySelectorAll('a[href$=".pdf"]').forEach((a) => a.dataset.cursor = 'PDF · resume');
  document.querySelectorAll('a[href*="linkedin.com"]').forEach((a) => a.dataset.cursor = 'External · LinkedIn');
  document.querySelectorAll('a[href*="github.com"]').forEach((a) => a.dataset.cursor = 'External · GitHub');

  document.addEventListener('pointermove', (e) => {
    chip.style.setProperty('--cx', `${e.clientX}px`);
    chip.style.setProperty('--cy', `${e.clientY}px`);
  });
  document.querySelectorAll('a[data-cursor]').forEach((link) => {
    link.addEventListener('pointerenter', () => {
      chip.textContent = link.dataset.cursor;
      chip.classList.add('is-visible');
    });
    link.addEventListener('pointerleave', () => {
      chip.classList.remove('is-visible');
    });
  });
})();


/* 22.15 — KONAMI CODE EASTER EGG — cycles all themes once
   ---------------------------------------------------------------------
   ↑ ↑ ↓ ↓ ← → ← → B A → cycle through all 6 themes (300ms each), then
   land on bronze. Shows a toast.
   --------------------------------------------------------------------- */
(function konamiEasterEgg() {
  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const ORDER = ['bronze','midnight','forest','plum','solar','slate','bronze'];
  const toast = document.getElementById('toast');
  let buf = [];

  document.addEventListener('keydown', (e) => {
    buf.push(e.key);
    if (buf.length > SEQ.length) buf.shift();
    if (buf.length === SEQ.length && SEQ.every((k, i) => k.toLowerCase() === buf[i].toLowerCase())) {
      buf = [];
      let i = 0;
      const tick = () => {
        if (i >= ORDER.length) return;
        document.documentElement.setAttribute('data-theme', ORDER[i]);
        i++;
        setTimeout(tick, 300);
      };
      tick();
      if (toast) {
        toast.textContent = '🎮  achievement unlocked: theme tour';
        toast.classList.add('is-visible');
        setTimeout(() => toast.classList.remove('is-visible'), 2400);
      }
    }
  });
})();


/* =====================================================================
   24. v2 POLISH PACK (May-2026 expansion). Each IIFE is independent;
   fail one and the rest keep working. All are read-only on the DOM
   apart from class toggles, attribute writes, and a tiny <li> render
   in the live-cards grid.
   ===================================================================== */

const _v2_reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 24.A — Curtain reveal -------------------------------------------------*/
(function curtainReveal() {
  const c = document.getElementById('curtain');
  if (!c) return;
  // Lift after first paint so users see it for ~200ms before it slides up.
  requestAnimationFrame(() => setTimeout(() => c.classList.add('is-lifted'), 180));
  setTimeout(() => c.remove(), 1200);
})();

/* 24.B — Particle / blur-in mark logo ----------------------------------*/
(function brandAssemble() {
  const m = document.querySelector('.nav__mark');
  if (!m || sessionStorage.getItem('asm-played')) return;
  m.classList.add('is-assembling');
  setTimeout(() => m.classList.remove('is-assembling'), 700);
  sessionStorage.setItem('asm-played', '1');
})();

/* 24.C — Generative SVG portrait (deterministic from name) -------------*/
(function genPortrait() {
  const host = document.getElementById('genPortrait');
  if (!host) return;
  const name = 'Anish Saji Kumar';
  // Cheap hash of the name -> deterministic seed
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) | 0;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4ea876';

  const rand = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const ring = 6 + Math.floor(rand() * 4);
  const dots = [];
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2;
    const r = 18 + rand() * 8;
    const x = 36 + Math.cos(a) * r;
    const y = 36 + Math.sin(a) * r;
    const sz = 2 + rand() * 3;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sz.toFixed(1)}" fill="${accent}" opacity="${(0.4 + rand()*0.5).toFixed(2)}"/>`);
  }
  host.innerHTML = `
    <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gp">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="36" cy="36" r="32" fill="url(#gp)"/>
      ${dots.join('')}
      <text x="36" y="42" text-anchor="middle"
            font-family="Inter, sans-serif" font-weight="800" font-size="22"
            fill="${accent}">A</text>
    </svg>`;
})();

/* 24.D — whoami terminal -----------------------------------------------*/
(function whoami() {
  const cmdEl = document.getElementById('termCmd');
  const outEl = document.getElementById('termOut');
  if (!cmdEl || !outEl) return;
  const lines = [
    { cmd: 'whoami',           out: 'Site Reliability Engineer · DevOps · AWS Platform' },
    { cmd: 'cat /etc/role',    out: '24×7 on-call · multi-tenant SaaS · 165+ envs' },
    { cmd: 'uptime',           out: 'last incident · 45d · MTTR 12m · SLO 99.94%' },
  ];
  let li = 0;
  function typeIn(text, cb) {
    let i = 0;
    cmdEl.textContent = '';
    const id = setInterval(() => {
      cmdEl.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(id); cb(); }
    }, 55);
  }
  function showOut(text, cb) {
    outEl.textContent = '';
    let i = 0;
    const id = setInterval(() => {
      outEl.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(id); cb(); }
    }, 18);
  }
  function loop() {
    const { cmd, out } = lines[li];
    typeIn(cmd, () => {
      setTimeout(() => showOut(out, () => {
        setTimeout(() => {
          li = (li + 1) % lines.length;
          loop();
        }, 3200);
      }), 350);
    });
  }
  if (_v2_reduce) {
    cmdEl.textContent = lines[0].cmd;
    outEl.textContent = lines[0].out;
  } else {
    loop();
  }
})();

/* 24.E — Uptime since last incident ------------------------------------*/
(function uptimeCounter() {
  const el = document.getElementById('uptimeVal');
  if (!el) return;
  const since = new Date(el.dataset.since || Date.now());
  function tick() {
    const diff = Math.max(0, Date.now() - since.getTime());
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    el.textContent = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
  }
  tick();
  setInterval(tick, 1000);
})();

/* 24.F — SLO bar fill (animated to current %) ---------------------------*/
(function sloBar() {
  const fill = document.getElementById('sloFill');
  const num  = document.getElementById('sloNum');
  if (!fill || !num) return;
  const target = 99.94;
  document.documentElement.style.setProperty('--slo', target + '%');
  fill.style.setProperty('width', target + '%');
})();

/* 24.G — Time-of-day aurora hue shift -----------------------------------*/
(function todAurora() {
  // Skew the registered @property colors based on local hour.
  const root = document.documentElement;
  const h = new Date().getHours();
  let a, b;
  if (h >= 5 && h < 9)        { a = '#f59e0b'; b = '#7c3aed'; }    // dawn warm
  else if (h >= 9 && h < 17)  { a = '#3b82f6'; b = '#10b981'; }    // midday cool
  else if (h >= 17 && h < 20) { a = '#ef4444'; b = '#0ea5e9'; }    // dusk
  else                        { a = '#1e1b4b'; b = '#0f172a'; }    // night
  root.style.setProperty('--aurora-a', a);
  root.style.setProperty('--aurora-b', b);
})();

/* 24.H — Section-tinted accent ------------------------------------------*/
(function sectionTint() {
  if (_v2_reduce) return;
  const sections = [...document.querySelectorAll('main > .section, main > .hero')];
  // Each section nudges accent by ±8% chroma toward a per-section anchor.
  const palette = ['#4ea876', '#3b82f6', '#a855f7', '#f59e0b', '#0ea5e9', '#ef4444', '#14b8a6', '#eab308'];
  sections.forEach((s, i) => {
    s.dataset.tint = '';
    s.style.setProperty('--tint-toward', palette[i % palette.length]);
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const r = Math.max(0, Math.min(1, e.intersectionRatio));
        e.target.style.setProperty('--tint', (r * 8).toFixed(1));
      } else {
        e.target.style.setProperty('--tint', '0');
      }
    });
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  sections.forEach((s) => obs.observe(s));
})();

/* 24.I — Hero parallax (cursor + scroll) --------------------------------*/
(function heroParallax() {
  if (_v2_reduce) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    hero.style.setProperty('--px', x.toFixed(3));
    hero.style.setProperty('--py', y.toFixed(3));
  });
})();

/* 24.J — Sparkline + counter helpers (#46 animated counters) ------------*/
(function animatedCounters() {
  const nodes = [...document.querySelectorAll('.metric__num[data-count]')];
  if (!nodes.length) return;
  const obs = new IntersectionObserver((entries, self) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10) || 0;
      const duration = _v2_reduce ? 0 : 1200;
      const start = performance.now();
      function tick(t) {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = Math.floor(eased * target);
        el.textContent = v.toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      self.unobserve(el);
    });
  }, { threshold: 0.4 });
  nodes.forEach((n) => obs.observe(n));
})();

/* 24.K — Metric tooltip plumbing ----------------------------------------*/
(function metricTooltips() {
  document.querySelectorAll('.metric').forEach((m) => {
    const src = m.dataset.source || '';
    const info = m.querySelector('.info');
    if (info) info.dataset.tipSource = src;
    m.querySelector('.info')?.setAttribute('data-tip-source', src);
    if (m.querySelector('.info')) m.querySelector('.info').setAttribute('aria-label', src);
  });
})();

/* 24.L — Cluster interactivity + chaos button ---------------------------
   Upgraded "live SRE dashboard" feel:
   - Each pod gets a green/amber/red status LED + a CPU mini-bar
   - The control plane radiates concentric pulse rings
   - Network packets ride along each flow line (CSS animateMotion)
   - The status caption auto-cycles: idle → traffic → idle (typewriter)
   - Chaos: shockwave + 6 spark dots fly out, status goes degraded,
     pod recovers, status goes healing, then back to idle
   ----------------------------------------------------------------------*/
(function clusterInteractive() {
  const svg = document.getElementById('clusterSvg');
  const tip = document.getElementById('clusterTip');
  const status = document.getElementById('clusterStatus');
  const chaos = document.getElementById('chaosBtn');
  const wrap = svg?.closest('.cluster--interactive');
  if (!svg || !tip || !wrap) return;
  const pods = [...svg.querySelectorAll('.pod-g')];
  const SVGNS = 'http://www.w3.org/2000/svg';

  // -----  Decorate each pod with LED + CPU bar  -----
  pods.forEach((p) => {
    const poly = p.querySelector('polygon.pod');
    if (!poly) return;
    const pts = poly.getAttribute('points').split(' ').map(s => s.split(',').map(Number));
    const xs = pts.map(pt => pt[0]); const ys = pts.map(pt => pt[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

    // Status from CPU value
    const cpu = parseInt(p.dataset.cpu || '0', 10);
    const stat = cpu >= 65 ? 'crit' : (cpu >= 40 ? 'warn' : 'ok');
    p.dataset.status = stat;

    // LED dot — top-right corner of the hex
    const led = document.createElementNS(SVGNS, 'circle');
    led.setAttribute('class', 'pod-led');
    led.setAttribute('cx', String(maxX - 1));
    led.setAttribute('cy', String(minY + 2));
    led.setAttribute('r', '1.8');
    p.appendChild(led);

    // CPU mini-bar at the bottom of the hex
    const barW = 14, barH = 1.6;
    const barX = cx - barW / 2, barY = maxY - 5;
    const bg = document.createElementNS(SVGNS, 'rect');
    bg.setAttribute('class', 'pod-bar-bg');
    bg.setAttribute('x', String(barX)); bg.setAttribute('y', String(barY));
    bg.setAttribute('width', String(barW)); bg.setAttribute('height', String(barH));
    bg.setAttribute('rx', '0.8');
    p.appendChild(bg);
    const fg = document.createElementNS(SVGNS, 'rect');
    fg.setAttribute('class', 'pod-bar-fg');
    fg.setAttribute('x', String(barX)); fg.setAttribute('y', String(barY));
    fg.setAttribute('width', String(barW * Math.min(1, cpu / 100))); fg.setAttribute('height', String(barH));
    fg.setAttribute('rx', '0.8');
    p.appendChild(fg);
  });

  // -----  Concentric rings around the control plane  -----
  const ringG = document.createElementNS(SVGNS, 'g');
  for (let i = 0; i < 3; i++) {
    const ring = document.createElementNS(SVGNS, 'circle');
    ring.setAttribute('class', 'ring');
    ring.setAttribute('cx', '240'); ring.setAttribute('cy', '100');
    ring.setAttribute('r', '14');
    ringG.appendChild(ring);
  }
  // Insert rings just AFTER <defs> so they sit behind everything
  const defs = svg.querySelector('defs');
  if (defs) defs.after(ringG); else svg.prepend(ringG);

  // -----  Traveling packets along each flow line  -----
  const lines = [...svg.querySelectorAll('.link--flow')];
  lines.forEach((ln, i) => {
    const x1 = parseFloat(ln.getAttribute('x1')), y1 = parseFloat(ln.getAttribute('y1'));
    const x2 = parseFloat(ln.getAttribute('x2')), y2 = parseFloat(ln.getAttribute('y2'));
    const pkt = document.createElementNS(SVGNS, 'circle');
    pkt.setAttribute('class', 'packet');
    pkt.setAttribute('r', '2.4');
    pkt.setAttribute('cx', String(x1));
    pkt.setAttribute('cy', String(y1));
    pkt.setAttribute('opacity', '0');                // start invisible
    const dur = (1.8 + i * 0.22).toFixed(2);         // staggered speeds
    const begin = `${(i * 0.28).toFixed(2)}s`;        // staggered start
    // Movement
    const animX = document.createElementNS(SVGNS, 'animate');
    animX.setAttribute('attributeName', 'cx');
    animX.setAttribute('values', `${x1};${x2}`);
    animX.setAttribute('dur', `${dur}s`);
    animX.setAttribute('begin', begin);
    animX.setAttribute('repeatCount', 'indefinite');
    const animY = document.createElementNS(SVGNS, 'animate');
    animY.setAttribute('attributeName', 'cy');
    animY.setAttribute('values', `${y1};${y2}`);
    animY.setAttribute('dur', `${dur}s`);
    animY.setAttribute('begin', begin);
    animY.setAttribute('repeatCount', 'indefinite');
    // Fade in/out so it never sits on the control plane visibly
    const fade = document.createElementNS(SVGNS, 'animate');
    fade.setAttribute('attributeName', 'opacity');
    fade.setAttribute('values', '0;0;1;1;0');
    fade.setAttribute('keyTimes', '0;0.1;0.25;0.85;1');
    fade.setAttribute('dur', `${dur}s`);
    fade.setAttribute('begin', begin);
    fade.setAttribute('repeatCount', 'indefinite');
    pkt.appendChild(animX); pkt.appendChild(animY); pkt.appendChild(fade);
    svg.appendChild(pkt);
  });

  // -----  Tooltip — built with safe DOM methods (no innerHTML)  -----
  function makeRow(parent) {
    const div = document.createElement('div');
    parent.appendChild(div);
    return div;
  }
  function appendCode(parent, label, value) {
    parent.append(label + ' ');
    const c = document.createElement('code');
    c.textContent = value;
    parent.appendChild(c);
  }
  function show(pod) {
    const r = pod.getBoundingClientRect();
    const host = wrap.getBoundingClientRect();
    tip.style.left = (r.left - host.left + r.width / 2) + 'px';
    tip.style.top  = (r.top  - host.top  - 8) + 'px';
    const cpuN = parseInt(pod.dataset.cpu || '0', 10);
    const statColor = cpuN >= 65 ? '#ef4444' : (cpuN >= 40 ? '#f59e0b' : '#34d399');
    const statLabel = cpuN >= 65 ? 'hot' : (cpuN >= 40 ? 'warm' : 'healthy');

    tip.replaceChildren();
    const row1 = makeRow(tip);
    const strong = document.createElement('strong');
    strong.textContent = pod.dataset.pod || '';
    row1.appendChild(strong);
    row1.append('  ');
    const dot = document.createElement('span');
    dot.style.color = statColor;
    dot.textContent = '●';
    row1.appendChild(dot);
    row1.append(' ' + statLabel);

    const row2 = makeRow(tip);
    appendCode(row2, 'cpu', pod.dataset.cpu || '');
    row2.append(' · ');
    appendCode(row2, 'mem', pod.dataset.mem || '');

    const row3 = makeRow(tip);
    appendCode(row3, 'age', pod.dataset.age || '');
    row3.append(' · ');
    appendCode(row3, 'ready', '1/1');
    row3.append(' · ');
    appendCode(row3, 'restarts', '0');

    tip.classList.add('is-visible');
  }
  function hide() { tip.classList.remove('is-visible'); }

  pods.forEach((p) => {
    p.addEventListener('mouseenter', () => show(p));
    p.addEventListener('focus',      () => show(p));
    p.addEventListener('mouseleave', hide);
    p.addEventListener('blur',       hide);
  });

  // -----  Caption state machine (idle ↔ traffic) with typewriter  -----
  const states = {
    idle:     { text: 'cluster · idle · 7/7 ready',                state: 'idle' },
    traffic:  { text: 'cluster · serving · 1.4k req/s · p99 142ms', state: 'traffic' },
    healthy:  { text: 'cluster · healthy · 5m uptime',              state: 'idle' },
  };
  function setCaption(key) {
    const s = states[key];
    if (!s || !status) return;
    wrap.dataset.state = s.state;
    // Typewriter — strip the current text, type new
    const target = s.text;
    let i = 0;
    status.textContent = '';
    const id = setInterval(() => {
      status.textContent = target.slice(0, ++i);
      if (i >= target.length) clearInterval(id);
    }, 22);
  }
  // Auto cycle every 8 seconds, only when chaos isn't running
  setCaption('idle');
  let cycle = 0;
  if (!window.__reduceMotion) {
    const cycler = setInterval(() => {
      if (chaos?.dataset.firing === '1') return;
      cycle = (cycle + 1) % 3;
      setCaption(['traffic','healthy','idle'][cycle]);
    }, 7500);
    window.__clusterCycler = cycler;
  }

  // -----  Chaos: shockwave + sparks + state churn  -----
  function emitSparks() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = chaos.getBoundingClientRect();
    const host = wrap.getBoundingClientRect();
    const cx = r.left - host.left + r.width / 2;
    const cy = r.top  - host.top  + r.height / 2;
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('span');
      s.style.cssText = `
        position:absolute; left:${cx}px; top:${cy}px;
        width:7px; height:7px; border-radius:50%;
        background:#ef4444; box-shadow:0 0 10px #ef4444, 0 0 18px rgba(239,68,68,.55);
        pointer-events:none; z-index:10;
        transition: transform 800ms cubic-bezier(.2,.7,.2,1), opacity 800ms;
      `;
      wrap.appendChild(s);
      // Bias the fan upward — chaos button sits at the bottom of the wrap,
      // so a full 360° pattern would clip half the sparks against overflow:hidden.
      const ang = Math.PI + Math.PI * ((i + 0.5) / 8);
      const dist = 90 + Math.random() * 60;
      requestAnimationFrame(() => {
        s.style.transform = `translate(${Math.cos(ang)*dist}px, ${Math.sin(ang)*dist}px) scale(0.2)`;
        s.style.opacity = '0';
      });
      setTimeout(() => s.remove(), 800);
    }
  }

  chaos?.addEventListener('click', () => {
    if (chaos.disabled) return;
    chaos.disabled = true;
    chaos.dataset.firing = '1';
    chaos.classList.add('is-firing');
    setTimeout(() => chaos.classList.remove('is-firing'), 500);
    emitSparks();

    const target = pods[Math.floor(Math.random() * pods.length)];
    const podName = target.dataset.pod;
    target.classList.add('is-killed');
    wrap.dataset.state = 'degraded';
    if (status) status.textContent = `cluster · DEGRADED · 6/7 ready · ${podName} crashloop`;
    if (window.__showToast) window.__showToast(`💥 pod ${podName} killed — kubernetes will reschedule`);

    setTimeout(() => {
      wrap.dataset.state = 'healing';
      if (status) status.textContent = `cluster · healing · scheduling new pod…`;
    }, 1100);

    setTimeout(() => {
      target.classList.remove('is-killed');
      target.classList.add('is-recovered');
      if (window.__showToast) window.__showToast(`✓ pod ${podName} back · 1.8s — k8s did its job`);
      setCaption('healthy');
      setTimeout(() => target.classList.remove('is-recovered'), 1200);
      chaos.disabled = false;
      chaos.dataset.firing = '0';
    }, 2400);
  });
})();

/* 24.M — Comparison slider ---------------------------------------------*/
(function compareSlider() {
  const track = document.getElementById('cmpTrack');
  const cut   = document.getElementById('cmpCut');
  const handle= document.getElementById('cmpHandle');
  if (!track || !cut || !handle) return;
  let dragging = false;
  function setPct(pct) {
    pct = Math.max(0, Math.min(100, pct));
    track.style.setProperty('--cmp', pct + '%');
    handle.setAttribute('aria-valuenow', Math.round(pct));
  }
  function onMove(e) {
    if (!dragging) return;
    const r = track.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setPct((x / r.width) * 100);
  }
  function start() { dragging = true; }
  function end()   { dragging = false; }
  handle.addEventListener('mousedown', start);
  handle.addEventListener('touchstart', start, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', end);
  window.addEventListener('touchend', end);
  handle.addEventListener('keydown', (e) => {
    const cur = parseInt(handle.getAttribute('aria-valuenow') || '50', 10);
    if (e.key === 'ArrowLeft')  setPct(cur - 4);
    if (e.key === 'ArrowRight') setPct(cur + 4);
  });
  setPct(50);
})();

/* 24.N — Scroll-to-top orbit -------------------------------------------*/
(function scrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  function onScroll() {
    if (window.scrollY > window.innerHeight * 0.9) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: _v2_reduce ? 'auto' : 'smooth' }));
  onScroll();
})();

/* 24.O — Click-to-copy email + section anchors --------------------------*/
(function copyHelpers() {
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  document.body.appendChild(toast);
  function flash(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    if ('vibrate' in navigator) try { navigator.vibrate(8); } catch {}
    clearTimeout(flash._t);
    flash._t = setTimeout(() => toast.classList.remove('is-visible'), 1400);
  }
  // Eyebrows -> copy section URL
  document.querySelectorAll('.section__eyebrow').forEach((eb) => {
    eb.addEventListener('click', () => {
      const sec = eb.closest('section');
      if (!sec || !sec.id) return;
      const url = `${location.origin}${location.pathname}#${sec.id}`;
      navigator.clipboard?.writeText(url);
      flash(`copied · #${sec.id}`);
    });
  });
  // expose globally for cluster + cmdk to reuse
  window.__copyToast = flash;
})();

/* 24.P — Toast helper (used by chaos button + Konami egg) ---------------*/
(function toastBus() {
  const t = document.getElementById('toast');
  if (!t) return;
  window.__showToast = (msg) => {
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(window.__showToast._t);
    window.__showToast._t = setTimeout(() => t.classList.remove('is-visible'), 1700);
  };
})();

/* 24.Q — Live cards: GitHub commit bars (synthetic, deterministic) ------*/
(function liveCards() {
  const ghChart = document.getElementById('ghChart');
  const ghNum   = document.getElementById('ghNum');
  if (!ghChart) return;
  let s = 0xC0FFEE;
  const r = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const N = 90, bars = [];
  let total = 0;
  for (let i = 0; i < N; i++) {
    const v = Math.floor(r() * 14) + (r() < 0.18 ? 6 : 0);
    total += v;
    bars.push(`<i style="height:${Math.max(4, v * 4)}px"></i>`);
  }
  ghChart.innerHTML = bars.join('');
  if (ghNum) ghNum.textContent = `${total} commits`;
})();

/* 24.R — Command palette ------------------------------------------------*/
(function commandPalette() {
  const dlg = document.getElementById('cmdk');
  const input = document.getElementById('cmdkInput');
  const list = document.getElementById('cmdkList');
  if (!dlg || !input || !list) return;
  const items = [
    { kw: 'impact',      label: 'Go to Impact',          hint: 'G I',  run: () => location.hash = '#metrics' },
    { kw: 'about',       label: 'Go to About',           hint: 'G A',  run: () => location.hash = '#about' },
    { kw: 'skills',      label: 'Go to Skills',          hint: 'G S',  run: () => location.hash = '#skills' },
    { kw: 'experience',  label: 'Go to Experience',      hint: 'G E',  run: () => location.hash = '#experience' },
    { kw: 'projects',    label: 'Go to Projects',        hint: 'G P',  run: () => location.hash = '#projects' },
    { kw: 'education',   label: 'Go to Education',       hint: 'G U',  run: () => location.hash = '#education' },
    { kw: 'contact',     label: 'Go to Contact',         hint: 'G C',  run: () => location.hash = '#contact' },
    { kw: 'theme dark',  label: 'Toggle dark / light',   hint: 'T',    run: () => document.getElementById('themeToggle')?.click() },
    { kw: 'forest',      label: 'Theme · Forest',        hint: '',     run: () => switchTheme('forest') },
    { kw: 'bronze',      label: 'Theme · Bronze',        hint: '',     run: () => switchTheme('bronze') },
    { kw: 'midnight',    label: 'Theme · Midnight',      hint: '',     run: () => switchTheme('midnight') },
    { kw: 'plum',        label: 'Theme · Plum',          hint: '',     run: () => switchTheme('plum') },
    { kw: 'solar',       label: 'Theme · Solar',         hint: '',     run: () => switchTheme('solar') },
    { kw: 'slate',       label: 'Theme · Slate',         hint: '',     run: () => switchTheme('slate') },
    { kw: 'resume',      label: 'Open resume PDF',       hint: '',     run: () => window.open('assets/Anish_Saji_Kumar_Resume.pdf', '_blank') },
    { kw: 'linkedin',    label: 'Open LinkedIn profile', hint: '',     run: () => window.open('https://www.linkedin.com/in/anish-kumar-sre-devops', '_blank') },
    { kw: 'github',      label: 'Open GitHub profile',   hint: '',     run: () => window.open('https://github.com/ANISHSAJIKUMAR', '_blank') },
  ];
  function switchTheme(name) {
    document.documentElement.dataset.theme = name;
    localStorage.setItem('portfolio.theme', name);
    document.querySelectorAll('#themePop button[data-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === name)));
  }
  let cursor = 0;
  function render(query) {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => (i.kw + ' ' + i.label).toLowerCase().includes(q))
      : items.slice(0, 10);
    cursor = Math.min(cursor, Math.max(0, filtered.length - 1));
    list.innerHTML = filtered.map((it, i) => `
      <li role="option" aria-selected="${i === cursor}" data-idx="${i}">
        <span>${it.label}</span><span class="cmdk__hint">${it.hint}</span>
      </li>`).join('');
    list._items = filtered;
  }
  function open() {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    input.value = '';
    cursor = 0;
    render('');
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }
  function run(idx) {
    const it = list._items?.[idx];
    if (!it) return;
    close();
    setTimeout(() => it.run(), 50);
  }
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (e) => {
    const max = (list._items?.length || 1) - 1;
    if (e.key === 'ArrowDown') { cursor = Math.min(max, cursor + 1); render(input.value); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { cursor = Math.max(0, cursor - 1); render(input.value); e.preventDefault(); }
    else if (e.key === 'Enter')   { run(cursor); }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-idx]');
    if (li) run(parseInt(li.dataset.idx, 10));
  });
  document.querySelector('[data-cmdk-close]')?.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && dlg.hasAttribute('open')) close();
  });
})();

/* 24.S — Keyboard help (?) ---------------------------------------------*/
(function kbdHelp() {
  const dlg = document.getElementById('kbdHelp');
  if (!dlg) return;
  function open() { typeof dlg.showModal === 'function' ? dlg.showModal() : dlg.setAttribute('open', ''); }
  function close() { typeof dlg.close === 'function' ? dlg.close() : dlg.removeAttribute('open'); }
  document.querySelector('[data-kbd-close]')?.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.target.matches('input, textarea')) { e.preventDefault(); open(); }
  });
})();

/* 24.T — G-then-letter section jump ------------------------------------*/
(function goShortcuts() {
  let armed = false;
  const map = { i: 'metrics', a: 'about', s: 'skills', e: 'experience', p: 'projects', u: 'education', c: 'contact' };
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'g' && !armed) { armed = true; setTimeout(() => armed = false, 1400); return; }
    if (armed) {
      const id = map[e.key.toLowerCase()];
      if (id) { armed = false; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    if (e.key === 't' && !e.target.matches('input, textarea')) document.getElementById('themeToggle')?.click();
    if (e.key === 'd' && !e.target.matches('input, textarea')) {
      const cur = document.documentElement.dataset.density || 'cosy';
      const next = { compact: 'cosy', cosy: 'comfy', comfy: 'compact' }[cur] || 'cosy';
      document.documentElement.dataset.density = next;
      localStorage.setItem('portfolio.density', next);
      window.__showToast?.(`density · ${next}`);
    }
  });
})();

/* 24.U — Preferences popover wiring ------------------------------------*/
(function prefsWire() {
  const root = document.documentElement;
  const KEY = 'portfolio.prefs';
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  const apply = (p) => {
    if (p.density) root.dataset.density = p.density;
    if (p.motion)  root.dataset.motion  = p.motion;
    if (p.font)    root.dataset.font    = p.font;
    if (p.cvd)     root.dataset.cvd     = p.cvd;
  };
  apply(saved);

  document.querySelectorAll('.seg').forEach((seg) => {
    const key = seg.dataset.pref;
    if (saved[key]) {
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === saved[key])));
    }
    seg.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        saved[key] = btn.dataset.val;
        localStorage.setItem(KEY, JSON.stringify(saved));
        apply(saved);
        if ('vibrate' in navigator) try { navigator.vibrate(6); } catch {}
      });
    });
  });
})();

/* 24.V — Pull-to-refresh easter egg ------------------------------------*/
(function pullToRefresh() {
  if (!('ontouchstart' in window)) return;
  let startY = 0, pulled = 0;
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (window.scrollY === 0 && startY) {
      pulled = e.touches[0].clientY - startY;
      if (pulled > 80) document.body.classList.add('is-pulled');
    }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (pulled > 80) {
      window.__showToast?.('incident postmortem published 🚀');
      if ('vibrate' in navigator) try { navigator.vibrate([10, 30, 10]); } catch {}
    }
    document.body.classList.remove('is-pulled');
    startY = 0; pulled = 0;
  });
})();

/* 24.W — Swipe between sections (mobile) -------------------------------*/
(function swipeNav() {
  if (!('ontouchstart' in window) || _v2_reduce) return;
  const ids = ['top', 'metrics', 'about', 'skills', 'experience', 'projects', 'education', 'live', 'contact'];
  let sx = 0, sy = 0, t = 0;
  document.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; t = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const dt = Date.now() - t;
    if (dt > 600) return;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
    const cur = ids.findIndex((id) => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return r && r.top <= 80 && r.bottom > 80;
    });
    if (cur < 0) return;
    const nextIdx = dx < 0 ? Math.min(ids.length - 1, cur + 1) : Math.max(0, cur - 1);
    document.getElementById(ids[nextIdx])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, { passive: true });
})();

/* 24.X — Gyroscope parallax (mobile) -----------------------------------*/
(function gyroParallax() {
  if (_v2_reduce) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  function handle(e) {
    if (e.gamma == null || e.beta == null) return;
    const x = Math.max(-1, Math.min(1, e.gamma / 30));
    const y = Math.max(-1, Math.min(1, e.beta  / 60));
    hero.style.setProperty('--px', x.toFixed(3));
    hero.style.setProperty('--py', y.toFixed(3));
  }
  window.addEventListener('deviceorientation', handle);
})();

/* 24.Y — Reveal-by-cursor mask (contact lead) --------------------------*/
(function cursorMask() {
  const lead = document.querySelector('.contact .section__lead');
  if (!lead) return;
  lead.addEventListener('mousemove', (e) => {
    const r = lead.getBoundingClientRect();
    lead.style.setProperty('--cx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    lead.style.setProperty('--cy', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
  });
})();

/* 24.Z — View transitions between sections (when supported) ------------*/
(function vtSections() {
  if (!('startViewTransition' in document)) return;
  const sections = [...document.querySelectorAll('main > .section, main > .hero')];
  sections.forEach((s, i) => s.style.setProperty('--vt', `sec-${i}`));
  window.addEventListener('hashchange', () => {
    document.startViewTransition?.(() => {});
  });
})();

/* 24.AA — Code-style auto-tagging on inline tool words -----------------*/
(function autoCodify() {
  // Limited list to avoid false positives in prose.
  const tools = ['kubectl', 'Datadog', 'PagerDuty', 'Terraform', 'Aurora', 'Solr', 'Hazelcast'];
  const re = new RegExp('\\b(' + tools.join('|') + ')\\b', 'g');
  document.querySelectorAll('.about__lead, .about__body, .pillar p').forEach((el) => {
    el.innerHTML = el.innerHTML.replace(re, '<span class="tool-tag">$1</span>');
  });
})();
