import { normalizeUrl, portalFor } from './lib/portal';
import { recordVisit } from './lib/storage';

type ActiveVisit = {
  url: string;
  title: string;
  portal: string;
  startedAt: number;
};

const activeVisits = new Map<number, ActiveVisit>();

async function startVisit(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !tab.url) return;
  const portal = portalFor(tab.url);
  if (!portal) return;
  activeVisits.set(tabId, {
    url: normalizeUrl(tab.url),
    title: tab.title ?? '',
    portal,
    startedAt: Date.now(),
  });
}

async function endVisit(tabId: number): Promise<void> {
  const visit = activeVisits.get(tabId);
  if (!visit) return;
  activeVisits.delete(tabId);
  const dwellMs = Math.max(0, Date.now() - visit.startedAt);
  await recordVisit(visit.portal, visit.url, visit.title, dwellMs);
}

async function endAllVisits(): Promise<void> {
  const ids = Array.from(activeVisits.keys());
  for (const id of ids) await endVisit(id);
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  for (const otherId of Array.from(activeVisits.keys())) {
    if (otherId !== tabId) await endVisit(otherId);
  }
  await startVisit(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.url && tab.active) {
    await endVisit(tabId);
    await startVisit(tabId);
    return;
  }
  if (info.title) {
    const visit = activeVisits.get(tabId);
    if (visit) visit.title = info.title;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await endVisit(tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await endAllVisits();
    return;
  }
  const [activeTab] = await chrome.tabs.query({ active: true, windowId });
  if (activeTab?.id !== undefined) await startVisit(activeTab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-bar') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_BAR' }).catch(() => {
    // Content script not loaded (e.g., chrome:// pages) — silently ignore.
  });
});

async function init(): Promise<void> {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const w of windows) {
    if (!w.focused) continue;
    for (const tab of w.tabs ?? []) {
      if (tab.active && tab.id !== undefined) await startVisit(tab.id);
    }
  }
}

void init();
