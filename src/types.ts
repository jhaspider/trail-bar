export type LinkStats = {
  url: string;
  title: string;
  visits: number;
  totalDwellMs: number;
  lastVisitedAt: number;
};

export type PortalStore = Record<string, Record<string, LinkStats>>;

export type SetBarVisibleMessage = { type: 'SET_BAR_VISIBLE'; visible: boolean };
export type ExtensionMessage = SetBarVisibleMessage;
