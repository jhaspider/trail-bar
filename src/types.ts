export type LinkStats = {
  url: string;
  title: string;
  visits: number;
  totalDwellMs: number;
  lastVisitedAt: number;
};

export type PortalStore = Record<string, Record<string, LinkStats>>;

export type ToggleBarMessage = { type: 'TOGGLE_BAR' };
export type ExtensionMessage = ToggleBarMessage;
