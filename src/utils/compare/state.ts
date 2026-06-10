import type {
  AriaSortValue,
  FormatSortStateOptions,
  SortControlSummary,
  SortControlSummaryOptions,
  SortControlsReport,
  SortControlsSummary,
  SortDirection,
  SortState,
  SortStateSummary,
  ToggleSortStateOptions,
} from "./types";

export function normalizeSortDirection(direction: unknown, fallback: SortDirection = "asc"): SortDirection {
  return direction === "desc" ? "desc" : fallback;
}

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function getSortDirectionFactor(direction: SortDirection = "asc"): 1 | -1 {
  return direction === "asc" ? 1 : -1;
}

export function reverseSortDirection(direction: SortDirection = "asc"): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function toggleSortDirection(direction: unknown, fallback: SortDirection = "asc"): SortDirection {
  return reverseSortDirection(normalizeSortDirection(direction, fallback));
}

export function createSortState<K extends PropertyKey>(key: K, direction: unknown = "asc"): SortState<K> {
  return {
    key,
    direction: normalizeSortDirection(direction),
  };
}

export function toggleSortState<K extends PropertyKey>(
  current: SortState<K> | null | undefined,
  key: K,
  options: ToggleSortStateOptions = {}
): SortState<K> {
  if (!current || current.key !== key) {
    return createSortState(key, options.defaultDirection ?? "asc");
  }

  return createSortState(key, toggleSortDirection(current.direction, options.resetDirection ?? "asc"));
}

export function isSortStateActive<K extends PropertyKey>(state: SortState<K> | null | undefined, key: K): boolean {
  return Boolean(state && state.key === key);
}

export function getAriaSortValue(direction: SortDirection | null | undefined, active = true): AriaSortValue {
  if (!active || !direction) {
    return "none";
  }

  return direction === "asc" ? "ascending" : "descending";
}

export function getSortStateAriaSort<K extends PropertyKey>(state: SortState<K> | null | undefined, key: K): AriaSortValue {
  return getAriaSortValue(state?.direction, isSortStateActive(state, key));
}

export function formatSortState<K extends PropertyKey>(
  state: SortState<K> | null | undefined,
  options: FormatSortStateOptions<K> = {}
): string {
  if (!state) {
    return options.fallback ?? "";
  }

  const keyText = options.formatKey?.(state.key) ?? String(state.key);
  const directionText = state.direction === "asc" ? options.ascText ?? "asc" : options.descText ?? "desc";
  return [keyText, directionText].filter(Boolean).join(options.separator ?? " ");
}

export function summarizeSortState<K extends PropertyKey>(
  state: SortState<K> | null | undefined,
  options: FormatSortStateOptions<K> = {}
): SortStateSummary<K> {
  return {
    active: Boolean(state),
    key: state?.key ?? null,
    direction: state?.direction ?? null,
    label: formatSortState(state, options),
  };
}

export function getNextSortState<K extends PropertyKey>(
  current: SortState<K> | null | undefined,
  key: K,
  options: SortControlSummaryOptions<K> = {}
): SortState<K> | null {
  if (options.clearOnDesc && current?.key === key && current.direction === "desc") {
    return null;
  }

  return toggleSortState(current, key, options);
}

export function summarizeSortControl<K extends PropertyKey>(
  current: SortState<K> | null | undefined,
  key: K,
  options: SortControlSummaryOptions<K> = {}
): SortControlSummary<K> {
  const active = isSortStateActive(current, key);
  const activeState = active ? current ?? null : null;
  const nextState = getNextSortState(current, key, options);

  return {
    key,
    active,
    direction: activeState?.direction ?? null,
    ariaSort: getAriaSortValue(activeState?.direction, active),
    label: formatSortState(activeState, options),
    nextDirection: nextState?.direction ?? null,
    nextState,
    nextLabel: formatSortState(nextState, options),
    clearable: Boolean(options.clearOnDesc),
  };
}

export function summarizeSortControls<K extends PropertyKey>(
  current: SortState<K> | null | undefined,
  keys: readonly K[],
  options: SortControlSummaryOptions<K> = {}
): SortControlsSummary<K> {
  const activeIndex = current ? keys.findIndex((key) => key === current.key) : -1;
  const hasActive = activeIndex >= 0;

  return {
    keyCount: keys.length,
    activeKey: hasActive ? current?.key ?? null : null,
    activeDirection: hasActive ? current?.direction ?? null : null,
    activeIndex,
    hasActive,
    clearable: Boolean(options.clearOnDesc),
  };
}

export function createSortControlsReport<K extends PropertyKey>(
  current: SortState<K> | null | undefined,
  keys: readonly K[],
  options: SortControlSummaryOptions<K> = {}
): SortControlsReport<K> {
  const state = current && keys.includes(current.key) ? current : null;
  const controls = keys.map((key) => summarizeSortControl(state, key, options));

  return {
    state,
    controls,
    controlMap: new Map(controls.map((control) => [control.key, control])),
    ariaSortByKey: new Map(controls.map((control) => [control.key, control.ariaSort])),
    nextStateByKey: new Map(controls.map((control) => [control.key, control.nextState])),
    summary: summarizeSortControls(state, keys, options),
  };
}
