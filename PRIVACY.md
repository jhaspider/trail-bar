# Privacy Policy for Trail Bar

**Effective date:** 12 August 2026

Trail Bar is a browser extension that helps you re-find pages you visit often, by ranking them per website and displaying them in a toggleable top bar. This policy explains exactly what data the extension handles.

## Summary

- All data is stored **locally on your device**, in the browser's own storage.
- **No data is transmitted** to the developer, to any server, or to any third party.
- **No analytics, no telemetry, no tracking, no cookies.**
- You can wipe all data at any time from the extension's settings menu, or by uninstalling.

## What data is collected

While the extension is installed and running, it records the following for each web page you actively view:

- **Page URL** — the full URL of the page you visit.
- **Page title** — the `<title>` of the page.
- **Visit count** — how many times you have visited that URL.
- **Dwell time** — the total time (in milliseconds) that the tab was active and focused on that URL.
- **Last-visited timestamp** — the epoch-milliseconds time of your most recent visit.

Data is grouped per site (by the site's registrable domain, e.g. `github.com`) and is used solely to rank your most-visited links on that site.

Visits shorter than 1.5 seconds are discarded and never recorded, so incidental page loads do not pollute the data.

## Where the data is stored

Data is stored via the [`chrome.storage.local`](https://developer.chrome.com/docs/extensions/reference/api/storage#property-local) API. This is a local storage area maintained by your browser on your device. It:

- Is **not** synchronised across your devices (unlike `chrome.storage.sync`).
- Is **not** accessible to websites you visit.
- Is **not** accessible to the developer or to any third party.
- Is removed automatically when you uninstall the extension.

## What data is *not* collected

- No personal information (name, address, email, phone number).
- No authentication tokens, cookies, or credentials.
- No form input, keystrokes, or page content beyond the page's URL and title.
- No location data.
- No third-party analytics or advertising identifiers.
- No data from Incognito or private-window sessions beyond what the browser itself exposes to any extension.

## Data sharing

Trail Bar does not share, sell, transfer, or transmit your data. There is no server component. The extension makes no outbound network requests of any kind.

## User controls

The gear-icon menu inside the bar provides:

- **Flush all links** — permanently deletes all tracked data for every site.
- **Flush links for `<site>`** — permanently deletes tracked data for the current site only.

You can also uninstall the extension at any time; doing so removes all associated storage.

## Permissions and why they are used

- `storage` — to save and read tracked-link data on your device.
- `tabs` — to identify the active tab so dwell time is attributed correctly and the visibility hotkey targets it.
- `webNavigation` — to detect in-page route changes on single-page applications (e.g. Azure Portal, Gmail) so each route is tracked as a distinct URL.
- Host permission `<all_urls>` — required so the bar can be displayed, and visits recorded, on any site you choose to use.

## Children's privacy

Trail Bar does not knowingly collect data from children under 13 and is not directed at them.

## Changes to this policy

If material changes are made to how data is handled, this file will be updated with a new effective date. The current version is always available at <https://github.com/jhaspider/trail-bar/blob/main/PRIVACY.md>.

## Contact

Questions, concerns, or reports: open an issue at <https://github.com/jhaspider/trail-bar/issues>, or email **jha.amarjit@gmail.com**.
