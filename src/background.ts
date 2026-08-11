import { normalizeUrl, portalFor } from './lib/portal';
import { getBarVisible, recordVisit, setBarVisible } from './lib/storage';

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
  for (const id of Array.from(activeVisits.keys())) await endVisit(id);
}

async function refreshVisit(tabId: number, nextUrl?: string): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !tab.url) return;
  const url = normalizeUrl(nextUrl ?? tab.url);
  const existing = activeVisits.get(tabId);
  if (existing && existing.url === url) {
    if (tab.title) existing.title = tab.title;
    return;
  }
  await endVisit(tabId);
  const portal = portalFor(url);
  if (!portal) return;
  activeVisits.set(tabId, {
    url,
    title: tab.title ?? '',
    portal,
    startedAt: Date.now(),
  });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  for (const otherId of Array.from(activeVisits.keys())) {
    if (otherId !== tabId) await endVisit(otherId);
  }
  await startVisit(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.url && tab.active) {
    await refreshVisit(tabId, info.url);
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

function onSpaNavigation(details: chrome.webNavigation.WebNavigationTransitionCallbackDetails): void {
  if (details.frameId !== 0) return;
  if (!activeVisits.has(details.tabId)) return;
  void refreshVisit(details.tabId, details.url);
}

chrome.webNavigation.onHistoryStateUpdated.addListener(onSpaNavigation);
chrome.webNavigation.onReferenceFragmentUpdated.addListener(onSpaNavigation);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-bar') return;
  const next = !(await getBarVisible());
  await setBarVisible(next);
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) => {
      if (tab.id === undefined) return Promise.resolve();
      return chrome.tabs
        .sendMessage(tab.id, { type: 'SET_BAR_VISIBLE', visible: next })
        .catch(() => {
          // Content script not loaded (e.g., chrome:// pages) — silently ignore.
        });
    }),
  );
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
