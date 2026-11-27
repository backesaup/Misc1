import { icons } from './icons'

export const app = document.getElementById('app')!

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string> = {},
  html = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) el.setAttribute(k, v)
  el.innerHTML = html
  return el
}

export function show(el: HTMLElement): void {
  app.replaceChildren(el)
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Our own toy driver: blocky body, round head, big printed face (step 3 makes it editable). */
export const figureSvg = `<svg class="figure" viewBox="0 0 80 100" aria-hidden="true">
  <rect x="14" y="62" width="52" height="40" rx="8" fill="#1e6fd9"/>
  <rect x="30" y="62" width="20" height="12" fill="#fff"/>
  <rect x="34" y="52" width="12" height="12" fill="#e0a37a"/>
  <circle cx="40" cy="34" r="24" fill="#e8b48a"/>
  <path d="M16 30a24 22 0 0 1 48 0c-6-8-14-10-24-10s-18 2-24 10z" fill="#2b1a10"/>
  <ellipse cx="31" cy="36" rx="3.6" ry="4.6" fill="#1d1d1f"/><ellipse cx="49" cy="36" rx="3.6" ry="4.6" fill="#1d1d1f"/>
  <circle cx="32.2" cy="34.4" r="1.3" fill="#fff"/><circle cx="50.2" cy="34.4" r="1.3" fill="#fff"/>
  <path d="M29 45q11 10 22 0" stroke="#7a2e1a" stroke-width="3.2" fill="#fff" stroke-linecap="round"/>
</svg>`

export function licenceCard(name: string): HTMLElement {
  return h(
    'div',
    { class: 'licence' },
    `<div class="brand"><span class="ic">${icons.wheel}</span>LICENCE TO DRIVE</div>
     <div class="portrait">${figureSvg}</div>
     <div class="fields">
       <div><div class="label">DRIVER</div><div class="name">${esc(name)}</div></div>
       <div class="level"><i></i>Learner</div>
     </div>
     <div class="studs">${'<b></b>'.repeat(8)}</div>
     <div class="scanline"></div>
     <div class="stamp">VERIFIED ✓</div>`,
  )
}

export function toast(iconSvg: string, text: string, ms = 2500): void {
  const t = h('div', { class: 'toast', role: 'status' }, `<span class="ic">${iconSvg}</span>${esc(text)}`)
  app.append(t)
  setTimeout(() => t.remove(), ms)
}
