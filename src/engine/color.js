// ─── HSB / RGB / XYZ / LAB Conversions ──────────────────────────────────────

/**
 * Convert HSB (Hue 0-360, Saturation 0-100, Brightness 0-100) to RGB.
 * @returns {{ r: number, g: number, b: number }} — each 0-255
 */
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

/**
 * Linear-space sRGB → CIE XYZ (D65 illuminant).
 */
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

/**
 * CIE XYZ → CIELAB (D65 reference white).
 */
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

/**
 * HSB → CIELAB (convenience pipeline).
 */
export function hsbToLab(h, s, b) {
  const rgb = hsbToRgb(h, s, b);
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

/**
 * CIE76 Delta E between two Lab colors.
 */
export function deltaE(lab1, lab2) {
  return Math.sqrt(
    (lab1.L - lab2.L) ** 2 +
    (lab1.a - lab2.a) ** 2 +
    (lab1.b - lab2.b) ** 2
  );
}

// ─── Display Helpers ────────────────────────────────────────────────────────

/**
 * RGB → hex string (e.g. "#ff8800").
 */
export function hex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * HSB → hex string (convenience).
 */
export function hsbHex(h, s, b) {
  const rgb = hsbToRgb(h, s, b);
  return hex(rgb.r, rgb.g, rgb.b);
}

/**
 * Perceived luminance (ITU-R BT.601).
 * > 145 = "light" background → use dark text
 * < 145 = "dark" background  → use light text
 */
export function luma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ─── Random Color Generators ────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random target color — biased toward saturated, mid-bright range. */
export function randomTargetColor() {
  return {
    h: randomInt(0, 359),
    s: randomInt(28, 100),
    b: randomInt(32, 95)
  };
}

/** Random initial guess — wider / lower range so user starts "off". */
export function randomGuessColor() {
  return {
    h: randomInt(0, 359),
    s: randomInt(15, 79),
    b: randomInt(20, 74)
  };
}
