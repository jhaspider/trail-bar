import { portalFor } from '../lib/portal';
import { topLinks } from '../lib/ranking';
import { getBarVisible, getPortalLinks } from '../lib/storage';
import type { ExtensionMessage, LinkStats } from '../types';

const BAR_ID = 'trail-bar-root';
const TOP_N = 5;
const BAR_HEIGHT_PX = 32;

function ensureBar(): HTMLElement {
  const existing = document.getElementById(BAR_ID);
  if (existing) return existing;
  const bar = document.createElement('div');
  bar.id = BAR_ID;
  const parent = document.body ?? document.documentElement;
  parent.insertBefore(bar, parent.firstChild);
  return bar;
}

function renderInner(portal: string, links: LinkStats[]): HTMLElement {
  const inner = document.createElement('div');
  inner.className = 'trail-bar-inner';

  const label = document.createElement('span');
  label.className = 'trail-bar-label';
  label.textContent = portal;
  inner.appendChild(label);

  if (links.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'trail-bar-empty';
    empty.textContent = 'No visits yet — keep browsing.';
    inner.appendChild(empty);
  } else {
    for (const link of links) {
      const a = document.createElement('a');
      a.href = link.url;
      a.className = 'trail-bar-link';
      a.textContent = link.title || link.url;
      a.title = `${link.title}\n${link.url}`;
      inner.appendChild(a);
    }
  }

  inner.appendChild(renderCredit());
  return inner;
}

function renderCredit(): HTMLElement {
  const credit = document.createElement('span');
  credit.className = 'trail-bar-credit';
  credit.appendChild(document.createTextNode('Developer: '));
  const a = document.createElement('a');
  a.href = 'http://amarjit.me';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'trail-bar-credit-link';
  a.textContent = 'Amarjit';
  credit.appendChild(a);
  return credit;
}

async function render(): Promise<void> {
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

function shiftFixedSiblings(): void {
  const body = document.body;
  if (!body) return;
  const bar = document.getElementById(BAR_ID);
  for (const child of Array.from(body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child === bar) continue;
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
  ensureBar().classList.add('trail-bar-visible');
  shiftFixedSiblings();
}

function hide(): void {
  restoreFixedSiblings();
  const bar = document.getElementById(BAR_ID);
  if (bar) bar.remove();
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
