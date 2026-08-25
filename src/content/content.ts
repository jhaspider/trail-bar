import { portalFor } from '../lib/portal';
import { topLinks } from '../lib/ranking';
import {
  flushAllPortals,
  flushPortal,
  getBarVisible,
  getPortalLinks,
} from '../lib/storage';
import type { ExtensionMessage, LinkStats } from '../types';
import barStyles from './bar.css?inline';

const HOST_ID = 'trail-bar-host';
const BAR_ID = 'trail-bar-root';
const MENU_ID = 'trail-bar-menu';
const TOP_N = 5;
const BAR_HEIGHT_PX = 44;
const BODY_OFFSET_ATTR = 'data-trail-bar-body-offset';
const GEAR_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94a7.49 7.49 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.88 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.14.55-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.64 8.48a.5.5 0 0 0 .12.64L4.79 10.7a7.49 7.49 0 0 0 0 1.88L2.76 14.16a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.49.39 1.04.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.49-.42l.36-2.54c.59-.24 1.14-.55 1.63-.94l2.39.96c.23.09.5 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z"/></svg>';

let outsideClickHandler: ((e: MouseEvent) => void) | null = null;

const HOST_INLINE_STYLE: ReadonlyArray<readonly [string, string]> = [
  ['position', 'fixed'],
  ['top', '0'],
  ['left', '0'],
  ['right', '0'],
  ['width', '100%'],
  ['height', `${BAR_HEIGHT_PX}px`],
  ['min-height', `${BAR_HEIGHT_PX}px`],
  ['max-height', `${BAR_HEIGHT_PX}px`],
  ['margin', '0'],
  ['padding', '0'],
  ['transform', 'none'],
  ['display', 'block'],
  ['visibility', 'visible'],
  ['opacity', '1'],
  ['z-index', '2147483647'],
  ['pointer-events', 'auto'],
];

function ensureHost(): { host: HTMLElement; shadow: ShadowRoot } {
  let host = document.getElementById(HOST_ID) as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
  }
  // Inline !important styles beat any page selector short of a matching inline rule,
  // which the page can't inject onto our host.
  for (const [prop, value] of HOST_INLINE_STYLE) {
    host.style.setProperty(prop, value, 'important');
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  if (!shadow.querySelector('style[data-trail-bar]')) {
    const style = document.createElement('style');
    style.setAttribute('data-trail-bar', '');
    style.textContent = barStyles;
    shadow.appendChild(style);
  }
  return { host, shadow };
}

function ensureBar(): HTMLElement {
  const { shadow } = ensureHost();
  let bar = shadow.getElementById(BAR_ID) as HTMLElement | null;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = BAR_ID;
    shadow.appendChild(bar);
  }
  return bar;
}

function renderMark(): HTMLElement {
  const mark = document.createElement('span');
  mark.className = 'trail-bar-mark';
  mark.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i += 1) mark.appendChild(document.createElement('span'));
  return mark;
}

function renderInner(portal: string, links: LinkStats[]): HTMLElement {
  const inner = document.createElement('div');
  inner.className = 'trail-bar-inner';

  const brand = document.createElement('div');
  brand.className = 'trail-bar-brand';
  brand.title = 'Trailbar';
  brand.setAttribute('aria-label', 'Trailbar');
  brand.appendChild(renderMark());
  inner.appendChild(brand);

  const portalEl = document.createElement('span');
  portalEl.className = 'trail-bar-portal';
  portalEl.textContent = portal;
  inner.appendChild(portalEl);

  const linksEl = document.createElement('div');
  linksEl.className = 'trail-bar-links';
  if (links.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'trail-bar-empty';
    empty.textContent = 'No visits yet — keep browsing.';
    linksEl.appendChild(empty);
  } else {
    for (const link of links) {
      const a = document.createElement('a');
      a.href = link.url;
      a.className = 'trail-bar-link';
      a.textContent = link.title || link.url;
      a.title = `${link.title}\n${link.url}`;
      linksEl.appendChild(a);
    }
  }
  inner.appendChild(linksEl);

  inner.appendChild(renderGear(portal));

  return inner;
}

function renderGear(portal: string): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'trail-bar-gear';
  btn.setAttribute('aria-label', 'Trail Bar settings');
  btn.innerHTML = GEAR_SVG;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(btn, portal);
  });
  return btn;
}

async function render(): Promise<void> {
  closeMenu();
  const bar = ensureBar();
  bar.replaceChildren();
  const portal = portalFor(window.location.href);
  if (!portal) {
    bar.appendChild(renderInner('—', []));
    return;
  }
  const links = await getPortalLinks(portal);
  bar.appendChild(renderInner(portal, topLinks(links, TOP_N)));
}

function ensureMenu(): HTMLElement {
  const { shadow } = ensureHost();
  let menu = shadow.getElementById(MENU_ID) as HTMLElement | null;
  if (!menu) {
    menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.hidden = true;
    shadow.appendChild(menu);
  }
  return menu;
}

function renderMenuItems(portal: string | null): HTMLElement {
  const menu = ensureMenu();
  menu.replaceChildren();

  const flushAllBtn = document.createElement('button');
  flushAllBtn.type = 'button';
  flushAllBtn.className = 'trail-bar-menu-item';
  flushAllBtn.textContent = 'Flush all links';
  flushAllBtn.addEventListener('click', async () => {
    await flushAllPortals();
    closeMenu();
    await render();
  });
  menu.appendChild(flushAllBtn);

  if (portal) {
    const flushPortalBtn = document.createElement('button');
    flushPortalBtn.type = 'button';
    flushPortalBtn.className = 'trail-bar-menu-item';
    flushPortalBtn.textContent = `Flush links for ${portal}`;
    flushPortalBtn.addEventListener('click', async () => {
      await flushPortal(portal);
      closeMenu();
      await render();
    });
    menu.appendChild(flushPortalBtn);
  }

  const devLink = document.createElement('a');
  devLink.className = 'trail-bar-menu-item';
  devLink.href = 'https://github.com/jhaspider/trail-bar';
  devLink.target = '_blank';
  devLink.rel = 'noopener noreferrer';
  devLink.textContent = 'Developer';
  devLink.addEventListener('click', () => closeMenu());
  menu.appendChild(devLink);

  return menu;
}

function positionMenu(gearBtn: HTMLElement): void {
  const menu = ensureMenu();
  const rect = gearBtn.getBoundingClientRect();
  const menuWidth = menu.offsetWidth || 240;
  const left = Math.max(4, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 4));
  menu.style.top = `${rect.bottom + 2}px`;
  menu.style.left = `${left}px`;
}

function openMenu(gearBtn: HTMLElement, portal: string): void {
  const menu = renderMenuItems(portal || null);
  menu.hidden = false;
  positionMenu(gearBtn);

  outsideClickHandler = (e) => {
    // Clicks inside a shadow root retarget e.target to the host, so use composedPath.
    const path = e.composedPath();
    if (path.includes(menu)) return;
    if (path.includes(gearBtn)) return;
    closeMenu();
  };
  setTimeout(() => {
    if (outsideClickHandler) document.addEventListener('click', outsideClickHandler, true);
  }, 0);
}

function closeMenu(): void {
  const host = document.getElementById(HOST_ID);
  const menu = host?.shadowRoot?.getElementById(MENU_ID);
  if (menu) menu.hidden = true;
  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler, true);
    outsideClickHandler = null;
  }
}

function toggleMenu(gearBtn: HTMLElement, portal: string): void {
  const host = document.getElementById(HOST_ID);
  const menu = host?.shadowRoot?.getElementById(MENU_ID);
  if (menu && !menu.hidden) {
    closeMenu();
    return;
  }
  openMenu(gearBtn, portal);
}

function applyBodyOffset(): void {
  const body = document.body;
  if (!body) return;
  if (body.hasAttribute(BODY_OFFSET_ATTR)) return;
  const current = getComputedStyle(body).marginTop;
  const currentPx = parseFloat(current) || 0;
  body.setAttribute(BODY_OFFSET_ATTR, body.style.marginTop);
  body.style.marginTop = `${currentPx + BAR_HEIGHT_PX}px`;
}

function restoreBodyOffset(): void {
  const body = document.body;
  if (!body || !body.hasAttribute(BODY_OFFSET_ATTR)) return;
  const original = body.getAttribute(BODY_OFFSET_ATTR) ?? '';
  body.style.marginTop = original;
  body.removeAttribute(BODY_OFFSET_ATTR);
}

function shiftFixedSiblings(): void {
  const body = document.body;
  if (!body) return;
  for (const child of Array.from(body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.id === HOST_ID) continue;
    if (child.dataset.trailBarShifted === '1') continue;
    const cs = getComputedStyle(child);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    const topPx = parseFloat(cs.top);
    if (!Number.isFinite(topPx) || topPx > 5) continue;
    child.dataset.trailBarOriginalTop = child.style.top;
    child.dataset.trailBarShifted = '1';
    child.style.top = `${topPx + BAR_HEIGHT_PX}px`;
  }
}

function restoreFixedSiblings(): void {
  const body = document.body;
  if (!body) return;
  for (const child of Array.from(body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.trailBarShifted !== '1') continue;
    child.style.top = child.dataset.trailBarOriginalTop ?? '';
    delete child.dataset.trailBarShifted;
    delete child.dataset.trailBarOriginalTop;
  }
}

async function show(): Promise<void> {
  await render();
  applyBodyOffset();
  shiftFixedSiblings();
}

function hide(): void {
  closeMenu();
  restoreFixedSiblings();
  restoreBodyOffset();
  const host = document.getElementById(HOST_ID);
  if (host) host.remove();
}

async function applyVisibility(visible: boolean): Promise<void> {
  if (visible) await show();
  else hide();
}

chrome.runtime.onMessage.addListener((msg: ExtensionMessage) => {
  if (msg?.type === 'SET_BAR_VISIBLE') void applyVisibility(msg.visible);
});

void (async () => {
  if (await getBarVisible()) await show();
})();
