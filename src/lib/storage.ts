import type { LinkStats, PortalStore } from '../types';

const STORAGE_KEY = 'trail-bar:portals';
const VISIBLE_KEY = 'trail-bar:visible';
const MIN_DWELL_MS = 1500;

export async function getBarVisible(): Promise<boolean> {
  const res = await chrome.storage.local.get(VISIBLE_KEY);
  return Boolean(res[VISIBLE_KEY]);
}

export async function setBarVisible(visible: boolean): Promise<void> {
  await chrome.storage.local.set({ [VISIBLE_KEY]: visible });
}

export async function loadStore(): Promise<PortalStore> {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return (res[STORAGE_KEY] as PortalStore | undefined) ?? {};
}

export async function saveStore(store: PortalStore): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

export async function recordVisit(
  portal: string,
  url: string,
  title: string,
  dwellMs: number,
): Promise<void> {
  if (dwellMs < MIN_DWELL_MS) return;
  const store = await loadStore();
  const portalLinks = store[portal] ?? {};
  const existing: LinkStats = portalLinks[url] ?? {
    url,
    title,
    visits: 0,
    totalDwellMs: 0,
    lastVisitedAt: 0,
  };
  portalLinks[url] = {
    url,
    title: title || existing.title,
    visits: existing.visits + 1,
    totalDwellMs: existing.totalDwellMs + dwellMs,
    lastVisitedAt: Date.now(),
  };
  store[portal] = portalLinks;
  await saveStore(store);
}

export async function getPortalLinks(portal: string): Promise<Record<string, LinkStats>> {
  const store = await loadStore();
  return store[portal] ?? {};
}

export async function flushAllPortals(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export async function flushPortal(portal: string): Promise<void> {
  const store = await loadStore();
  if (!(portal in store)) return;
  delete store[portal];
  await saveStore(store);
}
