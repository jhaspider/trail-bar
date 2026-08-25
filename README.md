# Trail Bar

![Trail Bar promo](https://stramarjitme.blob.core.windows.net/images/processed/trailbar-promo-marquee-1400x560.webp)

A minimal Chrome extension that surfaces your most-visited links per site in a thin, toggleable bar at the top of the page.

Data stays on your device. No accounts, no servers, no analytics.

## Creator
[Amarjit Jha](https://amarjit.xyz)

## Features

- **Per-site top links** — rankings are scoped to each site's apex domain (e.g. `github.com`, `portal.azure.com`).
- **Dwell-weighted ranking** — `visits × log(1 + avgDwellSeconds)`, so pages you actually read outrank drive-by clicks.
- **Hotkey toggle** — `Ctrl+Shift+K` (`⌘+Shift+K` on macOS). Once on, the bar persists across page loads, navigations, and tabs until you toggle off.
- **SPA-aware tracking** — detects in-page navigation on single-page apps (Azure Portal, Gmail, Notion, etc.) so each route counts as a distinct URL.
- **Inline, non-overlapping** — the bar renders inline at the top of the page and shifts fixed-positioned portal containers down so nothing is covered.
- **One-click data controls** — a gear-icon menu lets you wipe all data, or just data for the current site.
- **Local-only storage** — everything lives in `chrome.storage.local`; nothing leaves the device.

## Installation

### From the Chrome Web Store

[Install Trail Bar from the Chrome Web Store](https://chromewebstore.google.com/detail/poijehbdkcineacjbnbecmmabkakilac?utm_source=item-share-cb)

### From source

Requires Node.js 20 or later.

```bash
git clone https://github.com/jhaspider/trail-bar.git
cd trail-bar
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` directory.

## Usage

- Press **`Ctrl+Shift+K`** (**`⌘+Shift+K`** on macOS) to show or hide the bar.
- Once shown, the bar stays visible across page reloads, navigations, and new tabs until you press the hotkey again.
- Click the gear icon on the left of the bar for:
  - **Flush all links** — clears all tracked data.
  - **Flush links for `<site>`** — clears data for the current site only.
  - **Developer** — link to this repo.

The hotkey can be rebound at `chrome://extensions/shortcuts`.

## How it works

### Ranking

For each URL visited within a site, the extension keeps:

- `visits` — the number of distinct visits.
- `totalDwellMs` — total time (ms) the tab was active and focused on that URL.
- `title`, `lastVisitedAt`.

The score used to rank links is:

```
score = visits × log(1 + averageDwellSeconds)
```

The top five links by score are shown. Visits shorter than 1.5 seconds are discarded so passing loads do not pollute the ranking.

### Visit tracking

The MV3 service worker tracks a single active visit per active tab per focused window. A visit opens when a tab becomes active with a valid URL, and closes when:

- the tab loses focus (another tab or window is activated),
- the URL changes (either via a full navigation or an SPA route change),
- the tab is closed, or
- the browser window loses focus.

On close, the accumulated dwell time is written to storage.

SPA navigations are detected via `chrome.webNavigation.onHistoryStateUpdated` and `onReferenceFragmentUpdated`, so hash-router apps (Azure Portal) and pushState apps (Gmail, Notion) are both handled correctly.

### Site grouping

Sites are grouped by their registrable domain (eTLD+1) via [`tldts`](https://github.com/remusao/tldts). This means `foo.github.com` and `github.com` share one ranking bucket.

### Storage shape

All data lives under a single key (`trail-bar:portals`) in `chrome.storage.local`:

```ts
{
  [portal: string]: {
    [url: string]: {
      url: string;
      title: string;
      visits: number;
      totalDwellMs: number;
      lastVisitedAt: number;
    };
  };
}
```

A separate key (`trail-bar:visible`) holds the persistent visibility flag for the bar.

## Privacy

See [PRIVACY.md](./PRIVACY.md). Short version: all data stays local, nothing is transmitted, no analytics, no third parties.

## Development

```bash
npm install
npm run build        # production build → dist/
npm run dev          # Vite dev server with HMR
npm run typecheck    # tsc --noEmit
```

### Project structure

```
src/
├── manifest.json        # MV3 manifest
├── background.ts        # service worker: visit + dwell tracking,hotkey
└── types.ts             # shared types
├── content/
│   ├── content.ts       # bar + settings menu injected into the page
│   └── bar.css
├── icons/
|   ├── icon-16.png
|   ├── icon-32.png
|   ├── icon-48.png
|   └── icon-128.png
├── lib/
│   ├── portal.ts        # eTLD+1 extraction, URL normalisation
│   ├── ranking.ts       # scoring + top-N selection
│   └── storage.ts       # chrome.storage.local wrapper

```

### Tech stack

- **TypeScript** (strict mode) throughout.
- **Vite** + [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) for the extension build.
- **Manifest V3** service worker + content script.
- **No runtime dependencies** in the extension bundle beyond `tldts` for domain parsing.

## Roadmap ideas

- Configurable link count (currently fixed at five).
- Per-site enable/disable list.
- Time-decayed scoring so older visits fade.
- Import / export of the visit database.
- Firefox port.

## Contributing

Issues and pull requests are welcome. For substantive changes, please open an issue first to discuss direction. Please keep the extension:

- **Local-only** — no network requests, no telemetry.
- **Minimum-permission** — never widen permissions without a clear user-visible reason.
- **Framework-free in the injected content script** — a single `.ts` file keeps the injected payload tiny.

Before opening a PR:

```bash
npm run typecheck
npm run build
```

## License

Licensed under the MIT License.
