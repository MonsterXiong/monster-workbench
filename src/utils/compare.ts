export type SortDirection = "asc" | "desc";
export type ComparableValue = string | number | boolean | Date | null | undefined;
export type NullSortPosition = "auto" | "first" | "last";
export type AriaSortValue = "none" | "ascending" | "descending" | "other";

export interface SortRule<T> {
  getValue: (item: T) => ComparableValue;
  direction?: SortDirection;
  nulls?: NullSortPosition;
}

export interface CompareValueOptions {
  direction?: SortDirection;
  nulls?: NullSortPosition;
}

export interface SortState<K extends PropertyKey = string> {
  key: K;
  direction: SortDirection;
}

export interface SortStateSummary<K extends PropertyKey = string> {
  active: boolean;
  key: K | null;
  direction: SortDirection | null;
  label: string;
}

export interface ToggleSortStateOptions {
  defaultDirection?: SortDirection;
  resetDirection?: SortDirection;
}

export interface FormatSortStateOptions<K extends PropertyKey = string> {
  fallback?: string;
  separator?: string;
  ascText?: string;
  descText?: string;
  formatKey?: (key: K) => string;
}

export interface SortControlSummaryOptions<K extends PropertyKey = string> extends FormatSortStateOptions<K>, ToggleSortStateOptions {
  clearOnDesc?: boolean;
}

export interface SortControlSummary<K extends PropertyKey = string> {
  key: K;
  active: boolean;
  direction: SortDirection | null;
  ariaSort: AriaSortValue;
  label: string;
  nextDirection: SortDirection | null;
  nextState: SortState<K> | null;
  nextLabel: string;
  clearable: boolean;
}

export interface SortControlsSummary<K extends PropertyKey = string> {
  keyCount: number;
  activeKey: K | null;
  activeDirection: SortDirection | null;
  activeIndex: number;
  hasActive: boolean;
  clearable: boolean;
}

export interface SortControlsReport<K extends PropertyKey = string> {
  state: SortState<K> | null;
  controls: Array<SortControlSummary<K>>;
  controlMap: Map<K, SortControlSummary<K>>;
  ariaSortByKey: Map<K, AriaSortValue>;
  nextStateByKey: Map<K, SortState<K> | null>;
  summary: SortControlsSummary<K>;
}

export interface SortRulesSummary {
  totalCount: number;
  ascCount: number;
  descCount: number;
  autoNullCount: number;
  firstNullCount: number;
  lastNullCount: number;
  active: boolean;
}

const collator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

function normalizeComparableValue(value: ComparableValue): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return value;
}

export function normalizeSortDirection(direction: unknown, fallback: SortDirection = "asc"): SortDirection {
  return direction === "desc" ? "desc" : fallback;
}

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function normalizeNullSortPosition(value: unknown, fallback: NullSortPosition = "auto"): NullSortPosition {
  return value === "first" || value === "last" || value === "auto" ? value : fallback;
}

export function isNullSortPosition(value: unknown): value is NullSortPosition {
  return value === "first" || value === "last" || value === "auto";
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

export function createSortState<K extends PropertyKey>(
  key: K,
  direction: unknown = "asc"
): SortState<K> {
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

export function isSortStateActive<K extends PropertyKey>(
  state: SortState<K> | null | undefined,
  key: K
): boolean {
  return Boolean(state && state.key === key);
}

export function getAriaSortValue(direction: SortDirection | null | undefined, active = true): AriaSortValue {
  if (!active || !direction) {
    return "none";
  }

  return direction === "asc" ? "ascending" : "descending";
}

export function getSortStateAriaSort<K extends PropertyKey>(
  state: SortState<K> | null | undefined,
  key: K
): AriaSortValue {
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

export function createSortRule<T, K extends PropertyKey>(
  key: K,
  getValue: (item: T) => ComparableValue,
  direction: unknown = "asc",
  nulls: unknown = "auto"
): SortRule<T> & { key: K } {
  return {
    key,
    getValue,
    direction: normalizeSortDirection(direction),
    nulls: normalizeNullSortPosition(nulls),
  };
}

export function summarizeSortRules<T>(rules: readonly SortRule<T>[]): SortRulesSummary {
  return {
    totalCount: rules.length,
    ascCount: rules.filter((rule) => normalizeSortDirection(rule.direction) === "asc").length,
    descCount: rules.filter((rule) => normalizeSortDirection(rule.direction) === "desc").length,
    autoNullCount: rules.filter((rule) => normalizeNullSortPosition(rule.nulls) === "auto").length,
    firstNullCount: rules.filter((rule) => normalizeNullSortPosition(rule.nulls) === "first").length,
    lastNullCount: rules.filter((rule) => normalizeNullSortPosition(rule.nulls) === "last").length,
    active: rules.length > 0,
  };
}

export function compareNumbers(left: number, right: number, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}

export function compareStrings(left: string, right: string, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}

export function compareBooleans(left: boolean, right: boolean, trueFirst = false): number {
  if (left === right) {
    return 0;
  }

  return left ? (trueFirst ? -1 : 1) : (trueFirst ? 1 : -1);
}

export function firstNonZeroCompare(...results: readonly number[]): number {
  return results.find((result) => result !== 0) ?? 0;
}

export function getNullCompareResult(
  left: unknown,
  right: unknown,
  direction: SortDirection = "asc",
  nulls: NullSortPosition = "auto"
): number | null {
  const leftIsNull = left === null || left === undefined;
  const rightIsNull = right === null || right === undefined;

  if (!leftIsNull && !rightIsNull) {
    return null;
  }

  if (leftIsNull && rightIsNull) {
    return 0;
  }

  if (nulls === "first") {
    return leftIsNull ? -1 : 1;
  }

  if (nulls === "last") {
    return leftIsNull ? 1 : -1;
  }

  return (leftIsNull ? 1 : -1) * getSortDirectionFactor(direction);
}

export function compareValues(
  left: ComparableValue,
  right: ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): number {
  const options = typeof directionOrOptions === "string" ? { direction: directionOrOptions } : directionOrOptions;
  const direction = normalizeSortDirection(options.direction);
  const factor = getSortDirectionFactor(direction);
  const leftValue = normalizeComparableValue(left);
  const rightValue = normalizeComparableValue(right);

  if (leftValue === rightValue) {
    return 0;
  }

  const nullResult = getNullCompareResult(leftValue, rightValue, direction, options.nulls ?? "auto");
  if (nullResult !== null) {
    return nullResult;
  }

  if (leftValue === null || rightValue === null) {
    return 0;
  }

  if (typeof leftValue === "string" || typeof rightValue === "string") {
    return collator.compare(String(leftValue), String(rightValue)) * factor;
  }

  if (leftValue < rightValue) {
    return -1 * factor;
  }

  if (leftValue > rightValue) {
    return 1 * factor;
  }

  return 0;
}

export function createComparator<T>(
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): (left: T, right: T) => number {
  return (left, right) => compareValues(getValue(left), getValue(right), directionOrOptions);
}

export function compareBy<T>(
  left: T,
  right: T,
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): number {
  return compareValues(getValue(left), getValue(right), directionOrOptions);
}

export function createMultiComparator<T>(rules: readonly SortRule<T>[]): (left: T, right: T) => number {
  return (left, right) => {
    for (const rule of rules) {
      const result = compareValues(rule.getValue(left), rule.getValue(right), {
        direction: rule.direction ?? "asc",
        nulls: rule.nulls ?? "auto",
      });

      if (result !== 0) {
        return result;
      }
    }

    return 0;
  };
}

export function sortByValue<T>(
  items: readonly T[],
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): T[] {
  return [...items].sort(createComparator(getValue, directionOrOptions));
}

export function stableSortByValue<T>(
  items: readonly T[],
  getValue: (item: T) => ComparableValue,
  directionOrOptions: SortDirection | CompareValueOptions = "asc"
): T[] {
  const comparator = createComparator(getValue, directionOrOptions);
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => comparator(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

export function sortByMany<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[] {
  return rules.length === 0 ? [...items] : [...items].sort(createMultiComparator(rules));
}

export function stableSortByMany<T>(items: readonly T[], rules: readonly SortRule<T>[]): T[] {
  const comparator = createMultiComparator(rules);
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => comparator(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

export function naturalCompare(left: string, right: string, direction: SortDirection = "asc"): number {
  return compareValues(left, right, direction);
}
