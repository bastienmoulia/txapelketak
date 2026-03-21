export const POULES_TAB_QUERY_PARAM = 'tab';

export const POULES_ROUTE_TABS = ['teams', 'poules', 'games', 'users', 'import-export'] as const;
export type PoulesRouteTab = (typeof POULES_ROUTE_TABS)[number];

export const DEFAULT_POULES_ROUTE_TAB: PoulesRouteTab = 'teams';

export function isPoulesRouteTab(value: string | null | undefined): value is PoulesRouteTab {
  return !!value && POULES_ROUTE_TABS.includes(value as PoulesRouteTab);
}

export function getPoulesRouteTab(value: string | null | undefined): PoulesRouteTab {
  return isPoulesRouteTab(value) ? value : DEFAULT_POULES_ROUTE_TAB;
}
