/* Turbo Tales — hand-drawn vector icon set.
   Everything is inline SVG so the UI never depends on emoji fonts. */

const wrap = (inner, cls = '') =>
  `<svg class="icon-svg ${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inner}</svg>`;

const eye = (x, y, r = 3.1, pupil = 1.5) => `
  <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r + 0.7}" fill="#1b1526"/>
  <circle cx="${x + 0.9}" cy="${y - 1}" r="${pupil}" fill="#fff" opacity=".9"/>`;

const shine = (cx, cy, rx, ry, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".22" transform="rotate(${rot} ${cx} ${cy})"/>`;

const RACER_ART = {
  fox: `
    <path d="M13 27 9.5 8.5c-.3-1.8 1.7-2.8 3-1.6L25 17Z" fill="#d95f18"/>
    <path d="M51 27 54.5 8.5c.3-1.8-1.7-2.8-3-1.6L39 17Z" fill="#d95f18"/>
    <path d="M15 24.5 13 12l9 6.5Z" fill="#ffd9b8"/>
    <path d="M49 24.5 51 12l-9 6.5Z" fill="#ffd9b8"/>
    <path d="M32 18c11.6 0 19.5 8.1 19.5 19.4 0 10-7.4 17.1-19.5 17.1S12.5 47.4 12.5 37.4C12.5 26.1 20.4 18 32 18Z" fill="#f47b2c"/>
    <path d="M32 34c6 0 11 4.5 11 9.5 0 6-5 10.5-11 10.5S21 49.5 21 43.5C21 38.5 26 34 32 34Z" fill="#ffe9d6"/>
    <path d="M14 33c3-1.6 6.2-2.2 9-1.9l-2 3.6c-2.4-.6-4.9-.3-7 .9Z" fill="#ffae62" opacity=".65"/>
    ${shine(24, 25.5, 5.5, 3, -25)}
    ${eye(24, 32)}${eye(40, 32)}
    <path d="M27.5 43.2c1.4-1.7 7.6-1.7 9 0l-1.3 2.1h-6.4Z" fill="#2a1a16"/>
    <path d="M32 47.5v2.2M32 49.7c-1.4 0-2.4.9-2.4 1.8M32 49.7c1.4 0 2.4.9 2.4 1.8" stroke="#2a1a16" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
  bunny: `
    <ellipse cx="21" cy="17" rx="6.2" ry="15.5" fill="#dfe8ff" transform="rotate(-13 21 17)"/>
    <ellipse cx="43" cy="17" rx="6.2" ry="15.5" fill="#dfe8ff" transform="rotate(13 43 17)"/>
    <ellipse cx="21.5" cy="17" rx="2.7" ry="11.5" fill="#ffb3cf" transform="rotate(-13 21.5 17)"/>
    <ellipse cx="42.5" cy="17" rx="2.7" ry="11.5" fill="#ffb3cf" transform="rotate(13 42.5 17)"/>
    <path d="M32 20c11 0 18 7.6 18 17.4C50 47.8 42.7 55 32 55S14 47.8 14 37.4C14 27.6 21 20 32 20Z" fill="#eef4ff"/>
    <path d="M18.5 35.5c2.8-1.6 6-2.1 8.7-1.6l-2 3.4c-2.2-.5-4.5-.1-6.5 1Z" fill="#c7d8ff" opacity=".7"/>
    ${shine(24, 27, 5, 3, -25)}
    ${eye(24, 35, 3.4, 1.6)}${eye(40, 35, 3.4, 1.6)}
    <path d="M29.5 43c1.5-1.3 3.5-1.3 5 0l-2.5 2.6Z" fill="#ff86ae"/>
    <path d="M32 45.6v2M32 47.6c-1.5 0-2.7.9-2.7 1.9M32 47.6c1.5 0 2.7.9 2.7 1.9" stroke="#6b6280" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M14 41.5 5.5 39M14.5 45 6 46.5M50 41.5l8.5-2.5M49.5 45l8.5 1.5" stroke="#b9c9eb" stroke-width="1.6" stroke-linecap="round"/>`,
  tiger: `
    <path d="M13.5 26 11 12l13 6.2ZM50.5 26 53 12l-13 6.2Z" fill="#e9a11e"/>
    <path d="M32 17c11.8 0 19.5 8.4 19.5 19.7 0 10.6-7.6 18.3-19.5 18.3S12.5 47.3 12.5 36.7C12.5 25.4 20.2 17 32 17Z" fill="#ffc12e"/>
    <path d="M31.8 18.2c-3.5 4.2-3.5 8.6 0 12.8 3.4-4.2 3.4-8.6 0-12.8Z" fill="#3c2a12"/>
    <path d="M17.7 28.4c2.1 2.2 2.7 5.2 1.8 8.4-2.4-2-3-5-1.8-8.4ZM46.3 28.4c-2.1 2.2-2.7 5.2-1.8 8.4 2.4-2 3-5 1.8-8.4Z" fill="#3c2a12"/>
    <path d="M14.5 39.5c2.6-1.4 5.4-1.8 7.9-1.4l-1.8 3.2c-2-.4-4 0-5.8.9Z" fill="#ffdf8c" opacity=".7"/>
    ${shine(24, 25.5, 5.5, 3, -25)}
    ${eye(24, 31.5)}${eye(40, 31.5)}
    <path d="M32 35c6 0 10.7 4.1 10.7 9 0 5.7-4.7 10-10.7 10s-10.7-4.3-10.7-10c0-4.9 4.7-9 10.7-9Z" fill="#fff2d6"/>
    <path d="M27.2 42.2c1.6-1.5 8-1.5 9.6 0l-1.4 2.2h-6.8Z" fill="#3c2a12"/>
    <path d="M32 46.5v2M32 48.5c-1.3 0-2.3.8-2.3 1.7M32 48.5c1.3 0 2.3.8 2.3 1.7M24 48.5l-4 1M40 48.5l4 1" stroke="#3c2a12" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
  frog: `
    <path d="M14 28c.6-8.4 7.5-14 18-14s17.4 5.6 18 14Z" fill="#4fb54e"/>
    <circle cx="21" cy="22" r="10" fill="#58c95a"/>
    <circle cx="43" cy="22" r="10" fill="#58c95a"/>
    <circle cx="21" cy="21" r="6.4" fill="#f6ffe9"/>
    <circle cx="43" cy="21" r="6.4" fill="#f6ffe9"/>
    <circle cx="21.5" cy="21.5" r="3.3" fill="#17210f"/>
    <circle cx="42.5" cy="21.5" r="3.3" fill="#17210f"/>
    <circle cx="22.7" cy="20.2" r="1.1" fill="#fff"/>
    <circle cx="43.7" cy="20.2" r="1.1" fill="#fff"/>
    <path d="M32 21c-10.4 0-17.3 7-17.3 17.2C14.7 47.5 22 54 32 54s17.3-6.5 17.3-15.8C49.3 28 42.4 21 32 21Z" fill="#58c95a"/>
    ${shine(23, 29, 5, 3, -25)}
    <ellipse cx="24.5" cy="34" rx="3" ry="3.5" fill="#2c4b1c" opacity=".55"/>
    <ellipse cx="39.5" cy="34" rx="3" ry="3.5" fill="#2c4b1c" opacity=".55"/>
    <path d="M23 43c2.7 3.8 15.3 3.8 18 0" stroke="#2c4b1c" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <circle cx="28" cy="38" r="1.1" fill="#2c4b1c"/><circle cx="36" cy="38" r="1.1" fill="#2c4b1c"/>
    <path d="M18 51c1-2.3 3-3.4 5.2-3.4M46 51c-1-2.3-3-3.4-5.2-3.4" stroke="#3f9a43" stroke-width="1.7" stroke-linecap="round"/>`,
  axolotl: `
    <path d="M13 30c-5-4.2-8.8-4.4-9.8-1.8-1 2.7 2.7 4.6 7.8 4.6-4.4 2.2-6.2 5-4.6 7 1.7 2 5.8-.4 9-5.2-2.7 4.2-3 7.4-1 8.4 2.1 1 4.2-2.3 4.7-7.1Z" fill="#f7a8ce"/>
    <path d="M51 30c5-4.2 8.8-4.4 9.8-1.8 1 2.7-2.7 4.6-7.8 4.6 4.4 2.2 6.2 5 4.6 7-1.7 2-5.8-.4-9-5.2 2.7 4.2 3 7.4 1 8.4-2.1 1-4.2-2.3-4.7-7.1Z" fill="#f7a8ce"/>
    <path d="M32 17c11.2 0 18.5 7.9 18.5 18.7C50.5 46.5 43 54 32 54S13.5 46.5 13.5 35.7C13.5 24.9 20.8 17 32 17Z" fill="#ff9ccd"/>
    ${shine(24, 25, 5.5, 3, -25)}
    ${eye(24.5, 33, 3.3, 1.6)}${eye(39.5, 33, 3.3, 1.6)}
    <path d="M27.5 42c2.5 1.8 6.5 1.8 9 0" stroke="#b03c72" stroke-width="2" stroke-linecap="round" fill="none"/>
    <circle cx="22" cy="38" r="2.2" fill="#ff6ba8" opacity=".55"/><circle cx="42" cy="38" r="2.2" fill="#ff6ba8" opacity=".55"/>
    <path d="M27 21c-1.4 2.4-1.2 4.4.4 6.2M37 21c1.4 2.4 1.2 4.4-.4 6.2" stroke="#ffd6e9" stroke-width="1.5" stroke-linecap="round"/>`,
  dino: `
    <path d="M20 19c-1-5 1.5-9 4-11l3 7.5ZM31 15.5c-.4-5 2.5-8.5 5.2-10l2.1 8ZM42 19.5c1-4.4 3.8-7 6.4-7.8l.5 8.4Z" fill="#1f7d5c"/>
    <path d="M32 16c11.8 0 20.5 8 20.5 19.2 0 6.6-2.5 11.6-6.4 15.3l4.4 5.4c.8 1-.2 2.4-1.4 2l-7.4-2.6C38.9 56.6 35.6 57.4 32 57.4c-11.8 0-20.5-8.3-20.5-22.2C11.5 24 20.2 16 32 16Z" fill="#36b58f"/>
    <path d="M32 24c8.4 0 14 5.4 14 12.7 0 8.5-5.6 15-14 15s-14-6.5-14-15C18 29.4 23.6 24 32 24Z" fill="#5fd2a8"/>
    ${shine(23, 27, 5, 2.7, -25)}
    ${eye(24.5, 33.5, 3.2, 1.5)}${eye(39.5, 33.5, 3.2, 1.5)}
    <path d="M25 43c2.1 1.8 4.4 2.6 7 2.6s4.9-.8 7-2.6" stroke="#175b44" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M23 47h4l-2 3.2ZM30 48h4l-2 3.2ZM37 47h4l-2 3.2Z" fill="#fff8e2"/>
    <circle cx="21" cy="39" r="2" fill="#ffd166" opacity=".7"/><circle cx="43" cy="39" r="2" fill="#ffd166" opacity=".7"/>`,
  penguin: `
    <path d="M32 13c11.4 0 19.6 8.6 19.6 20 0 13.2-8.2 22-19.6 22s-19.6-8.8-19.6-22c0-11.4 8.2-20 19.6-20Z" fill="#233452"/>
    <path d="M19 31c0-8.8 5.4-14 13-14s13 5.2 13 14c0 10.6-5.4 18-13 18s-13-7.4-13-18Z" fill="#f6fbff"/>
    <path d="M16.5 25.5c3.1-3.2 7.1-4.6 11.2-4.2-2.1 2.2-3.4 4.5-4 6.8-2.6-1.1-5-1.9-7.2-2.6Z" fill="#3d557c" opacity=".6"/>
    ${shine(25, 23, 4.2, 2.4, -25)}
    ${eye(26, 30, 2.7, 1.3)}${eye(38, 30, 2.7, 1.3)}
    <path d="M32 35.5 27 41c3.2 3.2 6.8 3.2 10 0Z" fill="#ffb84d"/>
    <path d="M27 41h10" stroke="#d97a13" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 49c2.6 2 5.3 3 8 3s5.4-1 8-3" stroke="#c8d9ee" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M14 17c-2.8 3-4.2 7-4.2 11.5M50 17c2.8 3 4.2 7 4.2 11.5" stroke="#233452" stroke-width="3" stroke-linecap="round"/>`,
  octopus: `
    <path d="M32 10c12 0 20 8.4 20 20.4 0 5.6-1.7 10.6-4.6 14.6l3.4 6.2c.7 1.3-.8 2.6-2 1.8l-5-3.7c-3.4 2.5-7.5 3.9-11.8 3.9s-8.4-1.4-11.8-3.9l-5 3.7c-1.2.8-2.7-.5-2-1.8l3.4-6.2C13.7 41 12 36 12 30.4 12 18.4 20 10 32 10Z" fill="#9a6cff"/>
    <path d="M32 15c9.4 0 15.5 6.3 15.5 15.1 0 10.4-6.1 17.6-15.5 17.6s-15.5-7.2-15.5-17.6C16.5 21.3 22.6 15 32 15Z" fill="#b58bff"/>
    ${shine(23, 22, 5.5, 3, -25)}
    <ellipse cx="24" cy="30" rx="5" ry="5.8" fill="#f9f3ff"/>
    <ellipse cx="40" cy="30" rx="5" ry="5.8" fill="#f9f3ff"/>
    <circle cx="24.5" cy="30.5" r="2.4" fill="#271b3d"/>
    <circle cx="39.5" cy="30.5" r="2.4" fill="#271b3d"/>
    <circle cx="25.5" cy="29.3" r=".9" fill="#fff"/><circle cx="40.5" cy="29.3" r=".9" fill="#fff"/>
    <path d="M28.5 39c2 1.2 5 1.2 7 0" stroke="#5f3bb0" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <path d="M18 23c1.8-2 4-3 6.2-3.2M45.8 23c-1.8-2-4-3-6.2-3.2" stroke="#ff8ade" stroke-width="2" stroke-linecap="round"/>
    <circle cx="20" cy="30" r="1.5" fill="#ff8ade" opacity=".65"/><circle cx="44" cy="30" r="1.5" fill="#ff8ade" opacity=".65"/>
    <path d="M22 50c1.4 2.6 1.1 5-.9 7.1M32 51c.3 2.8-.6 5.1-2.5 7M42 50c-1.4 2.6-1.1 5 .9 7.1" stroke="#7d4fdd" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
  cat: `
    <path d="M14 27 12 10l13 7.5ZM50 27 52 10 39 17.5Z" fill="#e8872e"/>
    <path d="M16.5 24.5 15.5 14l7 4.5ZM47.5 24.5 48.5 14l-7 4.5Z" fill="#ffd4b0"/>
    <path d="M32 18c11.8 0 19.5 8.2 19.5 19.4 0 10.3-7.5 17.6-19.5 17.6S12.5 47.7 12.5 37.4C12.5 26.2 20.2 18 32 18Z" fill="#ffa64d"/>
    <path d="M32 33.5c6.4 0 11.4 4.6 11.4 9.7 0 6.2-5 10.8-11.4 10.8s-11.4-4.6-11.4-10.8c0-5.1 5-9.7 11.4-9.7Z" fill="#fff0dc"/>
    ${shine(23, 25, 5.5, 3, -25)}
    ${eye(24, 32, 3.4, 1.6)}${eye(40, 32, 3.4, 1.6)}
    <path d="M29.5 41c1.5-1.4 3.5-1.4 5 0l-2.5 2.8Z" fill="#ff7fa8"/>
    <path d="M32 44v2.2M32 46.2c-1.5 0-2.7.9-2.7 1.9M32 46.2c1.5 0 2.7.9 2.7 1.9" stroke="#9c5c32" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M16 38 6 36M16 41.5 6.5 44M48 38l10-2M48 41.5l9.5 2.5" stroke="#fff3df" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M15 29c2.4-1.5 5-2 7.5-1.4M49 29c-2.4-1.5-5-2-7.5-1.4" stroke="#d97720" stroke-width="2" stroke-linecap="round"/>`,
  owl: `
    <path d="M14 22c-3-5-3.5-10-1.5-13 2.8 1.4 5.4 3.8 7.6 7.2ZM50 22c3-5 3.5-10 1.5-13-2.8 1.4-5.4 3.8-7.6 7.2Z" fill="#7a6cf0"/>
    <path d="M32 16c12 0 20 8.5 20 20.3C52 48.5 43.7 57 32 57S12 48.5 12 36.3C12 24.5 20 16 32 16Z" fill="#a396ff"/>
    <path d="M32 23c8.7 0 14.2 5.7 14.2 13.4C46.2 46 40.5 53 32 53s-14.2-7-14.2-16.6C17.8 28.7 23.3 23 32 23Z" fill="#c7bfff"/>
    <circle cx="24.5" cy="33.5" r="7.2" fill="#fff8e8"/><circle cx="39.5" cy="33.5" r="7.2" fill="#fff8e8"/>
    <circle cx="25" cy="34" r="3.6" fill="#1d1830"/><circle cx="39" cy="34" r="3.6" fill="#1d1830"/>
    <circle cx="26.2" cy="32.7" r="1.2" fill="#fff"/><circle cx="40.2" cy="32.7" r="1.2" fill="#fff"/>
    <path d="M32 38.5 27.5 43c2.8 3.6 6.2 3.6 9 0Z" fill="#ffb84d"/>
    <path d="M27.5 43h9" stroke="#d97a13" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M17 26c2.3-1.6 4.8-2.2 7.3-1.8M47 26c-2.3-1.6-4.8-2.2-7.3-1.8" stroke="#6f60d8" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M21 51c1.8 2.2 3.9 3.3 6.1 3.5M43 51c-1.8 2.2-3.9 3.3-6.1 3.5" stroke="#8b7ef0" stroke-width="1.8" stroke-linecap="round"/>`,
  shark: `
    <path d="M32 8c2 5 5.8 7.9 11 9.2l-5.1 4.2C34.5 19.5 33.2 16.2 32 12c-1.2 4.2-2.5 7.5-5.9 9.4l-5.1-4.2C26.2 15.9 30 13 32 8Z" fill="#1f86bd"/>
    <path d="M32 16c12.4 0 21 8.6 21 20.6 0 12.1-8.6 20.4-21 20.4S11 48.7 11 36.6C11 24.6 19.6 16 32 16Z" fill="#39a8df"/>
    <path d="M32 22c9.5 0 16 6.4 16 15.2C48 47 41.5 54 32 54s-16-7-16-16.8C16 28.4 22.5 22 32 22Z" fill="#6cc6ec"/>
    ${shine(23, 26, 5.5, 3, -25)}
    ${eye(24.5, 32, 3.2, 1.5)}${eye(39.5, 32, 3.2, 1.5)}
    <path d="M18 42c4.7 3.6 9.3 5.4 14 5.4s9.3-1.8 14-5.4" stroke="#1a6e97" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M21.5 42.5h4l-2 3.4ZM28 45h4l-2 3.4ZM36 45h4l-2 3.4ZM42.5 42.5h4l-2 3.4Z" fill="#fff8e2"/>
    <path d="M16 35h-5M16.5 38.5h-5.5M48 35h5M47.5 38.5h5.5" stroke="#c8eefc" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M20 25c2.7-1.5 5.6-2 8.5-1.5" stroke="#9adcf6" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`,
  robot: `
    <path d="M32 10V4M32 4h9" stroke="#9df7c4" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <circle cx="41" cy="4" r="2.6" fill="#ffd54d"/>
    <rect x="12" y="13" width="40" height="41" rx="13" fill="#3a4f63"/>
    <rect x="15.5" y="17" width="33" height="33" rx="10" fill="#5f7b8d"/>
    <rect x="20" y="24" width="24" height="11" rx="5.5" fill="#0e1a24"/>
    <circle cx="26.5" cy="29.5" r="2.9" fill="#7dffb0"/>
    <circle cx="37.5" cy="29.5" r="2.9" fill="#7dffb0"/>
    <circle cx="27.4" cy="28.6" r=".9" fill="#fff"/>
    <circle cx="38.4" cy="28.6" r=".9" fill="#fff"/>
    <path d="M25 42c4.4 2.4 9.6 2.4 14 0" stroke="#1b2c38" stroke-width="2.1" stroke-linecap="round" fill="none"/>
    <rect x="9" y="27" width="5" height="13" rx="2.5" fill="#7dffb0"/>
    <rect x="50" y="27" width="5" height="13" rx="2.5" fill="#7dffb0"/>
    <circle cx="17.5" cy="19.5" r="1.7" fill="#ffd54d"/><circle cx="46.5" cy="19.5" r="1.7" fill="#ffd54d"/>
    <path d="M20 54h24l-3 5H23Z" fill="#2a3b49"/>`,
};

export function racerIcon(racer, cls = '') {
  const art = RACER_ART[racer?.kind] || RACER_ART.fox;
  return wrap(art, cls);
}

const ITEM_ART = {
  mushroom: `
    <path d="M10 30C10 17 20 8 32 8s22 9 22 22c0 3.3-3.2 5-7.4 5H17.4C13.2 35 10 33.3 10 30Z" fill="#ff4d4d"/>
    <path d="M10 30c0-13 10-22 22-22 4 0 7.6.9 10.8 2.6C35 13 27 20 25 35H17.4C13.2 35 10 33.3 10 30Z" fill="#ff6b5c" opacity=".7"/>
    <circle cx="21" cy="22" r="6" fill="#fff4e3"/><circle cx="40" cy="18" r="4.6" fill="#fff4e3"/>
    <circle cx="48" cy="28" r="4" fill="#fff4e3"/><circle cx="13" cy="31" r="3.2" fill="#fff4e3" opacity=".9"/>
    <path d="M22 35h20l-2.2 17.4c-.3 2.2-1.9 3.6-4 3.6H28.2c-2.1 0-3.7-1.4-4-3.6Z" fill="#ffe9c9"/>
    <path d="M29 40c0 4.4-1.3 8.1-3.8 11.2" stroke="#e8bf8e" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,
  banana: `
    <path d="M50 13c2.9 0 5 2.2 5 5 0 9.6-5.7 18.7-14.9 24.1-6.4 3.8-14 5-21.4 3.3-4.3-1-7.2-3.2-7.2-7.1 0-3.2 2.2-5.3 5.2-5.3 1.9 0 3.6.8 5.5 1.2 6.4 1.4 13.4-.6 18.2-5.2C45.1 24.9 47 20.2 47 16c0-1.9 1.1-3 3-3Z" fill="#ffd93d"/>
    <path d="M53 14.9c1.3.2 2 1.4 2 3.1 0 10.5-6.4 20.1-16.3 25.7-6.1 3.4-13.2 4.6-20.1 3.2-3-.6-4.8-2.1-4.8-4.4 0-1.6.9-2.6 2.4-2.6.9 0 1.9.4 3 .7 7.5 2 15.5-.2 21-5.7 4.9-4.9 7.7-11.7 7.7-17.6 0-1.6 1.4-2.7 3-2.4Z" fill="#ffe680"/>
    <path d="M50.5 13.2c0 5-2.1 9.8-5.7 13.6M14.5 36.5c5.9 1.7 12.3.8 17.6-2.4" stroke="#e0a900" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
    <path d="M52 11.5c1.2 0 2 .8 2 2v2h-4v-2c0-1.2.8-2 2-2ZM8.5 36.5h8v5h-8z" fill="#8a5a2b"/>`,
  shell: `
    <path d="M32 10c13 0 23 8.6 23 21.5 0 8.3-4.6 15.2-11.8 19L38 54h-12l-5.2-3.5C13.6 46.7 9 39.8 9 31.5 9 18.6 19 10 32 10Z" fill="#2fc456"/>
    <path d="M32 13c10.8 0 19 6.8 19 17.3 0 6.8-3.7 12.6-9.5 16.1l-3.1 1.9h-12.8l-3.1-1.9C16.7 42.9 13 37.1 13 30.3 13 19.8 21.2 13 32 13Z" fill="#54e070"/>
    <path d="M32 14v34M14 30h36M18.5 19.5 45.5 41M45.5 19.5 18.5 41" stroke="#1d8e3b" stroke-width="2.1" opacity=".65"/>
    <path d="M20 12.8c3.8-1.6 7.8-2.4 12-2.4s8.2.8 12 2.4" stroke="#b6ffd0" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
    <path d="M13 46h38l-2.4 4.5c-1 1.9-2.9 3-5 3H20.4c-2.1 0-4-1.1-5-3Z" fill="#fff1cf"/>
    <path d="M17 49h30" stroke="#e3c89a" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="24" cy="21" rx="4.2" ry="2.4" fill="#b8ffd0" opacity=".55" transform="rotate(-28 24 21)"/>`,
  redshell: `
    <path d="M32 10c13 0 23 8.6 23 21.5 0 8.3-4.6 15.2-11.8 19L38 54H26l-5.2-3.5C13.6 46.7 9 39.8 9 31.5 9 18.6 19 10 32 10Z" fill="#e42d2d"/>
    <path d="M32 13c10.8 0 19 6.8 19 17.3 0 6.8-3.7 12.6-9.5 16.1l-3.1 1.9H25.6l-3.1-1.9C16.7 42.9 13 37.1 13 30.3 13 19.8 21.2 13 32 13Z" fill="#ff5252"/>
    <path d="M32 14v34M14 30h36M18.5 19.5 45.5 41M45.5 19.5 18.5 41" stroke="#a80f18" stroke-width="2.1" opacity=".6"/>
    <path d="M20 12.8c3.8-1.6 7.8-2.4 12-2.4s8.2.8 12 2.4" stroke="#ffb8b8" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
    <path d="M13 46h38l-2.4 4.5c-1 1.9-2.9 3-5 3H20.4c-2.1 0-4-1.1-5-3Z" fill="#fff1cf"/>
    <path d="M17 49h30" stroke="#e3c89a" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="24" cy="21" rx="4.2" ry="2.4" fill="#ffd0d0" opacity=".65" transform="rotate(-28 24 21)"/>`,
  star: `
    <path d="M32 6.5 39.6 24l19 2.1-14.2 12.8 4 18.7L32 48.4 15.6 57.6l4-18.7L5.4 26.1 24.4 24Z" fill="#ffd93d"/>
    <path d="M32 11.5 38 25l15 1.6-11.2 10.1 3.2 14.8L32 44.6l-13 7 3.2-15L11 26.6 26 25Z" fill="#fff07a"/>
    <path d="M32 6.5 39.6 24l19 2.1-14.2 12.8 4 18.7L32 48.4" fill="#ffcf1f" opacity=".65"/>
    <path d="M22.4 30.5c1.6-1.8 4.2-2 6-.5M35.6 30c1.8-1.5 4.4-1.3 6 .5" stroke="#8a6300" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <ellipse cx="26" cy="33.5" rx="2.2" ry="2.9" fill="#4a3300"/><ellipse cx="38" cy="33.5" rx="2.2" ry="2.9" fill="#4a3300"/>
    <circle cx="26.8" cy="32.4" r=".8" fill="#fff"/><circle cx="38.8" cy="32.4" r=".8" fill="#fff"/>
    <path d="M27 40c2.6 2.7 7.4 2.7 10 0" stroke="#8a6300" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <circle cx="19" cy="27" r="2" fill="#fff" opacity=".55"/><circle cx="45" cy="27" r="2" fill="#fff" opacity=".55"/>`,
  lightning: `
    <path d="M38.5 4 14 35.5c-1.1 1.5 0 3.5 1.8 3.5H29l-4.5 20c-.4 1.9 2 2.9 3.2 1.4L53 28.6c1.1-1.5 0-3.5-1.8-3.5H36l5.8-19.6c.5-1.9-2-3-3.3-1.5Z" fill="#7bd8ff"/>
    <path d="M38.5 4 14 35.5c-1.1 1.5 0 3.5 1.8 3.5H29l-4.5 20c-.4 1.9 2 2.9 3.2 1.4L53 28.6c1.1-1.5 0-3.5-1.8-3.5H36l5.8-19.6c.5-1.9-2-3-3.3-1.5Z" fill="none" stroke="#d8f6ff" stroke-width="1.8" stroke-linejoin="round" opacity=".8"/>
    <path d="M36 9 20 29h9l-3 13 16-20h-9Z" fill="#e8fbff" opacity=".65"/>
    <circle cx="17" cy="18" r="2.4" fill="#bdefff" opacity=".8"/><circle cx="48" cy="46" r="2" fill="#bdefff" opacity=".7"/>`,
};

export function itemIconMarkup(id, cls = '') {
  const art = ITEM_ART[id] || `
    <circle cx="32" cy="32" r="19" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)" stroke-width="2.5" stroke-dasharray="5 5"/>
    <path d="M26 32h12M32 26v12" stroke="rgba(255,255,255,.4)" stroke-width="2.5" stroke-linecap="round"/>`;
  return wrap(art, `item-svg ${cls}`);
}

export function flagIcon(cls = '') {
  return wrap(`
    <path d="M12 8v48" stroke="#f4f7ff" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M15 11h35l-7.5 11L50 33H15Z" fill="#ffcf3d"/>
    <path d="M15 11h12v7H15ZM27 18h12v7H27ZM39 11h11v7H39ZM15 25h12v8H15ZM27 32h12v1H27Z" fill="#1b1b26"/>
    <path d="M15 11h35l-7.5 11L50 33H15Z" fill="none" stroke="#fff6d0" stroke-width="1.6" opacity=".65"/>
  `, `flag-svg ${cls}`);
}

export function soundIcon(muted = false, cls = '') {
  return wrap(muted ? `
    <path d="M9 25h8l11-8v30l-11-8H9Z" fill="#e8f2ff"/>
    <path d="M34 26l13 12M47 26 34 38" stroke="#ff7a8a" stroke-width="4" stroke-linecap="round"/>
  ` : `
    <path d="M9 25h8l11-8v30l-11-8H9Z" fill="#e8f2ff"/>
    <path d="M34 24c4 4.5 4 11.5 0 16M40 19c7 7 7 19 0 26" stroke="#e8f2ff" stroke-width="3.6" stroke-linecap="round" fill="none"/>
  `, `sound-svg ${cls}`);
}

export function pauseIcon(cls = '') {
  return wrap(`
    <rect x="19" y="15" width="8.5" height="34" rx="3.2" fill="currentColor"/>
    <rect x="36.5" y="15" width="8.5" height="34" rx="3.2" fill="currentColor"/>
  `, `pause-svg ${cls}`);
}

export function starIcon(filled = true, cls = '') {
  return wrap(`
    <path d="M32 6.5 39.6 24l19 2.1-14.2 12.8 4 18.7L32 48.4 15.6 57.6l4-18.7L5.4 26.1 24.4 24Z"
      fill="${filled ? '#ffd23d' : 'rgba(255,255,255,.16)'}"
      stroke="${filled ? '#fff3b8' : 'rgba(255,255,255,.3)'}" stroke-width="2.4" stroke-linejoin="round"/>
  `, `star-svg ${filled ? 'filled' : 'dim'} ${cls}`);
}

export function coinIcon(cls = '') {
  return wrap(`
    <circle cx="32" cy="32" r="25" fill="#ffcf3d" stroke="#fff3ad" stroke-width="3"/>
    <circle cx="32" cy="32" r="18" fill="#ffe680"/>
    <path d="M32 19.5 35.6 27l8.3.9-6.2 5.6 1.8 8.2-7.5-4.2-7.5 4.2 1.8-8.2-6.2-5.6 8.3-.9Z" fill="#c98a00"/>
    <ellipse cx="23" cy="22" rx="6" ry="3.4" fill="#fff" opacity=".45" transform="rotate(-38 23 22)"/>
  `, `coin-svg ${cls}`);
}

export function arrowIcon(dir = 'left', cls = '') {
  const flip = dir === 'right' ? ' transform="rotate(180 32 32)"' : '';
  return wrap(`
    <g${flip}>
      <path d="M40 12 18 32l22 20" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `, `arrow-svg ${cls}`);
}
