// Hand-drawn SVG icons. Nothing is downloaded.
const svg = (body: string, vb = '0 0 64 64') =>
  `<svg viewBox="${vb}" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

export const icons = {
  key: svg(
    `<circle cx="22" cy="32" r="12" fill="currentColor"/><circle cx="22" cy="32" r="4.5" fill="var(--btn,#c62828)"/><rect x="31" y="28" width="26" height="8" rx="3" fill="currentColor"/><rect x="47" y="34" width="5" height="9" rx="2" fill="currentColor"/><rect x="39" y="34" width="5" height="7" rx="2" fill="currentColor"/>`,
  ),
  garage: svg(
    `<path d="M6 28 32 10l26 18v28H6z" fill="#e53935" stroke="#7f1d1d" stroke-width="3"/><rect x="14" y="32" width="36" height="24" rx="2" fill="#f4f4f0" stroke="#7f1d1d" stroke-width="3"/><path d="M14 40h36M14 48h36" stroke="#9aa0a6" stroke-width="3"/><circle cx="24" cy="21" r="2.6" fill="#fff"/><circle cx="32" cy="21" r="2.6" fill="#fff"/><circle cx="40" cy="21" r="2.6" fill="#fff"/>`,
  ),
  road: svg(
    `<path d="M22 58 28 6h8l6 52z" fill="#4a4d52"/><path d="M32 10v8M32 26v8M32 42v10" stroke="#fff" stroke-width="3"/><path d="M8 58c6-10 6-20 0-30M56 58c-6-10-6-20 0-30" stroke="#3fa34d" stroke-width="5"/><circle cx="50" cy="14" r="7" fill="#ffc61a"/>`,
  ),
  stamp: svg(
    `<rect x="10" y="12" width="44" height="40" rx="6" fill="#fff" stroke="#1e6fd9" stroke-width="3"/><circle cx="32" cy="30" r="11" fill="#1e6fd9"/><path d="m26 30 4 4 8-8" stroke="#fff" stroke-width="3.5"/><path d="M20 46h24" stroke="#1e6fd9" stroke-width="3"/>`,
  ),
  gear: svg(
    `<g fill="#f57c1f" stroke="#7a3a0a" stroke-width="2.5"><path d="M28 6h8l1.5 7a19 19 0 0 1 5 2.8l6.8-2.3 4 7-5.3 4.7a19 19 0 0 1 0 5.6l5.3 4.7-4 7-6.8-2.3a19 19 0 0 1-5 2.8L36 50h-8l-1.5-7a19 19 0 0 1-5-2.8l-6.8 2.3-4-7 5.3-4.7a19 19 0 0 1 0-5.6L10.7 20.5l4-7 6.8 2.3a19 19 0 0 1 5-2.8z" transform="translate(0 4)"/></g><circle cx="32" cy="32" r="7" fill="#fff" stroke="#7a3a0a" stroke-width="2.5"/>`,
  ),
  lock: svg(
    `<rect x="14" y="28" width="36" height="28" rx="5" fill="#1d1d1f"/><path d="M22 28v-8a10 10 0 0 1 20 0v8" stroke="#1d1d1f" stroke-width="6"/><circle cx="32" cy="41" r="4" fill="#ffc61a"/>`,
  ),
  horn: svg(
    `<path d="M8 26h10l20-12v36L18 38H8z" fill="#ffc61a" stroke="#7a5a00" stroke-width="3"/><path d="M46 22c4 3 4 17 0 20M52 16c8 6 8 26 0 32" stroke="#fff" stroke-width="4"/>`,
  ),
  camera: svg(
    `<rect x="6" y="18" width="52" height="36" rx="7" fill="currentColor"/><rect x="22" y="10" width="20" height="10" rx="3" fill="currentColor"/><circle cx="32" cy="36" r="11" fill="var(--btn,#1e6fd9)"/><circle cx="32" cy="36" r="6" fill="currentColor"/>`,
  ),
  nfc: svg(
    `<rect x="18" y="6" width="28" height="52" rx="6" fill="currentColor"/><rect x="22" y="12" width="20" height="36" rx="2" fill="var(--btn,#1e6fd9)"/><path d="M6 24c-3 5-3 11 0 16M12 28c-1.5 3-1.5 6 0 8M58 24c3 5 3 11 0 16M52 28c1.5 3 1.5 6 0 8" stroke="currentColor" stroke-width="3.5"/>`,
  ),
  cloud: svg(
    `<path d="M18 46h30a10 10 0 0 0 0-20 14 14 0 0 0-27-2 11 11 0 0 0-3 22z" fill="currentColor"/>`,
  ),
  wheel: svg(
    `<circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="7"/><circle cx="32" cy="32" r="6" fill="currentColor"/><path d="M32 38v18M26 30 10 26M38 30l16-4" stroke="currentColor" stroke-width="7"/>`,
  ),
}
