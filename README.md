# Anish Saji Kumar — Portfolio

[![CI](https://github.com/ANISHSAJIKUMAR/anishsajikumar.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/ANISHSAJIKUMAR/anishsajikumar.github.io/actions/workflows/ci.yml)

Static one-page portfolio + resume host.

🌐 **Live site:** https://anishsajikumar.github.io/
📄 **Resume PDF:** [assets/Anish_Saji_Kumar_Resume.pdf](assets/Anish_Saji_Kumar_Resume.pdf)

## Stack

- Hand-written HTML + CSS + vanilla JS — no framework, no build step.
- Inter (sans) and JetBrains Mono (numbers / labels) from Google Fonts.
- Light / dark theme via CSS custom properties + `prefers-color-scheme`,
  with a manual toggle that persists in `localStorage`.
- Hosted on GitHub Pages (auto-deploys from `main`).

## Local preview

```sh
# any static server works — pick one:
python3 -m http.server 8080
# then open http://localhost:8080
```

## Files

```
.
├── index.html              ← markup + content
├── assets/
│   ├── style.css           ← responsive theme (CSS custom properties)
│   ├── script.js           ← dark-mode toggle + nav highlighter
│   └── Anish_Saji_Kumar_Resume.pdf
├── .nojekyll               ← tells GitHub Pages "skip Jekyll"
└── README.md               ← you are here
```

## Why a separate repo

This repo contains only what is safe to publish: resume content, public
contact handles (email + LinkedIn + GitHub), and the resume PDF. The
larger job-search workspace (cover letters, references with phone numbers,
salary notes, application tracker, 250-Q&A bank, internal STAR stories)
stays private elsewhere.
