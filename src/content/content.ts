import { portalFor } from '../lib/portal';
import { topLinks } from '../lib/ranking';
import { getPortalLinks } from '../lib/storage';
import type { ExtensionMessage, LinkStats } from '../types';

const BAR_ID = 'trail-bar-root';
const TOP_N = 5;

let visible = false;

function ensureBar(): HTMLElement {
  const existing = document.getElementById(BAR_ID);
  if (existing) return existing;
  const bar = document.createElement('div');
  bar.id = BAR_ID;
  document.documentElement.appendChild(bar);
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
    return inner;
  }

  for (const link of links) {
    const a = document.createElement('a');
    a.href = link.url;
    a.className = 'trail-bar-link';
    a.textContent = link.title || link.url;
    a.title = `${link.title}\n${link.url}`;
    inner.appendChild(a);
  }
  return inner;
}

async function render(): Promise<void> {
  const portal = portalFor(window.location.href);
  const bar = ensureBar();
  bar.replaceChildren();
  if (!portal) {
    bar.appendChild(renderInner('—', []));
    return;
  }
  const links = await getPortalLinks(portal);
  bar.appendChild(renderInner(portal, topLinks(links, TOP_N)));
}

function show(): void {
  const bar = ensureBar();
  bar.classList.add('trail-bar-visible');
  visible = true;
}

function hide(): void {
  const bar = document.getElementById(BAR_ID);
  if (bar) bar.classList.remove('trail-bar-visible');
  visible = false;
}

async function toggle(): Promise<void> {
  if (visible) {
    hide();
    return;
  }
  await render();
  show();
}

chrome.runtime.onMessage.addListener((msg: ExtensionMessage) => {
  if (msg?.type === 'TOGGLE_BAR') void toggle();
});
