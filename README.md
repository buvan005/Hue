# HUE. — Premium UI (Svelte + Tailwind)

A color-guessing game UI built to match Dialed.gg quality standards, using DM Sans, custom vertical sliders, and smooth Svelte transitions.

---

## Folder Structure

```
dialed/
├── src/
│   ├── App.svelte              ← Root: state, game loop, header/footer
│   ├── index.html              ← Standalone demo (Tailwind CDN, no build needed)
│   └── lib/
│       ├── GameCard.svelte     ← Card container, phase routing, transitions
│       ├── ColorStage.svelte   ← Memorize phase (timer bar, countdown, GO reveal)
│       ├── Sliders.svelte      ← Vertical HSB sliders + live preview + submit
│       ├── ResultView.svelte   ← Split card: guess vs target, score reveal
│       ├── ScoreDisplay.svelte ← Reusable animated count-up number
│       └── EndModal.svelte     ← Dark results screen: breakdown strip, share
```

---

## Quick Start (Svelte)

```bash
npm create vite@latest dialed -- --template svelte
cd dialed
npm install
npm install -D tailwindcss autoprefixer
npx tailwindcss init

# Add to tailwind.config.js content:
# './src/**/*.{svelte,js,html}'

# Copy src/ files from this package
npm run dev
```

### tailwind.config.js
```js
export default {
  content: ['./src/**/*.{svelte,js,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
}
```

### app.css (global)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
```

---

## Standalone Demo

Open `src/index.html` directly in any browser — no build step needed. Uses Tailwind CDN and vanilla JS to simulate the Svelte component structure.

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#efeeec` (warm off-white) |
| Card | `#ffffff` |
| Card shadow | `0 32px 80px rgba(0,0,0,0.11)` |
| End screen | `#0d0d0d` |
| Font | DM Sans (300–900) |
| Border radius | `rounded-3xl` (24px) |
| Score accent | `#e8b84b` (gold) |

### Transition Timing
- Phase fade-in: `280ms cubic-bezier(0.4,0,0.2,1)`
- Score count-up: `900ms` ease-out cubic
- Button hover: `150ms`
- Timer bar: linear, matches MEM_MS

---

## Component API

### `<ColorStage>`
| Prop | Type | Description |
|------|------|-------------|
| `target` | `{h,s,b}` | Target color |
| `round` | `number` | Current round |
| `total` | `number` | Total rounds |
| `colorMath` | `object` | Color utility object |
| `on:done` | event | Fires when memorize phase ends |

### `<Sliders>`
| Prop | Type | Description |
|------|------|-------------|
| `initial` | `{h,s,b}` | Starting slider values |
| `colorMath` | `object` | Color utility object |
| `on:submit` | event | `{ detail: {h,s,b} }` |

### `<ResultView>`
| Prop | Type | Description |
|------|------|-------------|
| `result` | object | `{ score, dE, guess, target, msg }` |
| `on:next` | event | Fires on next button |

### `<EndModal>`
| Prop | Type | Description |
|------|------|-------------|
| `rounds` | array | All round results |
| `totalScore` | number | Sum of scores |
| `isNewBest` | boolean | Show PB badge |
| `on:playAgain` | event | Reset and restart |

---

## Key UX Decisions

- **DM Sans** instead of Inter — heavier, more confident numerics
- **Warm gray background** (`#efeeec`) — less clinical than pure white/gray
- **Vertical sliders** with custom `-webkit-slider-thumb` for touch-friendly drag
- **Adaptive contrast** — button and text colors invert based on luminance of the active color
- **Diagonal breakdown** strip — guess color fills top-left triangle, target fills bottom-right
- **Score count-up** starts at 0, eases to final value for anticipation
- **dE (Delta E) badge** shown on result screen for advanced players
- **`prefers-reduced-motion`** not yet wired — add via Svelte's `prefersReducedMotion` store if needed
