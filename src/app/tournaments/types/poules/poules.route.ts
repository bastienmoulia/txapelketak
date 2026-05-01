export const POULES_ROUTE_TABS = [
  'dashboard',
  'teams',
  'poules',
  'games',
  'finale',
  'administration',
] as const;
export type PoulesRouteTab = (typeof POULES_ROUTE_TABS)[number];

export function isPoulesRouteTab(value: string | null | undefined): value is PoulesRouteTab {
  return !!value && POULES_ROUTE_TABS.includes(value as PoulesRouteTab);
}

export function getPoulesRouteTab(value: string | null | undefined): PoulesRouteTab {
  return isPoulesRouteTab(value) ? value : POULES_ROUTE_TABS[0];
}
