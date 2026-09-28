// ─── HSB / RGB / XYZ / LAB Conversions (Server-side Engine) ─────────────────

export function hsbToRgb(h, s, b) {
  const sat = s / 100;
  const bri = b / 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) =>
    bri * (1 - sat * Math.max(0, Math.min(k(n), 4 - k(n), 1)));

  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255)
  };
}

export function rgbToXyz(r, g, b) {
  const linearize = (channel) => {
    const n = channel / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };

  const [rl, gl, bl] = [linearize(r), linearize(g), linearize(b)];

  return {
    x: rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    y: rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175,
    z: rl * 0.0193339 + gl * 0.119192  + bl * 0.9503041
  };
}

export function xyzToLab(x, y, z) {
  const transform = (v) =>
    v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;

  const [fx, fy, fz] = [
    transform(x / 0.95047),
    transform(y),
    transform(z / 1.08883)
  ];

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

export function hsbToLab(h, s, b) {
  const rgb = hsbToRgb(h, s, b);
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

export function deltaE(lab1, lab2) {
  return Math.sqrt(
    (lab1.L - lab2.L) ** 2 +
    (lab1.a - lab2.a) ** 2 +
    (lab1.b - lab2.b) ** 2
  );
}

export function hex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hsbHex(h, s, b) {
  const rgb = hsbToRgb(h, s, b);
  return hex(rgb.r, rgb.g, rgb.b);
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomTargetColor() {
  return {
    h: randomInt(0, 359),
    s: randomInt(28, 100),
    b: randomInt(32, 95)
  };
}

// Pseudo-random deterministic generator for Daily Challenge (seeded by date YYYY-MM-DD)
export function getDailyTargets(dateStr) {
  // Simple deterministic mulberry32 PRNG based on date string hash
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
  }

  function mulberry32() {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const targets = [];
  for (let i = 0; i < 5; i++) {
    targets.push({
      h: Math.floor(mulberry32() * 360),
      s: Math.floor(mulberry32() * 73) + 28,
      b: Math.floor(mulberry32() * 64) + 32
    });
  }
  return targets;
}
