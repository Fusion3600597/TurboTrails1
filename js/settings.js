/* Turbo Tales — graphics presets.
   Browser-native equivalents of the usual quality tiers: render scale, shadows,
   particle density, weather density, texture filtering, and fog.

   "Ultra" is a high-end realism preset, not hardware ray tracing or DLSS.
   Everything remains procedural and runs in a single WebGL canvas. */

export const GRAPHICS = {
  low: {
    id: 'low', label: 'Low', blurb: 'Fast & light',
    dpr: 0.72, shadows: false, shadowSize: 512,
    particles: 0.45, weather: 0.4, anisotropy: 2, fog: 1.18, exposure: 1.0,
  },
  medium: {
    id: 'medium', label: 'Medium', blurb: 'Balanced detail',
    dpr: 1, shadows: true, shadowSize: 1024,
    particles: 0.75, weather: 0.7, anisotropy: 4, fog: 1.08, exposure: 1.0,
  },
  high: {
    id: 'high', label: 'High', blurb: 'Rich & smooth',
    dpr: 1.5, shadows: true, shadowSize: 2048,
    particles: 1, weather: 1, anisotropy: 8, fog: 1, exposure: 1.0,
  },
  ultra: {
    id: 'ultra', label: 'Ultra', blurb: 'Ultra High Realism',
    dpr: 2.25, shadows: true, shadowSize: 4096,
    particles: 1.35, weather: 1.35, anisotropy: 16, fog: 0.92, exposure: 1.04,
  },
};

let active = GRAPHICS.high;

export function qualityById(id) {
  return GRAPHICS[id] || GRAPHICS.high;
}

export function setGraphics(id) {
  active = qualityById(id);
  return active;
}

export function graphics() {
  return active;
}

export function pixelRatioFor(q = active) {
  if (q.id === 'low') return Math.min(window.devicePixelRatio || 1, 1) * 0.72;
  if (q.id === 'medium') return Math.min(window.devicePixelRatio || 1, 1.1);
  if (q.id === 'ultra') return Math.min((window.devicePixelRatio || 1) * 1.25, 2.5);
  return Math.min(window.devicePixelRatio || 1, 1.5);
}
